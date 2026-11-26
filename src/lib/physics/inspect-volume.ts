import type { PlacedVolume, VolumeDimensions } from '#lib/catalog/types.ts';
import { clampDelta, type ViewportSize } from '#lib/physics/shelf-camera.ts';

export type InspectPhase = 'idle' | 'entering' | 'inspecting' | 'returning';

export interface InspectVolumeConfig {
	/** Total flight duration (seconds) for the staged pull-out / return choreography. */
	readonly flightDuration: number;
	/** Normalized progress (0..1) where Stage 1 (tilt forward + pull straight out) completes. */
	readonly extractEndProgress: number;
	/** Normalized progress (0..1) where the brief hand-grip pause ends and Stage 3 (glide/turn) begins. */
	readonly pauseEndProgress: number;
	/** Normalized progress (0..1) at which the Volume has cleared its slot and releases neighbors. */
	readonly shelfClearProgress: number;
	/** Forward +Z clearance beyond the Volume's full depth when extracted from the Shelf (meters). */
	readonly extractExtraClearance: number;
	/** Forward finger-hook tilt angle (radians, positive pitches top edge toward the reader). */
	readonly hookTiltPitch: number;
	/** Subtle upward lift (meters) as the book unseats from the Shelf surface. */
	readonly hookLiftY: number;
	/** Canonical starting yaw (radians) showing the cover and spine in a three-quarter hero pose. */
	readonly defaultYaw: number;
	/** Canonical starting pitch (radians) gently tilting the top edge toward the reader. */
	readonly defaultPitch: number;
	/** Maximum absolute pitch angle (radians) — ±65° per design spec. */
	readonly maxPitch: number;
	/** Fraction of the limiting viewport axis occupied by the Volume's bounding sphere diameter. */
	readonly viewportFillRatio: number;
	/** Upward vertical offset (fraction of visible height) to balance above bottom floating controls. */
	readonly verticalBiasRatio: number;
	/** Minimum world Z for the inspected Volume center so it stays cleanly in front of the Bookcase. */
	readonly minInspectZ: number;
	/** Extra clearance (meters) behind the Volume's bounding sphere for the dimmed backdrop plane. */
	readonly backdropClearance: number;
	/** Target opacity (0..1) of the dimmed Bookcase backdrop plane in Inspect Mode. */
	readonly backdropMaxOpacity: number;
	/** Pointer travel distance (CSS px) before a press counts as an orbit drag rather than a click. */
	readonly dragThresholdPx: number;
	/** Radians of orbit rotation per CSS pixel of pointer drag. */
	readonly orbitSensitivity: number;
	/** Exponential angular velocity decay rate (1/s) after pointer release. */
	readonly inertiaDamping: number;
	/** Maximum angular velocity (rad/s) to prevent erratic flings. */
	readonly maxAngularSpeed: number;
	/** Smoothing factor (0..1) when sampling instantaneous drag angular velocity. */
	readonly dragVelocitySmoothing: number;
	/** Idle time (ms) after the last pointermove before release inertia decays away. */
	readonly dragReleaseGraceMs: number;
	/** Minimum angular speed (rad/s) below which residual inertia snaps cleanly to zero. */
	readonly stopSpeedThreshold: number;
	/** Maximum physics step duration in seconds. */
	readonly maxDelta: number;
}

export const INSPECT_VOLUME_CONFIG: InspectVolumeConfig = {
	flightDuration: 0.72,
	extractEndProgress: 0.34,
	pauseEndProgress: 0.44,
	shelfClearProgress: 0.3,
	extractExtraClearance: 0.045,
	hookTiltPitch: 0.22,
	hookLiftY: 0.01,
	defaultYaw: -1.12,
	defaultPitch: 0.12,
	maxPitch: (65 * Math.PI) / 180,
	viewportFillRatio: 0.66,
	verticalBiasRatio: 0.035,
	minInspectZ: 0.32,
	backdropClearance: 0.08,
	backdropMaxOpacity: 0.54,
	dragThresholdPx: 6,
	orbitSensitivity: 0.0085,
	inertiaDamping: 7.5,
	maxAngularSpeed: 10,
	dragVelocitySmoothing: 0.35,
	dragReleaseGraceMs: 80,
	stopSpeedThreshold: 0.002,
	maxDelta: 0.05
};

export interface InspectVolumeState {
	phase: InspectPhase;
	/** Normalized flight progress: 0 = seated in Shelf slot, 1 = centered Inspect pose. */
	progress: number;
	/** Current orbit yaw around Y (radians, unbounded 360°+). */
	yaw: number;
	/** Current orbit pitch around X (radians, clamped to ±maxPitch). */
	pitch: number;
	/** Current angular yaw velocity (rad/s). */
	yawVelocity: number;
	/** Current angular pitch velocity (rad/s). */
	pitchVelocity: number;
	/** Whether the user is actively dragging to orbit the Volume. */
	isDragging: boolean;
	/** True once the Volume has pulled clear of its Shelf slot (triggers neighbor dominoes). */
	hasClearedShelf: boolean;
	/** Peek +Z offset captured at the moment Inspect Mode began so the pull-out starts seamlessly. */
	startPeekOffset: number;
	/** Shortest-path starting yaw captured when returning to the Shelf slot. */
	returnStartYaw: number;
	/** Starting pitch captured when returning to the Shelf slot. */
	returnStartPitch: number;
}

export interface InspectFramingPose {
	/** Target world-space geometric center [x, y, z] for the inspected Volume. */
	readonly center: readonly [number, number, number];
	/** World Z of the dimmed Bookcase backdrop plane behind the inspected Volume. */
	readonly backdropZ: number;
	/** World width of the backdrop plane to cover the full camera frustum with margin. */
	readonly backdropWidth: number;
	/** World height of the backdrop plane to cover the full camera frustum with margin. */
	readonly backdropHeight: number;
}

export interface InspectTransform {
	/** World-space position of the Volume's geometric center [x, y, z]. */
	readonly position: readonly [number, number, number];
	/** Euler rotation [pitchX, yawY, rollZ] in 'XYZ' order (screen-horizontal pitch, spine-axis yaw). */
	readonly rotation: readonly [number, number, number];
	/** Current dimmed backdrop opacity (0..backdropMaxOpacity). */
	readonly backdropOpacity: number;
}

export interface InspectStepResult {
	/** True when flight progress or orbit angles changed this frame. */
	readonly changed: boolean;
	/** True on the frame the Volume clears its Shelf slot and releases leaning neighbors. */
	readonly clearedShelf: boolean;
	/** True on the frame the Volume settles back into its Shelf slot after returning. */
	readonly completedReturn: boolean;
	/** True on the frame the Volume finishes flying into its centered Inspect pose. */
	readonly enteredInspect: boolean;
}

export interface InspectOrbitGestureResult {
	readonly kind: 'none' | 'drag' | 'click';
}

export interface InspectOrbitGestures {
	start(pointerId: number, x: number, y: number, timeMs: number): void;
	move(pointerId: number, x: number, y: number, timeMs: number): boolean;
	end(pointerId: number, timeMs: number, cancelled?: boolean): InspectOrbitGestureResult;
	reset(): void;
}

/**
 * Wraps any angle in radians into (-π, π] so return flights take the shortest turn.
 */
export function normalizeAngle(angle: number): number {
	const twoPi = Math.PI * 2;
	let wrapped = ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
	if (wrapped <= -Math.PI) {
		wrapped += twoPi;
	}
	return wrapped;
}

/**
 * Clamps orbit pitch to the configured ±maxPitch range (±65°).
 */
export function clampPitch(
	pitch: number,
	config: InspectVolumeConfig = INSPECT_VOLUME_CONFIG
): number {
	return Math.max(-config.maxPitch, Math.min(config.maxPitch, pitch));
}

function easeOutCubic(t: number): number {
	const clamped = Math.max(0, Math.min(1, t));
	return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Smooth cubic-in-out ease for calm, tactile Volume glide.
 */
function easeInOutCubic(t: number): number {
	const clamped = Math.max(0, Math.min(1, t));
	return clamped < 0.5
		? 4 * clamped * clamped * clamped
		: 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/**
 * Computes the exact world-space geometric center of a Volume seated in its Shelf slot.
 *
 * Local Volume geometry has its pivot at (0, 0, 0) = bottom-front spine edge,
 * so its local geometric center is (0, height / 2, -depth / 2). Rotating that
 * offset by `placed.rotationZ` around Z yields the exact world center.
 */
export function computeVolumeShelfCenter(
	placed: PlacedVolume,
	peekOffset = 0
): readonly [number, number, number] {
	const halfHeight = placed.volume.dimensions.height / 2;
	const halfDepth = placed.volume.dimensions.depth / 2;
	const sinZ = Math.sin(placed.rotationZ);
	const cosZ = Math.cos(placed.rotationZ);
	return [
		placed.position[0] - halfHeight * sinZ,
		placed.position[1] + halfHeight * cosZ,
		placed.position[2] - halfDepth + peekOffset
	];
}

/**
 * Computes the canonical centered inspection pose in front of the active camera
 * along with the dimmed backdrop plane dimensions and Z placement.
 */
export function computeInspectPose(
	cameraPosition: readonly [number, number, number],
	fovDegrees: number,
	viewport: ViewportSize,
	dimensions: VolumeDimensions,
	config: InspectVolumeConfig = INSPECT_VOLUME_CONFIG
): InspectFramingPose {
	const aspect = Math.max(0.25, viewport.width / Math.max(1, viewport.height));
	const tanHalfV = Math.tan((fovDegrees * Math.PI) / 360);
	const tanHalfH = tanHalfV * aspect;
	const limitingTan = Math.min(tanHalfV, tanHalfH);

	const boundingRadius = Math.hypot(
		dimensions.thickness,
		dimensions.height,
		dimensions.depth
	) / 2;

	const desiredDistance = boundingRadius / Math.max(0.01, limitingTan * config.viewportFillRatio);
	const maxAllowedDistance = Math.max(0.24, cameraPosition[2] - config.minInspectZ);
	const minAllowedDistance = boundingRadius + 0.14;
	const distance = Math.max(minAllowedDistance, Math.min(desiredDistance, maxAllowedDistance));

	const visibleHeightAtInspect = 2 * distance * tanHalfV;
	const inspectZ = cameraPosition[2] - distance;
	const inspectY = cameraPosition[1] + visibleHeightAtInspect * config.verticalBiasRatio;

	// Place the dimmed backdrop safely behind the furthest possible rotated corner of the Volume
	// while remaining in front of the Bookcase front edge.
	const backdropZ = Math.max(0.12, inspectZ - boundingRadius - config.backdropClearance);
	const backdropDistance = Math.max(0.1, cameraPosition[2] - backdropZ);
	const backdropHeight = 2 * backdropDistance * tanHalfV * 1.35;
	const backdropWidth = backdropHeight * aspect;

	return {
		center: [cameraPosition[0], inspectY, inspectZ],
		backdropZ,
		backdropWidth,
		backdropHeight
	};
}

/**
 * Creates an idle InspectVolumeState seated at rest in its Shelf slot.
 */
export function createInspectVolumeState(
	config: InspectVolumeConfig = INSPECT_VOLUME_CONFIG
): InspectVolumeState {
	return {
		phase: 'idle',
		progress: 0,
		yaw: config.defaultYaw,
		pitch: config.defaultPitch,
		yawVelocity: 0,
		pitchVelocity: 0,
		isDragging: false,
		hasClearedShelf: false,
		startPeekOffset: 0,
		returnStartYaw: config.defaultYaw,
		returnStartPitch: config.defaultPitch
	};
}

/**
 * Begins the smooth pull-out flight from the Volume's Shelf slot into Inspect Mode.
 */
export function startInspectEnter(
	state: InspectVolumeState,
	currentPeekOffset = 0,
	config: InspectVolumeConfig = INSPECT_VOLUME_CONFIG
): void {
	state.phase = 'entering';
	state.progress = 0;
	state.yaw = config.defaultYaw;
	state.pitch = config.defaultPitch;
	state.yawVelocity = 0;
	state.pitchVelocity = 0;
	state.isDragging = false;
	state.hasClearedShelf = false;
	state.startPeekOffset = currentPeekOffset;
	state.returnStartYaw = config.defaultYaw;
	state.returnStartPitch = config.defaultPitch;
}

/**
 * Begins the smooth return flight from the current inspected orientation back to the Shelf slot.
 */
export function startInspectReturn(state: InspectVolumeState): void {
	if (state.phase === 'idle' || state.phase === 'returning') return;
	state.phase = 'returning';
	state.isDragging = false;
	state.hasClearedShelf = false;
	state.yawVelocity = 0;
	state.pitchVelocity = 0;
	state.startPeekOffset = 0;
	state.returnStartYaw = normalizeAngle(state.yaw);
	state.returnStartPitch = state.pitch;
}

/**
 * Advances the Inspect Mode flight transition and damped 3D orbit inertia by one frame.
 */
export function stepInspectVolume(
	state: InspectVolumeState,
	rawDelta: number,
	config: InspectVolumeConfig = INSPECT_VOLUME_CONFIG
): InspectStepResult {
	const dt = clampDelta(rawDelta, config.maxDelta);
	if (dt === 0 || state.phase === 'idle') {
		return { changed: false, clearedShelf: false, completedReturn: false, enteredInspect: false };
	}

	let changed = false;
	let clearedShelf = false;
	let completedReturn = false;
	let enteredInspect = false;

	if (state.phase === 'entering') {
		const prev = state.progress;
		state.progress = Math.min(1, state.progress + dt / Math.max(0.05, config.flightDuration));
		changed = changed || state.progress !== prev;
		if (!state.hasClearedShelf && state.progress >= config.shelfClearProgress) {
			state.hasClearedShelf = true;
			clearedShelf = true;
		}
		if (state.progress >= 1) {
			state.progress = 1;
			state.phase = 'inspecting';
			enteredInspect = true;
		}
	} else if (state.phase === 'returning') {
		const prev = state.progress;
		state.progress = Math.max(0, state.progress - dt / Math.max(0.05, config.flightDuration));
		changed = changed || state.progress !== prev;
		if (state.progress <= 0) {
			state.progress = 0;
			state.phase = 'idle';
			state.hasClearedShelf = false;
			state.yaw = config.defaultYaw;
			state.pitch = config.defaultPitch;
			state.yawVelocity = 0;
			state.pitchVelocity = 0;
			state.isDragging = false;
			completedReturn = true;
		}
	}

	// Apply damped angular velocity inertia whenever the Volume is inspectable and not actively dragged.
	if ((state.phase === 'inspecting' || state.phase === 'entering') && !state.isDragging) {
		const speed = Math.hypot(state.yawVelocity, state.pitchVelocity);
		if (speed > config.stopSpeedThreshold) {
			const prevYaw = state.yaw;
			const prevPitch = state.pitch;

			state.yaw += state.yawVelocity * dt;
			const nextPitch = clampPitch(state.pitch + state.pitchVelocity * dt, config);
			// Zero pitch velocity cleanly when hitting the ±65° stop.
			if (nextPitch === config.maxPitch || nextPitch === -config.maxPitch) {
				state.pitchVelocity = 0;
			}
			state.pitch = nextPitch;

			const decay = Math.exp(-config.inertiaDamping * dt);
			state.yawVelocity *= decay;
			state.pitchVelocity *= decay;

			if (Math.hypot(state.yawVelocity, state.pitchVelocity) <= config.stopSpeedThreshold) {
				state.yawVelocity = 0;
				state.pitchVelocity = 0;
			}

			changed = changed || state.yaw !== prevYaw || state.pitch !== prevPitch;
		} else if (state.yawVelocity !== 0 || state.pitchVelocity !== 0) {
			state.yawVelocity = 0;
			state.pitchVelocity = 0;
		}
	}

	return { changed, clearedShelf, completedReturn, enteredInspect };
}

/**
 * Evaluates the Volume's world-space geometric center position, 'YXZ' Euler rotation,
 * and backdrop opacity for the staged hand-pull choreography:
 *
 * - Stage 1 (0 .. extractEndProgress): Finger-hook forward tilt + straight +Z pull-out
 *   staying strictly inside the Volume's X lane (zero sideways or yaw clipping).
 * - Stage 2 (extractEndProgress .. pauseEndProgress): Brief tactile hand-grip beat with
 *   subtle forward drift once clear of the Shelf.
 * - Stage 3 (pauseEndProgress .. 1): Smooth glide in X/Y/Z and three-quarter turn into
 *   the centered Inspect Mode pose while softly dimming the Bookcase backdrop.
 */
export function evaluateInspectTransform(
	state: InspectVolumeState,
	placed: PlacedVolume,
	inspectCenter: readonly [number, number, number],
	config: InspectVolumeConfig = INSPECT_VOLUME_CONFIG
): InspectTransform {
	const restCenter = computeVolumeShelfCenter(
		placed,
		state.phase === 'entering' ? state.startPeekOffset : 0
	);

	if (state.phase === 'idle' || state.progress <= 0) {
		return {
			position: computeVolumeShelfCenter(placed, 0),
			rotation: [0, 0, placed.rotationZ],
			backdropOpacity: 0
		};
	}

	const p = Math.max(0, Math.min(1, state.progress));
	const extractEnd = config.extractEndProgress;
	const pauseEnd = config.pauseEndProgress;

	// Clear Z sits safely in front of the Shelf so the entire book body clears adjacent spines
	// before any lateral glide or yaw rotation begins.
	const clearZ = Math.min(
		inspectCenter[2],
		restCenter[2] + placed.volume.dimensions.depth + config.extractExtraClearance
	);
	const pauseDriftZ = Math.min(0.012, Math.max(0, (inspectCenter[2] - clearZ) * 0.12));
	const pauseEndZ = clearZ + pauseDriftZ;

	const targetYaw = state.phase === 'returning' ? state.returnStartYaw : state.yaw;
	const targetPitch = state.phase === 'returning' ? state.returnStartPitch : state.pitch;

	if (p <= extractEnd) {
		// Stage 1: Hook top spine forward and pull straight out along +Z in-lane.
		const t = easeOutCubic(p / extractEnd);
		const tiltT = easeOutCubic(Math.min(1, p / (extractEnd * 0.65)));
		const z = restCenter[2] + (clearZ - restCenter[2]) * t;
		const y = restCenter[1] + config.hookLiftY * tiltT;
		const pitch = config.hookTiltPitch * tiltT;

		return {
			position: [restCenter[0], y, z],
			rotation: [pitch, 0, placed.rotationZ],
			backdropOpacity: 0
		};
	}

	if (p <= pauseEnd) {
		// Stage 2: Subtle hand-grip breath right in front of the Shelf slot.
		const pauseT = (p - extractEnd) / Math.max(1e-4, pauseEnd - extractEnd);
		const z = clearZ + pauseDriftZ * pauseT;
		return {
			position: [restCenter[0], restCenter[1] + config.hookLiftY, z],
			rotation: [config.hookTiltPitch, 0, placed.rotationZ],
			backdropOpacity: 0
		};
	}

	// Stage 3: Smooth glide and three-quarter turn into the centered Inspect pose.
	const glideT = easeInOutCubic((p - pauseEnd) / Math.max(1e-4, 1 - pauseEnd));
	const startY = restCenter[1] + config.hookLiftY;

	const x = restCenter[0] + (inspectCenter[0] - restCenter[0]) * glideT;
	const y = startY + (inspectCenter[1] - startY) * glideT;
	const z = pauseEndZ + (inspectCenter[2] - pauseEndZ) * glideT;

	const pitch = config.hookTiltPitch + (targetPitch - config.hookTiltPitch) * glideT;
	const yaw = targetYaw * glideT;
	const roll = placed.rotationZ * (1 - glideT);

	return {
		position: [x, y, z],
		rotation: [pitch, yaw, roll],
		backdropOpacity: glideT * config.backdropMaxOpacity
	};
}

/**
 * Creates a pure-TS pointer gesture tracker for 3D Volume orbit in Inspect Mode.
 * Distinguishes orbit drags (> dragThresholdPx) from clicks (<= dragThresholdPx)
 * so backdrop clicks cleanly return the Volume to its Shelf slot.
 */
export function createInspectOrbitGestures(
	state: InspectVolumeState,
	config: InspectVolumeConfig = INSPECT_VOLUME_CONFIG
): InspectOrbitGestures {
	let activePointerId: number | null = null;
	let startX = 0;
	let startY = 0;
	let lastX = 0;
	let lastY = 0;
	let lastMoveTimeMs = 0;
	let hasExceededThreshold = false;

	function reset(): void {
		activePointerId = null;
		hasExceededThreshold = false;
		state.isDragging = false;
	}

	function start(pointerId: number, x: number, y: number, timeMs: number): void {
		if (activePointerId !== null) return;
		activePointerId = pointerId;
		startX = x;
		startY = y;
		lastX = x;
		lastY = y;
		lastMoveTimeMs = timeMs;
		hasExceededThreshold = false;
		state.yawVelocity = 0;
		state.pitchVelocity = 0;
	}

	function move(pointerId: number, x: number, y: number, timeMs: number): boolean {
		if (activePointerId !== pointerId) return false;
		if (state.phase !== 'inspecting' && state.phase !== 'entering') return false;

		if (!hasExceededThreshold) {
			const travel = Math.hypot(x - startX, y - startY);
			if (travel < config.dragThresholdPx) {
				return false;
			}
			hasExceededThreshold = true;
			state.isDragging = true;
			lastX = x;
			lastY = y;
			lastMoveTimeMs = timeMs;
			return true;
		}

		const dx = x - lastX;
		const dy = y - lastY;
		const deltaYaw = dx * config.orbitSensitivity;
		const deltaPitch = dy * config.orbitSensitivity;

		state.yaw += deltaYaw;
		state.pitch = clampPitch(state.pitch + deltaPitch, config);

		const dtSeconds = Math.max(0.004, (timeMs - lastMoveTimeMs) / 1000);
		const instantYawVel = Math.max(
			-config.maxAngularSpeed,
			Math.min(config.maxAngularSpeed, deltaYaw / dtSeconds)
		);
		const instantPitchVel = Math.max(
			-config.maxAngularSpeed,
			Math.min(config.maxAngularSpeed, deltaPitch / dtSeconds)
		);

		const alpha = config.dragVelocitySmoothing;
		state.yawVelocity = state.yawVelocity * (1 - alpha) + instantYawVel * alpha;
		state.pitchVelocity = state.pitchVelocity * (1 - alpha) + instantPitchVel * alpha;

		lastX = x;
		lastY = y;
		lastMoveTimeMs = timeMs;
		return true;
	}

	function end(
		pointerId: number,
		timeMs: number,
		cancelled = false
	): InspectOrbitGestureResult {
		if (activePointerId !== pointerId) {
			return { kind: 'none' };
		}

		const wasDrag = hasExceededThreshold;
		activePointerId = null;
		hasExceededThreshold = false;
		state.isDragging = false;

		if (cancelled) {
			state.yawVelocity = 0;
			state.pitchVelocity = 0;
			return { kind: 'none' };
		}

		if (!wasDrag) {
			return { kind: 'click' };
		}

		if (timeMs - lastMoveTimeMs > config.dragReleaseGraceMs) {
			state.yawVelocity = 0;
			state.pitchVelocity = 0;
		}
		return { kind: 'drag' };
	}

	return { start, move, end, reset };
}
