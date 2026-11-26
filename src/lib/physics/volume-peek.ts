import { clampDelta } from '#lib/physics/shelf-camera.ts';

export interface VolumePeekConfig {
	/** Forward +Z slide distance in meters when a Volume is peeked. */
	readonly peekDistance: number;
	/** Spring stiffness (1/s^2) pulling the Volume toward its target offset. */
	readonly stiffness: number;
	/** Velocity damping (1/s) controlling overshoot and settle smoothness. */
	readonly damping: number;
	/** Maximum physics step duration in seconds (prevents tab-switch explosions). */
	readonly maxDelta: number;
	/** Position threshold (meters) below which the spring snaps cleanly to rest. */
	readonly positionEpsilon: number;
	/** Velocity threshold (m/s) below which the spring snaps cleanly to rest. */
	readonly velocityEpsilon: number;
}

export const VOLUME_PEEK_CONFIG: VolumePeekConfig = {
	peekDistance: 0.036,
	stiffness: 280,
	damping: 28,
	maxDelta: 0.05,
	positionEpsilon: 0.00015,
	velocityEpsilon: 0.001
};

export interface VolumePeekState {
	/** Current forward +Z offset along the Volume's local pivot (meters). */
	offset: number;
	/** Current forward +Z velocity (m/s). */
	velocity: number;
}

/**
 * Creates an at-rest Peek spring state for a Volume seated flush in its Shelf slot.
 */
export function createVolumePeekState(): VolumePeekState {
	return { offset: 0, velocity: 0 };
}

/**
 * Advances a Volume's damped-spring Peek motion by one frame using sub-stepped
 * semi-implicit Euler integration so large clamped frames remain unconditionally stable.
 *
 * Returns true if the offset changed during this step.
 */
export function stepVolumePeek(
	state: VolumePeekState,
	isPeeked: boolean,
	rawDelta: number,
	config: VolumePeekConfig = VOLUME_PEEK_CONFIG
): boolean {
	const dt = clampDelta(rawDelta, config.maxDelta);
	const target = isPeeked ? config.peekDistance : 0;

	if (dt === 0) {
		return false;
	}

	const prevOffset = state.offset;
	const remainingDistance = Math.abs(target - state.offset);
	if (remainingDistance <= config.positionEpsilon && Math.abs(state.velocity) <= config.velocityEpsilon) {
		state.offset = target;
		state.velocity = 0;
		return state.offset !== prevOffset;
	}

	// Sub-step into <= 1/120 s slices to keep stiff springs rock-solid across 30-60 Hz frames.
	const subSteps = Math.max(1, Math.ceil(dt / (1 / 120)));
	const stepDt = dt / subSteps;

	for (let i = 0; i < subSteps; i++) {
		const displacement = target - state.offset;
		const acceleration = config.stiffness * displacement - config.damping * state.velocity;
		state.velocity += acceleration * stepDt;
		state.offset += state.velocity * stepDt;
	}

	if (
		Math.abs(target - state.offset) <= config.positionEpsilon &&
		Math.abs(state.velocity) <= config.velocityEpsilon
	) {
		state.offset = target;
		state.velocity = 0;
	}

	return state.offset !== prevOffset;
}
