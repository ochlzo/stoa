import type { PageSide } from '#lib/catalog/reading.ts';

export type TurnDirection = -1 | 1;

export interface LeafTurn {
	direction: TurnDirection;
	progress: number;
	velocity: number;
	target: 0 | 1 | null;
}

export interface LeafCurlParams {
	readonly u: number;
	readonly width: number;
	readonly progress: number;
	readonly direction: TurnDirection;
	readonly leftThickness: number;
	readonly rightThickness: number;
	readonly gutterDepth: number;
	readonly arch: number;
	readonly hingeAngle: number;
}

export const LEAF_CURL_CONFIG = {
	maxBendRadians: 1.8,
	stackClearanceMeters: 0.00012,
	gutterRampFraction: 0.55,
	springRate: 15,
	releaseVelocityWeight: 0.15,
	releaseCommitThreshold: 0.45,
	settleProgressEpsilon: 0.001,
	settleVelocityEpsilon: 0.03
} as const;

export function createLeafTurn(direction: TurnDirection, drag = false): LeafTurn {
	return { direction, progress: 0, velocity: 0, target: drag ? null : 1 };
}

export function setLeafTurnProgress(turn: LeafTurn, progress: number): void {
	turn.progress = Math.max(0, Math.min(1, progress));
}

export function releaseLeafTurn(turn: LeafTurn, velocity: number, cancelled: boolean): void {
	turn.velocity = cancelled ? 0 : velocity;
	turn.target = cancelled ? 0 : releaseTarget(turn.progress, velocity);
}

export function commitLeafTurn(turn: LeafTurn): void {
	turn.target = 1;
}

export function pageStackHeight(distance: number, thickness: number, gutterDepth: number, arch: number): number {
	const t = Math.min(1, distance / LEAF_CURL_CONFIG.gutterRampFraction);
	return (thickness - gutterDepth) * t * (2 - t) + arch * 4 * distance * (1 - distance) ** 3;
}

/** Integrate a tangent angle that varies linearly along the Leaf (a circular arc). */
export function curlLeafVertex(params: LeafCurlParams): { x: number; z: number } {
	const {
		u,
		width,
		progress,
		direction,
		leftThickness,
		rightThickness,
		gutterDepth,
		arch,
		hingeAngle
	} = params;
	const bend = LEAF_CURL_CONFIG.maxBendRadians * Math.sin(Math.PI * progress);
	const middleAngle = Math.PI * progress + ((u - 1) * bend) / 2;
	const halfArc = (u * bend) / 2;
	const chord = width * u * (halfArc < 1e-6 ? 1 : Math.sin(halfArc) / halfArc);
	const flatX = direction * chord * Math.cos(middleAngle);
	const lift = chord * Math.sin(middleAngle);
	const side = flatX < 0 ? -1 : 1;
	const thickness = side < 0 ? leftThickness : rightThickness;
	const top =
		pageStackHeight(Math.abs(flatX) / width, thickness, gutterDepth, arch) +
		LEAF_CURL_CONFIG.stackClearanceMeters;
	return {
		x: flatX * Math.cos(hingeAngle) - side * top * Math.sin(hingeAngle),
		z: Math.abs(flatX) * Math.sin(hingeAngle) + top * Math.cos(hingeAngle) + lift
	};
}

export function swipeNavigation(side: PageSide, direction: TurnDirection): 'pan' | 'turn' {
	return (side === 'left') === (direction === 1) ? 'pan' : 'turn';
}

export function releaseTarget(progress: number, velocity: number): 0 | 1 {
	const clampedVelocity = Math.max(-3, Math.min(3, velocity));
	return progress + clampedVelocity * LEAF_CURL_CONFIG.releaseVelocityWeight >=
		LEAF_CURL_CONFIG.releaseCommitThreshold
		? 1
		: 0;
}

/** Exact solution of a critically damped spring with a stationary target. */
export function stepLeafTurn(turn: LeafTurn, dt: number): boolean {
	if (turn.target === null) return false;
	const rate = LEAF_CURL_CONFIG.springRate;
	const offset = turn.progress - turn.target;
	const slope = turn.velocity + rate * offset;
	const decay = Math.exp(-rate * dt);
	turn.progress = Math.max(0, Math.min(1, turn.target + (offset + slope * dt) * decay));
	turn.velocity = (turn.velocity - rate * slope * dt) * decay;
	return (
		Math.abs(turn.progress - turn.target) < LEAF_CURL_CONFIG.settleProgressEpsilon &&
		Math.abs(turn.velocity) < LEAF_CURL_CONFIG.settleVelocityEpsilon
	);
}
