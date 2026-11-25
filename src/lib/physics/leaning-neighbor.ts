import { getBookcaseStructure } from '#lib/catalog/bookcase.ts';
import type { PlacedVolume } from '#lib/catalog/types.ts';
import { clampDelta } from '#lib/physics/shelf-camera.ts';

export interface LeaningNeighborConfig {
	/** Effective gravitational angular acceleration factor g / L_eff (rad/s^2). */
	readonly gravityScale: number;
	/** Subtle bounce restitution (0..1) when catching against the next upright Volume. */
	readonly catchRestitution: number;
	/** Minimum impact angular speed (rad/s) required to produce a subtle catch bounce. */
	readonly minBounceSpeed: number;
	/** Spring stiffness (1/s^2) when righting the leaning Volume back to its resting lean. */
	readonly rightingStiffness: number;
	/** Velocity damping (1/s) when righting the leaning Volume back to its resting lean. */
	readonly rightingDamping: number;
	/** Angle threshold (rad) below which motion snaps cleanly to its target angle. */
	readonly angleEpsilon: number;
	/** Angular speed threshold (rad/s) below which motion snaps cleanly to rest. */
	readonly velocityEpsilon: number;
	/** Maximum physics step duration in seconds. */
	readonly maxDelta: number;
}

export const LEANING_NEIGHBOR_CONFIG: LeaningNeighborConfig = {
	gravityScale: 24,
	catchRestitution: 0.14,
	minBounceSpeed: 0.25,
	rightingStiffness: 180,
	rightingDamping: 24,
	angleEpsilon: 0.0004,
	velocityEpsilon: 0.004,
	maxDelta: 0.05
};

export interface LeaningNeighborSupport {
	/** ID of the leaning Volume that tips when its support is pulled out. */
	readonly volumeId: string;
	/** ID of the supporting Volume whose removal releases this leaning Volume. */
	readonly supportVolumeId: string;
	/** ID of the next upright Volume that catches it, or null if caught by side panel / Shelf. */
	readonly catchVolumeId: string | null;
	/** Direction of lean: +1 tips leftward (-X), -1 tips rightward (+X). */
	readonly sign: 1 | -1;
	/** X coordinate of the planted bottom corner resting on the Shelf surface. */
	readonly footX: number;
	/** Y coordinate of the Shelf top surface. */
	readonly surfaceY: number;
	/** Exact resting rotationZ (radians) when the supporting Volume is in place. */
	readonly restingAngle: number;
	/** Exact catch rotationZ (radians) when the supporting Volume is removed. */
	readonly catchAngle: number;
}

export interface LeaningNeighborState {
	/** Current rotationZ angle (radians). */
	angle: number;
	/** Current angular velocity (rad/s). */
	angularVelocity: number;
	/** True when settled cleanly at the catch angle. */
	atCatch: boolean;
}

export interface LeaningNeighborTransform {
	/** World-space geometric center [x, y, z] for Volume's motionGroupRef. */
	readonly center: readonly [number, number, number];
	/** World-space bottom-front spine pivot [x, y, z] for invariant verification. */
	readonly pivot: readonly [number, number, number];
	/** Current rotationZ (radians). */
	readonly rotationZ: number;
}

const SUPPORT_CONTACT_EPS = 0.006;

/**
 * Computes the planted foot corner X and Shelf surfaceY for a leaning Volume.
 *
 * When leaning leftward (rotationZ > 0, sign = +1), the bottom-left corner
 * (-thickness/2, 0) stays planted on the Shelf surface as the book tips.
 * When leaning rightward (rotationZ < 0, sign = -1), the bottom-right corner
 * (+thickness/2, 0) stays planted on the Shelf surface.
 */
export function computeLeaningFoot(placed: PlacedVolume): {
	readonly sign: 1 | -1;
	readonly footX: number;
	readonly surfaceY: number;
} {
	const sign: 1 | -1 = placed.rotationZ >= 0 ? 1 : -1;
	const absAngle = Math.abs(placed.rotationZ);
	const halfT = placed.volume.dimensions.thickness / 2;
	const footX = placed.position[0] - sign * halfT * Math.cos(absAngle);
	const surfaceY = placed.position[1] - halfT * Math.sin(absAngle);
	return { sign, footX, surfaceY };
}

/**
 * Computes the exact world-space pivot and geometric center for a leaning Volume
 * rotated to `angle` around its planted Shelf foot corner.
 */
export function evaluateLeaningTransform(
	placed: PlacedVolume,
	footX: number,
	surfaceY: number,
	sign: 1 | -1,
	angle: number
): LeaningNeighborTransform {
	const { height, thickness, depth } = placed.volume.dimensions;
	const absAngle = Math.abs(angle);
	const halfT = thickness / 2;
	const halfH = height / 2;
	const halfD = depth / 2;

	const pivotX = footX + sign * halfT * Math.cos(absAngle);
	const pivotY = surfaceY + halfT * Math.sin(absAngle);
	const pivotZ = placed.position[2];

	const centerX = pivotX - halfH * Math.sin(angle);
	const centerY = pivotY + halfH * Math.cos(angle);
	const centerZ = pivotZ - halfD;

	return {
		center: [centerX, centerY, centerZ],
		pivot: [pivotX, pivotY, pivotZ],
		rotationZ: angle
	};
}

/**
 * Solves for the exact catch angle (radians, positive magnitude) when a leaning cover face
 * of length `leaningHeight` tips from `footX` toward a vertical obstacle at `gap` distance
 * with height `obstacleHeight`. Returns null if the tipping Volume passes cleanly past/over
 * the obstacle without hitting it.
 */
function solveCatchAngleAgainstObstacle(
	leaningHeight: number,
	gap: number,
	obstacleHeight: number
): number | null {
	if (gap <= 0) return 0;
	if (gap >= leaningHeight) return null;

	// Case A: Leaning Volume's top corner touches the obstacle face at y = sqrt(H^2 - gap^2).
	const topContactHeight = Math.sqrt(leaningHeight * leaningHeight - gap * gap);
	if (topContactHeight <= obstacleHeight) {
		return Math.asin(gap / leaningHeight);
	}

	// Case B: Leaning cover face catches on the obstacle's top corner (gap, obstacleHeight).
	const reach = Math.hypot(gap, obstacleHeight);
	if (reach <= leaningHeight) {
		return Math.atan2(gap, obstacleHeight);
	}

	return null;
}

/**
 * Analyzes all placed Volumes on every Shelf and returns a lookup mapping each
 * leaning Volume's ID to its `LeaningNeighborSupport` (identifying which supporting
 * Volume holds it up, and the exact catch angle against the next upright Volume,
 * side panel, or Shelf surface if that support is pulled out).
 */
export function buildLeaningNeighborMap(
	placedVolumes: readonly PlacedVolume[]
): ReadonlyMap<string, LeaningNeighborSupport> {
	const bookcase = getBookcaseStructure();
	const result = new Map<string, LeaningNeighborSupport>();

	for (const leaning of placedVolumes) {
		if (Math.abs(leaning.rotationZ) < 1e-4) continue;

		const shelf = bookcase.shelves[leaning.shelfIndex];
		if (!shelf) continue;

		const { sign, footX, surfaceY } = computeLeaningFoot(leaning);
		const leaningHeight = leaning.volume.dimensions.height;
		const absResting = Math.abs(leaning.rotationZ);

		// Upright Volumes on the same Shelf located in the direction of the lean.
		const candidates = placedVolumes
			.filter((other) => {
				if (other.volume.id === leaning.volume.id) return false;
				if (other.shelfIndex !== leaning.shelfIndex) return false;
				if (Math.abs(other.rotationZ) > 1e-4) return false;
				const faceX = other.position[0] + sign * (other.volume.dimensions.thickness / 2);
				return sign * (footX - faceX) > 0;
			})
			.sort((a, b) => {
				const faceA = a.position[0] + sign * (a.volume.dimensions.thickness / 2);
				const faceB = b.position[0] + sign * (b.volume.dimensions.thickness / 2);
				return sign * (footX - faceA) - sign * (footX - faceB);
			});

		if (candidates.length === 0) continue;

		// Verify the closest upright Volume is actually the resting support.
		const support = candidates[0];
		const supportFaceX = support.position[0] + sign * (support.volume.dimensions.thickness / 2);
		const supportGap = sign * (footX - supportFaceX);
		const expectedAngle = solveCatchAngleAgainstObstacle(
			leaningHeight,
			supportGap,
			support.volume.dimensions.height
		);
		if (expectedAngle === null || Math.abs(expectedAngle - absResting) > SUPPORT_CONTACT_EPS) {
			continue;
		}

		// Find the smallest catch angle among all remaining upright Volumes behind the support.
		let bestCatchAbs = Math.PI / 2;
		let catchVolumeId: string | null = null;

		for (let i = 1; i < candidates.length; i++) {
			const next = candidates[i];
			const nextFaceX = next.position[0] + sign * (next.volume.dimensions.thickness / 2);
			const nextGap = sign * (footX - nextFaceX);
			const catchAbs = solveCatchAngleAgainstObstacle(
				leaningHeight,
				nextGap,
				next.volume.dimensions.height
			);
			if (catchAbs !== null && catchAbs < bestCatchAbs) {
				bestCatchAbs = catchAbs;
				catchVolumeId = next.volume.id;
			}
		}

		// Also check the Bookcase inner side panel in the lean direction.
		const wallX = sign === 1 ? bookcase.bounds.innerMinX : bookcase.bounds.innerMaxX;
		const wallGap = sign * (footX - wallX);
		const wallCatchAbs = solveCatchAngleAgainstObstacle(
			leaningHeight,
			wallGap,
			shelf.clearance
		);
		if (wallCatchAbs !== null && wallCatchAbs < bestCatchAbs) {
			bestCatchAbs = wallCatchAbs;
			catchVolumeId = null;
		}

		result.set(leaning.volume.id, {
			volumeId: leaning.volume.id,
			supportVolumeId: support.volume.id,
			catchVolumeId,
			sign,
			footX,
			surfaceY,
			restingAngle: leaning.rotationZ,
			catchAngle: sign * bestCatchAbs
		});
	}

	return result;
}

/**
 * Creates an at-rest angular physics state for a leaning Volume.
 */
export function createLeaningNeighborState(restingAngle: number): LeaningNeighborState {
	return {
		angle: restingAngle,
		angularVelocity: 0,
		atCatch: false
	};
}

/**
 * Advances a leaning Volume's domino-catch topple or righting motion by one frame.
 * Returns true if the angle changed during this step.
 */
export function stepLeaningNeighbor(
	state: LeaningNeighborState,
	support: LeaningNeighborSupport,
	isSupportRemoved: boolean,
	rawDelta: number,
	config: LeaningNeighborConfig = LEANING_NEIGHBOR_CONFIG
): boolean {
	const dt = clampDelta(rawDelta, config.maxDelta);
	if (dt === 0) return false;

	const prevAngle = state.angle;
	const subSteps = Math.max(1, Math.ceil(dt / (1 / 120)));
	const stepDt = dt / subSteps;

	if (isSupportRemoved) {
		if (state.atCatch && Math.abs(state.angle - support.catchAngle) <= config.angleEpsilon) {
			state.angle = support.catchAngle;
			state.angularVelocity = 0;
			return state.angle !== prevAngle;
		}

		for (let i = 0; i < subSteps; i++) {
			// Real inverted-pendulum gravity torque pulls the leaning book toward its catch target.
			const sinTheta = Math.sin(Math.max(0.08, Math.abs(state.angle)));
			const accel = support.sign * config.gravityScale * sinTheta;
			state.angularVelocity += accel * stepDt;
			state.angle += state.angularVelocity * stepDt;

			// Clamp against the catch contact plane with a subtle damped impact bounce.
			const pastCatch =
				support.sign === 1
					? state.angle >= support.catchAngle
					: state.angle <= support.catchAngle;
			if (pastCatch) {
				state.angle = support.catchAngle;
				const impactSpeed = Math.abs(state.angularVelocity);
				if (impactSpeed > config.minBounceSpeed) {
					state.angularVelocity = -state.angularVelocity * config.catchRestitution;
					state.atCatch = false;
				} else {
					state.angularVelocity = 0;
					state.atCatch = true;
					break;
				}
			}
		}

		return state.angle !== prevAngle;
	}

	// Support is returning / seated: smoothly right the leaning Volume back to restingAngle.
	state.atCatch = false;
	const remaining = Math.abs(support.restingAngle - state.angle);
	if (
		remaining <= config.angleEpsilon &&
		Math.abs(state.angularVelocity) <= config.velocityEpsilon
	) {
		state.angle = support.restingAngle;
		state.angularVelocity = 0;
		return state.angle !== prevAngle;
	}

	for (let i = 0; i < subSteps; i++) {
		const displacement = support.restingAngle - state.angle;
		const accel =
			config.rightingStiffness * displacement - config.rightingDamping * state.angularVelocity;
		state.angularVelocity += accel * stepDt;
		state.angle += state.angularVelocity * stepDt;

		// Never overshoot past the upright supporting Volume's cover face.
		const pastRest =
			support.sign === 1
				? state.angle < support.restingAngle
				: state.angle > support.restingAngle;
		if (pastRest) {
			state.angle = support.restingAngle;
			state.angularVelocity = 0;
			break;
		}
	}

	if (
		Math.abs(support.restingAngle - state.angle) <= config.angleEpsilon &&
		Math.abs(state.angularVelocity) <= config.velocityEpsilon
	) {
		state.angle = support.restingAngle;
		state.angularVelocity = 0;
	}

	return state.angle !== prevAngle;
}
