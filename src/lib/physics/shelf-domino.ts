import { getBookcaseStructure } from '#lib/catalog/bookcase.ts';
import { getShelfProps } from '#lib/catalog/props.ts';
import type { PlacedVolume } from '#lib/catalog/types.ts';
import { computeVolumeShelfCenter } from '#lib/physics/inspect-volume.ts';
import { clampDelta } from '#lib/physics/shelf-camera.ts';

export type ShelfDominoPhase = 'idle' | 'simulating' | 'returning';

export interface ShelfDominoConfig {
	/** Gravitational acceleration (m/s^2). */
	readonly gravity: number;
	/** Effective paper+board density (kg/m^3) used to compute each Volume's real mass. */
	readonly volumeDensity: number;
	/** Friction coefficient between a Volume's bottom edge and the wooden Shelf surface. */
	readonly floorFriction: number;
	/** Friction coefficient between adjacent Volume covers. */
	readonly bookFriction: number;
	/** Impact restitution (0..1) for book-to-book and book-to-wall contacts. */
	readonly bookRestitution: number;
	/** Impact restitution (0..1) for Shelf floor contacts. */
	readonly floorRestitution: number;
	/** Multiplier above the exact tipping-energy threshold for upright release nudges. */
	readonly uprightNudgeFactor: number;
	/** Maximum horizontal gap (m) from a removed Volume to count as an adjacent neighbor. */
	readonly adjacentGapMax: number;
	/** Velocity solver iterations per 120 Hz sub-step. */
	readonly velocityIterations: number;
	/** Positional penetration correction factor (0..1). */
	readonly positionPercent: number;
	/** Allowed penetration slop (m) before positional correction engages. */
	readonly positionSlop: number;
	/** Per-substep linear velocity damping (0..1). */
	readonly linearDamping: number;
	/** Per-substep angular velocity damping (0..1). */
	readonly angularDamping: number;
	/** Speed threshold below which bodies settle cleanly to rest. */
	readonly sleepLinearSpeed: number;
	readonly sleepAngularSpeed: number;
	/** Duration (seconds) to smoothly right displaced Volumes when the removed book returns. */
	readonly returnDuration: number;
	/** Maximum physics step duration in seconds. */
	readonly maxDelta: number;
}

export const SHELF_DOMINO_CONFIG: ShelfDominoConfig = {
	gravity: 9.81,
	volumeDensity: 750,
	floorFriction: 1.25,
	bookFriction: 0.3,
	bookRestitution: 0.08,
	floorRestitution: 0.04,
	uprightNudgeFactor: 1.28,
	adjacentGapMax: 0.04,
	velocityIterations: 12,
	positionPercent: 0.32,
	positionSlop: 0.00035,
	linearDamping: 0.99,
	angularDamping: 0.984,
	sleepLinearSpeed: 0.008,
	sleepAngularSpeed: 0.035,
	returnDuration: 0.44,
	maxDelta: 0.05
};

export interface ShelfDominoPose {
	readonly centerX: number;
	readonly centerY: number;
	readonly centerZ: number;
	readonly angle: number;
}

interface RigidBox2D {
	readonly id: string;
	readonly isStatic: boolean;
	readonly hx: number;
	readonly hy: number;
	readonly mass: number;
	readonly invMass: number;
	readonly invInertia: number;
	readonly restX: number;
	readonly restY: number;
	readonly restZ: number;
	readonly restAngle: number;
	x: number;
	y: number;
	angle: number;
	vx: number;
	vy: number;
	omega: number;
	// Snapshot captured at the start of the smooth return transition
	returnStartX: number;
	returnStartY: number;
	returnStartAngle: number;
}

interface Contact2D {
	readonly a: RigidBox2D;
	readonly b: RigidBox2D | null; // null = static shelf boundary plane
	readonly nx: number; // unit normal from A toward B (or into A for boundary)
	readonly ny: number;
	readonly px: number; // world contact point
	readonly py: number;
	readonly penetration: number;
	readonly friction: number;
	readonly restitution: number;
	normalImpulse: number;
	tangentImpulse: number;
}

interface Vec2 {
	readonly x: number;
	readonly y: number;
}

export interface ShelfDominoSimulation {
	phase: ShelfDominoPhase;
	activeShelfIndex: number | null;
	removedVolumeId: string | null;
	returnProgress: number;
	settledFrames: number;
	isSettled: boolean;
	readonly allPlaced: readonly PlacedVolume[];
	bodies: RigidBox2D[];
	staticObstacles: RigidBox2D[];
	readonly poses: Map<string, ShelfDominoPose>;
	/** Set of IDs whose poses changed or need a final resting sync. */
	dirty: boolean;
}

function easeOutCubic(t: number): number {
	const c = Math.max(0, Math.min(1, t));
	return 1 - Math.pow(1 - c, 3);
}

/**
 * Computes the 4 world-space corners of a 2D oriented rectangle in CCW order:
 * 0: bottom-left (-hx, -hy), 1: bottom-right (+hx, -hy),
 * 2: top-right (+hx, +hy), 3: top-left (-hx, +hy).
 */
export function getBoxCorners(
	x: number,
	y: number,
	angle: number,
	hx: number,
	hy: number
): readonly [Vec2, Vec2, Vec2, Vec2] {
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	const ux = c * hx;
	const uy = s * hx;
	const vx = -s * hy;
	const vy = c * hy;
	return [
		{ x: x - ux - vx, y: y - uy - vy },
		{ x: x + ux - vx, y: y + uy - vy },
		{ x: x + ux + vx, y: y + uy + vy },
		{ x: x - ux + vx, y: y - uy + vy }
	];
}

function clipSegmentToLine(
	v0: Vec2,
	v1: Vec2,
	nx: number,
	ny: number,
	offset: number
): Vec2[] {
	const out: Vec2[] = [];
	const d0 = nx * v0.x + ny * v0.y - offset;
	const d1 = nx * v1.x + ny * v1.y - offset;
	if (d0 <= 0) out.push(v0);
	if (d1 <= 0) out.push(v1);
	if (d0 * d1 < 0) {
		const t = d0 / (d0 - d1);
		out.push({
			x: v0.x + t * (v1.x - v0.x),
			y: v0.y + t * (v1.y - v0.y)
		});
	}
	return out;
}

/**
 * Exact 2D SAT + 2-point face-clipping contact generator between two oriented rectangles.
 * Returns 0, 1, or 2 contacts with normal pointing from A toward B.
 */
function collideBoxes(
	a: RigidBox2D,
	b: RigidBox2D,
	friction: number,
	restitution: number,
	out: Contact2D[]
): void {
	// Quick bounding-circle broadphase
	const radA = Math.hypot(a.hx, a.hy);
	const radB = Math.hypot(b.hx, b.hy);
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	if (dx * dx + dy * dy > (radA + radB) * (radA + radB)) {
		return;
	}

	const ca = Math.cos(a.angle);
	const sa = Math.sin(a.angle);
	const cb = Math.cos(b.angle);
	const sb = Math.sin(b.angle);

	// 4 candidate separating axes: A's X, A's Y, B's X, B's Y
	const axes: readonly [number, number, boolean][] = [
		[ca, sa, true],
		[-sa, ca, true],
		[cb, sb, false],
		[-sb, cb, false]
	];

	let minPen = Infinity;
	let bestNx = 0;
	let bestNy = 0;
	let refIsA = true;

	for (let i = 0; i < 4; i++) {
		const [ax, ay, isA] = axes[i];
		const projA = a.hx * Math.abs(ca * ax + sa * ay) + a.hy * Math.abs(-sa * ax + ca * ay);
		const projB = b.hx * Math.abs(cb * ax + sb * ay) + b.hy * Math.abs(-sb * ax + cb * ay);
		const dist = dx * ax + dy * ay;
		const pen = projA + projB - Math.abs(dist);
		if (pen <= 0) {
			return;
		}
		// Slight bias toward A's axes for stability
		if (pen < minPen - 1e-6) {
			minPen = pen;
			const sign = dist < 0 ? -1 : 1;
			bestNx = ax * sign;
			bestNy = ay * sign;
			refIsA = isA;
		}
	}

	// Reference box defines the face normal; incident box provides the clipped edge.
	const ref = refIsA ? a : b;
	const inc = refIsA ? b : a;
	// Normal pointing outward from reference face toward incident box
	const rnx = refIsA ? bestNx : -bestNx;
	const rny = refIsA ? bestNy : -bestNy;

	const refCorners = getBoxCorners(ref.x, ref.y, ref.angle, ref.hx, ref.hy);
	const incCorners = getBoxCorners(inc.x, inc.y, inc.angle, inc.hx, inc.hy);

	// Find reference face (edge whose outward normal best aligns with (rnx, rny))
	let refFaceIdx = 0;
	let bestRefDot = -Infinity;
	for (let i = 0; i < 4; i++) {
		const v0 = refCorners[i];
		const v1 = refCorners[(i + 1) & 3];
		const ex = v1.x - v0.x;
		const ey = v1.y - v0.y;
		const len = Math.hypot(ex, ey);
		// Outward normal for CCW edge (ex, ey) is (ey, -ex) / len
		const dot = (ey * rnx - ex * rny) / len;
		if (dot > bestRefDot) {
			bestRefDot = dot;
			refFaceIdx = i;
		}
	}

	// Find incident face (edge whose outward normal is MOST anti-parallel to (rnx, rny))
	let incFaceIdx = 0;
	let minIncDot = Infinity;
	for (let i = 0; i < 4; i++) {
		const v0 = incCorners[i];
		const v1 = incCorners[(i + 1) & 3];
		const ex = v1.x - v0.x;
		const ey = v1.y - v0.y;
		const len = Math.hypot(ex, ey);
		const dot = (ey * rnx - ex * rny) / len;
		if (dot < minIncDot) {
			minIncDot = dot;
			incFaceIdx = i;
		}
	}

	const refV0 = refCorners[refFaceIdx];
	const refV1 = refCorners[(refFaceIdx + 1) & 3];
	const edgeX = refV1.x - refV0.x;
	const edgeY = refV1.y - refV0.y;
	const edgeLen = Math.hypot(edgeX, edgeY);
	const tx = edgeX / edgeLen;
	const ty = edgeY / edgeLen;

	const sideOffset0 = -(tx * refV0.x + ty * refV0.y);
	const sideOffset1 = tx * refV1.x + ty * refV1.y;
	const frontOffset = rnx * refV0.x + rny * refV0.y;

	let clipped: Vec2[] = [incCorners[incFaceIdx], incCorners[(incFaceIdx + 1) & 3]];
	clipped = clipSegmentToLine(clipped[0], clipped[1], -tx, -ty, sideOffset0);
	if (clipped.length < 2) return;
	clipped = clipSegmentToLine(clipped[0], clipped[1], tx, ty, sideOffset1);
	if (clipped.length < 2) return;

	for (const pt of clipped) {
		const sep = rnx * pt.x + rny * pt.y - frontOffset;
		if (sep <= 0) {
			out.push({
				a,
				b,
				nx: bestNx,
				ny: bestNy,
				px: pt.x,
				py: pt.y,
				penetration: -sep,
				friction,
				restitution,
				normalImpulse: 0,
				tangentImpulse: 0
			});
		}
	}
}

/**
 * Generates contacts between a dynamic Volume and the Shelf floor, ceiling, and Bookcase side panels.
 */
function collideBoundaries(
	body: RigidBox2D,
	surfaceY: number,
	ceilingY: number,
	minX: number,
	maxX: number,
	config: ShelfDominoConfig,
	out: Contact2D[]
): void {
	const corners = getBoxCorners(body.x, body.y, body.angle, body.hx, body.hy);
	for (const c of corners) {
		if (c.y < surfaceY) {
			out.push({
				a: body,
				b: null,
				nx: 0,
				ny: -1, // from A toward static floor (downward)
				px: c.x,
				py: surfaceY,
				penetration: surfaceY - c.y,
				friction: config.floorFriction,
				restitution: config.floorRestitution,
				normalImpulse: 0,
				tangentImpulse: 0
			});
		}
		if (c.y > ceilingY) {
			out.push({
				a: body,
				b: null,
				nx: 0,
				ny: 1,
				px: c.x,
				py: ceilingY,
				penetration: c.y - ceilingY,
				friction: config.bookFriction,
				restitution: config.floorRestitution,
				normalImpulse: 0,
				tangentImpulse: 0
			});
		}
		if (c.x < minX) {
			out.push({
				a: body,
				b: null,
				nx: -1,
				ny: 0,
				px: minX,
				py: c.y,
				penetration: minX - c.x,
				friction: config.bookFriction,
				restitution: config.bookRestitution,
				normalImpulse: 0,
				tangentImpulse: 0
			});
		}
		if (c.x > maxX) {
			out.push({
				a: body,
				b: null,
				nx: 1,
				ny: 0,
				px: maxX,
				py: c.y,
				penetration: c.x - maxX,
				friction: config.bookFriction,
				restitution: config.bookRestitution,
				normalImpulse: 0,
				tangentImpulse: 0
			});
		}
	}
}

function makeDynamicBody(
	placed: PlacedVolume,
	config: ShelfDominoConfig
): RigidBox2D {
	const { height, thickness, depth } = placed.volume.dimensions;
	const center = computeVolumeShelfCenter(placed, 0);
	const mass = Math.max(0.05, height * thickness * depth * config.volumeDensity);
	const inertia = (mass * (thickness * thickness + height * height)) / 12;
	return {
		id: placed.volume.id,
		isStatic: false,
		hx: thickness / 2,
		hy: height / 2,
		mass,
		invMass: 1 / mass,
		invInertia: 1 / inertia,
		restX: center[0],
		restY: center[1],
		restZ: center[2],
		restAngle: placed.rotationZ,
		x: center[0],
		y: center[1],
		angle: placed.rotationZ,
		vx: 0,
		vy: 0,
		omega: 0,
		returnStartX: center[0],
		returnStartY: center[1],
		returnStartAngle: placed.rotationZ
	};
}

function buildStaticBookendObstacles(shelfIndex: number): RigidBox2D[] {
	const obstacles: RigidBox2D[] = [];
	for (const prop of getShelfProps()) {
		if (prop.shelfIndex !== shelfIndex) continue;
		if (prop.kind !== 'bookend') continue;
		obstacles.push({
			id: prop.id,
			isStatic: true,
			hx: prop.width / 2,
			hy: prop.height / 2,
			mass: Infinity,
			invMass: 0,
			invInertia: 0,
			restX: prop.position[0],
			restY: prop.position[1] + prop.height / 2,
			restZ: prop.position[2],
			restAngle: 0,
			x: prop.position[0],
			y: prop.position[1] + prop.height / 2,
			angle: 0,
			vx: 0,
			vy: 0,
			omega: 0,
			returnStartX: prop.position[0],
			returnStartY: prop.position[1] + prop.height / 2,
			returnStartAngle: 0
		});
	}
	return obstacles;
}

/**
 * Creates a reusable ShelfDominoSimulation for all placed Volumes on the Bookcase.
 * Remains completely idle (zero per-frame work) until a Volume is pulled out.
 */
export function createShelfDominoSimulation(
	placedVolumes: readonly PlacedVolume[]
): ShelfDominoSimulation {
	return {
		phase: 'idle',
		activeShelfIndex: null,
		removedVolumeId: null,
		returnProgress: 0,
		settledFrames: 0,
		isSettled: false,
		allPlaced: placedVolumes,
		bodies: [],
		staticObstacles: [],
		poses: new Map(),
		dirty: false
	};
}

/**
 * Starts real 2D multi-body physics on the active Shelf when a Volume is pulled out.
 *
 * - Any leaning Volume whose support chain leads to the gap immediately tips under
 *   gravity, transferring momentum through intermediate upright Volumes in a true
 *   domino chain.
 * - If the gap is flanked by upright Volumes with no leaning Volume pressing on it,
 *   the heavier adjacent neighbor receives a subtle release nudge biased toward the
 *   gap so it tips naturally under gravity until caught by the opposite neighbor.
 */
export function startShelfDomino(
	sim: ShelfDominoSimulation,
	removedVolumeId: string,
	config: ShelfDominoConfig = SHELF_DOMINO_CONFIG
): void {
	const removed = sim.allPlaced.find((v) => v.volume.id === removedVolumeId);
	if (!removed) return;

	const shelfIndex = removed.shelfIndex;
	const shelfVolumes = sim.allPlaced.filter(
		(v) => v.shelfIndex === shelfIndex && v.volume.id !== removedVolumeId
	);

	sim.phase = 'simulating';
	sim.activeShelfIndex = shelfIndex;
	sim.removedVolumeId = removedVolumeId;
	sim.returnProgress = 0;
	sim.settledFrames = 0;
	sim.isSettled = false;
	sim.bodies = shelfVolumes.map((v) => makeDynamicBody(v, config));
	sim.staticObstacles = buildStaticBookendObstacles(shelfIndex);
	sim.poses.clear();

	// Determine whether any leaning Volume in the same contiguous cluster already presses
	// toward the removed Volume's gap.
	const removedCenter = computeVolumeShelfCenter(removed, 0);
	const removedHalfT = removed.volume.dimensions.thickness / 2;
	const removedMinX = removedCenter[0] - removedHalfT;
	const removedMaxX = removedCenter[0] + removedHalfT;

	const sorted = [...sim.bodies].sort((a, b) => a.x - b.x);
	let leftNeighbor: RigidBox2D | null = null;
	let rightNeighbor: RigidBox2D | null = null;

	for (const body of sorted) {
		const rightEdge = body.x + body.hx;
		const leftEdge = body.x - body.hx;
		if (rightEdge <= removedMinX + 0.008 && removedMinX - rightEdge <= config.adjacentGapMax) {
			leftNeighbor = body;
		}
		if (
			!rightNeighbor &&
			leftEdge >= removedMaxX - 0.008 &&
			leftEdge - removedMaxX <= config.adjacentGapMax
		) {
			rightNeighbor = body;
		}
	}

	// Check if a contiguous run from leftNeighbor (going left) has a right-leaning book
	// (angle < 0), OR from rightNeighbor (going right) has a left-leaning book (angle > 0).
	let leftPressing = false;
	if (leftNeighbor) {
		let cursor = leftNeighbor;
		const idx = sorted.indexOf(cursor);
		for (let i = idx; i >= 0; i--) {
			const b = sorted[i];
			if (i < idx && cursor.x - cursor.hx - (b.x + b.hx) > config.adjacentGapMax) break;
			if (b.angle < -0.02) {
				leftPressing = true;
				break;
			}
			cursor = b;
		}
	}
	let rightPressing = false;
	if (rightNeighbor) {
		let cursor = rightNeighbor;
		const idx = sorted.indexOf(cursor);
		for (let i = idx; i < sorted.length; i++) {
			const b = sorted[i];
			if (i > idx && b.x - b.hx - (cursor.x + cursor.hx) > config.adjacentGapMax) break;
			if (b.angle > 0.02) {
				rightPressing = true;
				break;
			}
			cursor = b;
		}
	}

	// Pick which adjacent neighbor receives the subtle pull-out release nudge to break
	// dead-vertical flat-base static equilibrium:
	// 1) If a leaning book is pressing from one side, nudge the upright neighbor on that side
	//    so the leaning chain's gravity drives a natural multi-book domino topple.
	// 2) Otherwise (all-upright row), nudge the heavier adjacent neighbor into the gap.
	let chosen: RigidBox2D | null = null;
	let tipSign: 1 | -1 = 1;

	if (rightPressing && rightNeighbor) {
		chosen = rightNeighbor;
		tipSign = 1; // tips leftward (-X) into the gap under the leaning chain's push
	} else if (leftPressing && leftNeighbor) {
		chosen = leftNeighbor;
		tipSign = -1; // tips rightward (+X) into the gap under the leaning chain's push
	} else if (leftNeighbor && rightNeighbor) {
		if (leftNeighbor.mass >= rightNeighbor.mass) {
			chosen = leftNeighbor;
			tipSign = -1;
		} else {
			chosen = rightNeighbor;
			tipSign = 1;
		}
	} else if (leftNeighbor) {
		chosen = leftNeighbor;
		tipSign = -1;
	} else if (rightNeighbor) {
		chosen = rightNeighbor;
		tipSign = 1;
	}

	// Only nudge if the chosen book is upright (leaning books already tip via gravity).
	if (chosen && Math.abs(chosen.angle) < 0.02) {
		const t = chosen.hx * 2;
		const h = chosen.hy * 2;
		const liftDeltaY = (Math.hypot(t, h) - h) / 2;
		const minTipOmega = Math.sqrt(
			(6 * config.gravity * liftDeltaY) / (t * t + h * h)
		);
		const nudgeOmega = tipSign * minTipOmega * config.uprightNudgeFactor;
		chosen.omega = nudgeOmega;
		// Match linear velocity to pure rotation around the planted bottom corner
		// so the book pivots cleanly without hopping off the Shelf.
		const rx = tipSign * chosen.hx;
		const ry = chosen.hy;
		chosen.vx = -nudgeOmega * ry;
		chosen.vy = nudgeOmega * rx;
	}

	syncPoses(sim);
}

/**
 * Transitions all displaced Volumes on the active Shelf smoothly back to their
 * exact resting Shelf poses as the inspected Volume returns to its slot.
 */
export function startShelfDominoReturn(sim: ShelfDominoSimulation): void {
	if (sim.phase !== 'simulating') return;
	sim.phase = 'returning';
	sim.returnProgress = 0;
	for (const body of sim.bodies) {
		body.returnStartX = body.x;
		body.returnStartY = body.y;
		body.returnStartAngle = body.angle;
		body.vx = 0;
		body.vy = 0;
		body.omega = 0;
	}
}

function syncPoses(sim: ShelfDominoSimulation): void {
	for (const body of sim.bodies) {
		sim.poses.set(body.id, {
			centerX: body.x,
			centerY: body.y,
			centerZ: body.restZ,
			angle: body.angle
		});
	}
	sim.dirty = true;
}

/**
 * Advances the active Shelf's 2D multi-body domino simulation (or smooth return)
 * by one frame using 120 Hz sub-steps.
 */
export function stepShelfDomino(
	sim: ShelfDominoSimulation,
	rawDelta: number,
	config: ShelfDominoConfig = SHELF_DOMINO_CONFIG
): boolean {
	const dt = clampDelta(rawDelta, config.maxDelta);
	if (dt === 0 || sim.phase === 'idle') return false;

	if (sim.phase === 'returning') {
		sim.returnProgress = Math.min(1, sim.returnProgress + dt / Math.max(0.05, config.returnDuration));
		const eased = easeOutCubic(sim.returnProgress);

		for (const body of sim.bodies) {
			body.x = body.returnStartX + (body.restX - body.returnStartX) * eased;
			body.y = body.returnStartY + (body.restY - body.returnStartY) * eased;
			body.angle = body.returnStartAngle + (body.restAngle - body.returnStartAngle) * eased;
		}
		syncPoses(sim);

		if (sim.returnProgress >= 1) {
			for (const body of sim.bodies) {
				body.x = body.restX;
				body.y = body.restY;
				body.angle = body.restAngle;
			}
			syncPoses(sim);
			sim.phase = 'idle';
			sim.activeShelfIndex = null;
			sim.removedVolumeId = null;
		}
		return true;
	}

	if (sim.phase === 'simulating' && sim.isSettled) {
		return false;
	}

	// Simulating phase
	const bookcase = getBookcaseStructure();
	const shelf = sim.activeShelfIndex !== null ? bookcase.shelves[sim.activeShelfIndex] : null;
	if (!shelf) return false;

	const surfaceY = shelf.surfaceY;
	const ceilingY = shelf.surfaceY + shelf.clearance;
	const minX = bookcase.bounds.innerMinX;
	const maxX = bookcase.bounds.innerMaxX;

	const subSteps = Math.max(1, Math.ceil(dt / (1 / 120)));
	const h = dt / subSteps;

	for (let step = 0; step < subSteps; step++) {
		// 1. Apply gravity
		for (const b of sim.bodies) {
			b.vy -= config.gravity * h;
		}

		// 2. Collect contacts (boundaries + book-book + book-static bookends)
		const contacts: Contact2D[] = [];
		for (let i = 0; i < sim.bodies.length; i++) {
			const a = sim.bodies[i];
			collideBoundaries(a, surfaceY, ceilingY, minX, maxX, config, contacts);
			for (let j = i + 1; j < sim.bodies.length; j++) {
				collideBoxes(a, sim.bodies[j], config.bookFriction, config.bookRestitution, contacts);
			}
			for (const obs of sim.staticObstacles) {
				collideBoxes(a, obs, config.bookFriction, config.bookRestitution, contacts);
			}
		}

		// 3. Sequential impulse velocity resolution
		for (let iter = 0; iter < config.velocityIterations; iter++) {
			for (const c of contacts) {
				const a = c.a;
				const b = c.b;
				const rax = c.px - a.x;
				const ray = c.py - a.y;
				const rbx = b ? c.px - b.x : 0;
				const rby = b ? c.py - b.y : 0;

				const vax = a.vx - a.omega * ray;
				const vay = a.vy + a.omega * rax;
				const vbx = b ? b.vx - b.omega * rby : 0;
				const vby = b ? b.vy + b.omega * rbx : 0;

				const rvx = vbx - vax;
				const rvy = vby - vay;
				const vn = rvx * c.nx + rvy * c.ny;

				const raCrossN = rax * c.ny - ray * c.nx;
				const rbCrossN = b ? rbx * c.ny - rby * c.nx : 0;
				const invMassSum =
					a.invMass +
					(b ? b.invMass : 0) +
					raCrossN * raCrossN * a.invInertia +
					(b ? rbCrossN * rbCrossN * b.invInertia : 0);

				if (invMassSum <= 0) continue;

				// Normal impulse (with subtle restitution only on meaningful closing speeds)
				const e = vn < -0.18 ? c.restitution : 0;
				const jnRaw = (-(1 + e) * vn) / invMassSum;
				const prevJn = c.normalImpulse;
				c.normalImpulse = Math.max(0, prevJn + jnRaw);
				const dJn = c.normalImpulse - prevJn;

				const impNx = dJn * c.nx;
				const impNy = dJn * c.ny;

				a.vx -= impNx * a.invMass;
				a.vy -= impNy * a.invMass;
				a.omega -= (rax * impNy - ray * impNx) * a.invInertia;
				if (b && !b.isStatic) {
					b.vx += impNx * b.invMass;
					b.vy += impNy * b.invMass;
					b.omega += (rbx * impNy - rby * impNx) * b.invInertia;
				}

				// Tangential friction impulse
				const tx = -c.ny;
				const ty = c.nx;
				const vax2 = a.vx - a.omega * ray;
				const vay2 = a.vy + a.omega * rax;
				const vbx2 = b ? b.vx - b.omega * rby : 0;
				const vby2 = b ? b.vy + b.omega * rbx : 0;
				const vt = (vbx2 - vax2) * tx + (vby2 - vay2) * ty;

				const raCrossT = rax * ty - ray * tx;
				const rbCrossT = b ? rbx * ty - rby * tx : 0;
				const invMassT =
					a.invMass +
					(b ? b.invMass : 0) +
					raCrossT * raCrossT * a.invInertia +
					(b ? rbCrossT * rbCrossT * b.invInertia : 0);

				if (invMassT <= 0) continue;

				const jtRaw = -vt / invMassT;
				// Stronger static friction grip on Shelf floor contacts when foot speed is low
				// prevents angled domino stacks from slowly skating outward.
				const isFloorContact = c.b === null && c.ny === -1;
				const effectiveFriction =
					isFloorContact && Math.abs(vt) < 0.05 ? c.friction * 1.45 : c.friction;
				const maxFriction = effectiveFriction * c.normalImpulse;
				const prevJt = c.tangentImpulse;
				c.tangentImpulse = Math.max(-maxFriction, Math.min(maxFriction, prevJt + jtRaw));
				const dJt = c.tangentImpulse - prevJt;

				const impTx = dJt * tx;
				const impTy = dJt * ty;

				a.vx -= impTx * a.invMass;
				a.vy -= impTy * a.invMass;
				a.omega -= (rax * impTy - ray * impTx) * a.invInertia;
				if (b && !b.isStatic) {
					b.vx += impTx * b.invMass;
					b.vy += impTy * b.invMass;
					b.omega += (rbx * impTy - rby * impTx) * b.invInertia;
				}
			}
		}

		// 4. Integrate positions & gentle damping
		for (const b of sim.bodies) {
			b.vx *= config.linearDamping;
			b.vy *= config.linearDamping;
			b.omega *= config.angularDamping;
			b.x += b.vx * h;
			b.y += b.vy * h;
			b.angle += b.omega * h;
		}

		// 5. Positional penetration correction (stronger on static floor/walls, gentler on
		// book-book contacts so angled stacks don't get shoved sideways past static friction)
		for (const c of contacts) {
			const percent = c.b === null ? 0.55 : config.positionPercent;
			const corrMag = Math.max(0, c.penetration - config.positionSlop) * percent;
			if (corrMag <= 0) continue;
			const a = c.a;
			const b = c.b;
			const totalInvMass = a.invMass + (b ? b.invMass : 0);
			if (totalInvMass <= 0) continue;
			const cx = (corrMag / totalInvMass) * c.nx;
			const cy = (corrMag / totalInvMass) * c.ny;
			a.x -= cx * a.invMass;
			a.y -= cy * a.invMass;
			if (b && !b.isStatic) {
				b.x += cx * b.invMass;
				b.y += cy * b.invMass;
			}
		}
	}

	// Snap micro-jitter velocities to zero and sleep the Shelf once the stack settles.
	let allQuiet = true;
	for (const b of sim.bodies) {
		const linSpeed = Math.hypot(b.vx, b.vy);
		const angSpeed = Math.abs(b.omega);
		if (linSpeed < config.sleepLinearSpeed && angSpeed < config.sleepAngularSpeed) {
			b.vx = 0;
			b.vy = 0;
			b.omega = 0;
		} else {
			allQuiet = false;
		}
	}

	if (allQuiet) {
		sim.settledFrames += 1;
		if (sim.settledFrames >= 8) {
			sim.isSettled = true;
		}
	} else {
		sim.settledFrames = 0;
	}

	syncPoses(sim);
	return true;
}

/**
 * Returns the live domino pose for a Volume ID, or null if not affected.
 */
export function getShelfDominoPose(
	sim: ShelfDominoSimulation,
	volumeId: string
): ShelfDominoPose | null {
	return sim.poses.get(volumeId) ?? null;
}
