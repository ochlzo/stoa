import {
	BOOKCASE_DIMENSIONS,
	ROOM_BACKDROP_DIMENSIONS,
	SHELF_CAMERA_DEFAULTS,
	getBookcaseStructure,
	getInitialShelfCameraY,
	getShelfSurfaceY
} from '#lib/catalog/bookcase.ts';

const { bounds: bookcaseBounds } = getBookcaseStructure();
const room = ROOM_BACKDROP_DIMENSIONS;
const wallZ = -(BOOKCASE_DIMENSIONS.depth + room.baseboardDepth + room.wallOffsetBehindBookcase);
const halfShelfHeight = BOOKCASE_DIMENSIONS.shelfClearance / 2;
const bottomShelfCenter = getShelfSurfaceY(0) + halfShelfHeight;
const topShelfCenter = getShelfSurfaceY(BOOKCASE_DIMENSIONS.shelfCount - 1) + halfShelfHeight;
const defaultTanHalfFov = Math.tan(SHELF_CAMERA_DEFAULTS.fov * Math.PI / 360);

export interface ShelfCameraBounds {
	readonly minX: number;
	readonly maxX: number;
	readonly minY: number;
	readonly maxY: number;
	readonly minZ: number;
	readonly maxZ: number;
}

export interface ShelfCameraConfig {
	/** Maximum physics step duration in seconds (prevents tab-switch jumps). */
	readonly maxDelta: number;
	/** Exponential velocity decay rate (1/s) after pointer release or wheel scroll. */
	readonly inertiaDamping: number;
	/** Exponential smoothing rate (1/s) when easing camera Z toward targetZ during zoom. */
	readonly zoomSmoothing: number;
	/** Minimum speed (m/s) below which residual velocity snaps cleanly to zero. */
	readonly stopSpeedThreshold: number;
	/** Minimum Z delta (m) below which zoom snaps cleanly to targetZ. */
	readonly zoomStopThreshold: number;
	/** Maximum camera pan speed (m/s) to prevent erratic flings. */
	readonly maxSpeed: number;
	/** Smoothing factor (0..1) when sampling instantaneous drag velocity. */
	readonly dragVelocitySmoothing: number;
	/** Idle time (ms) after the last pointermove before release velocity decays away. */
	readonly dragReleaseGraceMs: number;
	/** Multiplier converting wheel pixel delta into world-meter velocity impulse. */
	readonly wheelImpulseScale: number;
	/** Multiplier converting trackpad ctrl+wheel delta into zoom factor. */
	readonly wheelZoomSensitivity: number;
	/** Closest allowed camera distance in Shelf Mode (meters). */
	readonly minZoomDistance: number;
	/** Default maximum zoom-out distance on desktop viewports (meters). */
	readonly maxZoomDistance: number;
	/** Horizontal wall margin outside the Bookcase crown at z = 0 (meters). */
	readonly horizontalMargin: number;
	/** Horizontal margin outside the Bookcase crown when auto-fitting mobile width (meters). */
	readonly mobileFitMargin: number;
	/** Minimum horizontal pan give (meters) on wide desktop viewports. */
	readonly desktopHorizontalGive: number;
	/** Floor margin visible below the plinth at the bottom pan limit (meters). */
	readonly bottomMargin: number;
	/** Wall margin visible above the crown at the top pan limit (meters). */
	readonly topMargin: number;
	/** Minimum camera height above the floor (meters). */
	readonly minFloorClearance: number;
	/** Pointer travel distance (CSS px) before a press counts as a pan drag. */
	readonly dragThresholdPx: number;
}

export const SHELF_CAMERA_CONFIG: ShelfCameraConfig = {
	maxDelta: 0.05,
	inertiaDamping: 7.5,
	zoomSmoothing: 14,
	stopSpeedThreshold: 0.002,
	zoomStopThreshold: 0.0005,
	maxSpeed: 3.5,
	dragVelocitySmoothing: 0.35,
	dragReleaseGraceMs: 80,
	wheelImpulseScale: 6.5,
	wheelZoomSensitivity: 0.0025,
	minZoomDistance: 1.0,
	maxZoomDistance: 2.6,
	horizontalMargin: 0.14,
	mobileFitMargin: 0.012,
	desktopHorizontalGive: 0.16,
	bottomMargin: 0.08,
	topMargin: 0.14,
	minFloorClearance: 0.25,
	dragThresholdPx: 6
};

export interface ShelfCameraState {
	x: number;
	y: number;
	z: number;
	targetZ: number;
	vx: number;
	vy: number;
	isDragging: boolean;
}

export interface ViewportSize {
	readonly width: number;
	readonly height: number;
}

/**
 * Clamps frame delta so tab switches or debugger pauses never cause camera jumps.
 */
export function clampDelta(delta: number, maxDelta = SHELF_CAMERA_CONFIG.maxDelta): number {
	if (!Number.isFinite(delta) || delta <= 0) {
		return 0;
	}
	return Math.min(delta, maxDelta);
}

/**
 * Returns the full visible height (meters) of the camera frustum at a given distance.
 */
export function getVisibleHeightAtDistance(
	distance: number,
	fovDegrees: number = SHELF_CAMERA_DEFAULTS.fov
): number {
	const halfFovRadians = (fovDegrees * Math.PI) / 360;
	return 2 * distance * Math.tan(halfFovRadians);
}

/**
 * Computes the maximum camera Z distance that keeps the RoomBackdrop wall covering
 * the entire viewport without exposing void.
 */
function getProjection(viewport: ViewportSize) {
	const aspect = Math.max(1, viewport.width) / Math.max(1, viewport.height);
	// In a shallow window, narrow the vertical angle before the wall edges enter view.
	const widthLimit = room.wallWidth / (2 * aspect * (SHELF_CAMERA_DEFAULTS.distance - wallZ));
	const tanHalfFov = Math.min(defaultTanHalfFov, widthLimit);
	const maxWallSafeZ = wallZ + Math.min(room.wallHeight, room.wallWidth / aspect) / (2 * tanHalfFov);
	return { aspect, tanHalfFov, maxWallSafeZ };
}

export function getShelfCameraFov(viewport: ViewportSize): number {
	return Math.atan(getProjection(viewport).tanHalfFov) * 360 / Math.PI;
}

/**
 * Computes the default Shelf Mode camera Z distance for a viewport.
 *
 * - On desktop/wide viewports, stays at SHELF_CAMERA_DEFAULTS.distance (1.52 m).
 * - On narrow portrait viewports (mobile), pulls back automatically so the full
 *   width of the Bookcase fits on screen by default, while staying void-free.
 */
export function computeDefaultCameraZ(
	viewport: ViewportSize,
	config: ShelfCameraConfig = SHELF_CAMERA_CONFIG
): number {
	const { aspect, tanHalfFov, maxWallSafeZ } = getProjection(viewport);
	const fitHalfW = bookcaseBounds.maxX + config.mobileFitMargin;
	const fitWidthDistance = bookcaseBounds.maxZ + fitHalfW / (aspect * tanHalfFov);
	return Math.min(Math.max(SHELF_CAMERA_DEFAULTS.distance, fitWidthDistance), maxWallSafeZ);
}

/**
 * Computes hard X/Y/Z camera clamp bounds for the current viewport and zoom distance.
 *
 * Framing rules (per ADR 0007):
 * - Desktop frames the full Bookcase width with a controlled wall margin and
 *   gentle horizontal give, while allowing full vertical panning across all 5 Shelves.
 * - Mobile portrait starts pulled back to show the full Bookcase width by default
 *   and allows pinch-zooming in and panning freely across both axes.
 * - All zoom levels are hard-clamped against the RoomBackdrop wall dimensions at
 *   wallZ so the camera never exposes empty void.
 */
export function computeShelfCameraBounds(
	viewport: ViewportSize,
	cameraZ?: number,
	config: ShelfCameraConfig = SHELF_CAMERA_CONFIG
): ShelfCameraBounds {
	const { aspect, tanHalfFov, maxWallSafeZ } = getProjection(viewport);
	const defaultZ = computeDefaultCameraZ(viewport, config);
	const minZ = Math.min(config.minZoomDistance, maxWallSafeZ);
	const maxZ = Math.min(Math.max(defaultZ, config.maxZoomDistance), maxWallSafeZ);
	const effectiveZ = Math.min(Math.max(cameraZ ?? defaultZ, minZ), maxZ);

	const distanceToWall = effectiveZ - wallZ;

	const halfVisibleHFront = effectiveZ * tanHalfFov;
	const halfVisibleWFront = halfVisibleHFront * aspect;

	const halfVisibleHWall = distanceToWall * tanHalfFov;
	const halfVisibleWWall = halfVisibleHWall * aspect;

	// Never expose empty void beyond the left/right edges of the room wall at wallZ.
	const maxWallSafeX = Math.max(0, room.wallWidth / 2 - halfVisibleWWall);
	const framedHalfW = bookcaseBounds.maxX + config.horizontalMargin;
	const neededPanX = Math.max(0, framedHalfW - halfVisibleWFront);
	const desiredMaxX = Math.max(neededPanX, config.desktopHorizontalGive);
	const maxX = Math.min(desiredMaxX, maxWallSafeX);

	// Vertical framing: show plinth + floor margin at bottom, crown + wall margin at top,
	// while never exposing void above the room wall at wallZ.
	const maxWallSafeY = room.wallHeight - halfVisibleHWall;
	// At large portrait zoom distances the floor's front edge can also enter view.
	const floorSafeY = Math.max(config.minFloorClearance, (distanceToWall - room.floorDepth) * tanHalfFov);
	const bottomLimit = halfVisibleHFront - config.bottomMargin;
	const minY = Math.max(floorSafeY, aspect < 1 ? Math.min(bottomLimit, bottomShelfCenter) : bottomLimit);
	const topLimit = bookcaseBounds.maxY + config.topMargin - halfVisibleHFront;
	const maxY = Math.min(maxWallSafeY, aspect < 1 ? Math.max(topLimit, topShelfCenter) : topLimit);

	return {
		minX: -maxX,
		maxX,
		minY,
		maxY,
		minZ,
		maxZ
	};
}

/** Keep a camera's last projection bounds across frames and pointer events. */
export function createCameraBoundsReader() {
	let cached: ShelfCameraBounds | undefined;
	let width: number, height: number, distance: number;
	return (viewport: ViewportSize, z: number) => {
		if (!cached || viewport.width !== width || viewport.height !== height || z !== distance) {
			cached = computeShelfCameraBounds(viewport, z);
			width = viewport.width;
			height = viewport.height;
			distance = z;
		}
		return cached;
	};
}

/**
 * Creates the initial Shelf Mode camera state centered on the default Shelf
 * at the viewport's adaptive default Z distance.
 */
export function createShelfCameraState(
	viewport?: ViewportSize,
	config: ShelfCameraConfig = SHELF_CAMERA_CONFIG
): ShelfCameraState {
	const defaultZ = viewport ? computeDefaultCameraZ(viewport, config) : SHELF_CAMERA_DEFAULTS.distance;
	const state: ShelfCameraState = {
		x: 0,
		y: getInitialShelfCameraY(),
		z: defaultZ,
		targetZ: defaultZ,
		vx: 0,
		vy: 0,
		isDragging: false
	};

	if (viewport) {
		const bounds = computeShelfCameraBounds(viewport, state.z, config);
		clampCameraPosition(state, bounds);
	}

	return state;
}

/**
 * Converts a CSS-pixel drag delta into a world-meter camera displacement at the
 * Bookcase front plane (z = 0) for the given camera distance.
 *
 * Direct manipulation sign convention:
 * - Dragging right (+dx) moves the Bookcase right -> camera moves left (-worldDx).
 * - Dragging down (+dy) moves the Bookcase down -> camera moves up (+worldDy).
 */
export function pixelsToWorldPan(
	dxPixels: number,
	dyPixels: number,
	viewportHeight: number,
	cameraZ: number = SHELF_CAMERA_DEFAULTS.distance,
	fov: number = SHELF_CAMERA_DEFAULTS.fov
): { dx: number; dy: number } {
	const safeHeight = Math.max(1, viewportHeight);
	const metersPerPixel = getVisibleHeightAtDistance(cameraZ, fov) / safeHeight;
	return {
		dx: -dxPixels * metersPerPixel,
		dy: dyPixels * metersPerPixel
	};
}

/**
 * Normalizes a DOM WheelEvent delta into CSS pixels based on deltaMode
 * (0 = pixel, 1 = line, 2 = page).
 */
export function normalizeWheelDelta(
	delta: number,
	deltaMode: number,
	viewportHeight: number
): number {
	if (deltaMode === 1) {
		return delta * 16;
	}
	if (deltaMode === 2) {
		return delta * Math.max(1, viewportHeight) * 0.85;
	}
	return delta;
}

/**
 * Applies a pointer drag increment directly to camera position and updates the
 * smoothed release velocity for post-release inertia.
 */
export function applyDragPan(
	state: ShelfCameraState,
	dxPixels: number,
	dyPixels: number,
	dtSeconds: number,
	viewportHeight: number,
	bounds: ShelfCameraBounds,
	config: ShelfCameraConfig = SHELF_CAMERA_CONFIG,
	fov: number = SHELF_CAMERA_DEFAULTS.fov
): void {
	const { dx, dy } = pixelsToWorldPan(dxPixels, dyPixels, viewportHeight, state.z, fov);
	state.x += dx;
	state.y += dy;

	const safeDt = Math.max(dtSeconds, 0.004);
	const instantVx = dx / safeDt;
	const instantVy = dy / safeDt;
	const blend = config.dragVelocitySmoothing;

	state.vx = state.vx * (1 - blend) + instantVx * blend;
	state.vy = state.vy * (1 - blend) + instantVy * blend;

	clampVelocity(state, config.maxSpeed);
	clampCameraPosition(state, bounds);
}

/**
 * Applies a two-finger pinch scale ratio (prevDistance / nextDistance) to targetZ,
 * clamped to the viewport's safe zoom range.
 *
 * Spreading fingers apart (ratio < 1) moves the camera closer (zooms in).
 */
export function applyPinchZoom(
	state: ShelfCameraState,
	distanceRatio: number,
	bounds: ShelfCameraBounds
): void {
	if (!Number.isFinite(distanceRatio) || distanceRatio <= 0) return;
	state.targetZ = Math.min(Math.max(state.targetZ * distanceRatio, bounds.minZ), bounds.maxZ);
}

/**
 * Applies a wheel or trackpad scroll gesture as a smooth velocity impulse,
 * or as a smooth zoom adjustment when ctrlKey (trackpad pinch) is active.
 */
export function applyWheelImpulse(
	state: ShelfCameraState,
	deltaX: number,
	deltaY: number,
	deltaMode: number,
	viewportHeight: number,
	bounds?: ShelfCameraBounds,
	isPinchGesture = false,
	config: ShelfCameraConfig = SHELF_CAMERA_CONFIG,
	fov: number = SHELF_CAMERA_DEFAULTS.fov
): void {
	const safeHeight = Math.max(1, viewportHeight);
	const pxY = normalizeWheelDelta(deltaY, deltaMode, safeHeight);

	if (isPinchGesture && bounds) {
		const factor = Math.exp(pxY * config.wheelZoomSensitivity);
		applyPinchZoom(state, factor, bounds);
		return;
	}

	const pxX = normalizeWheelDelta(deltaX, deltaMode, safeHeight);
	const metersPerPixel = getVisibleHeightAtDistance(state.z, fov) / safeHeight;

	state.vx += pxX * metersPerPixel * config.wheelImpulseScale;
	state.vy -= pxY * metersPerPixel * config.wheelImpulseScale;

	clampVelocity(state, config.maxSpeed);
}

/**
 * Advances camera inertia and smooth zoom by one frame, recomputing bounds for
 * the updated Z distance and hard-clamping position.
 *
 * Returns true if the camera moved or zoomed this step.
 */
export function stepShelfCamera(
	state: ShelfCameraState,
	viewport: ViewportSize,
	rawDelta: number,
	config: ShelfCameraConfig = SHELF_CAMERA_CONFIG,
	readBounds: (viewport: ViewportSize, z: number, config: ShelfCameraConfig) => ShelfCameraBounds = computeShelfCameraBounds
): boolean {
	const dt = clampDelta(rawDelta, config.maxDelta);
	const prevX = state.x;
	const prevY = state.y;
	const prevZ = state.z;

	const currentBounds = readBounds(viewport, state.z, config);
	state.targetZ = Math.min(Math.max(state.targetZ, currentBounds.minZ), currentBounds.maxZ);

	if (dt > 0) {
		const zDiff = state.targetZ - state.z;
		if (Math.abs(zDiff) <= config.zoomStopThreshold) {
			state.z = state.targetZ;
		} else {
			state.z += zDiff * (1 - Math.exp(-config.zoomSmoothing * dt));
		}

		if (!state.isDragging) {
			state.x += state.vx * dt;
			state.y += state.vy * dt;

			const decay = Math.exp(-config.inertiaDamping * dt);
			state.vx *= decay;
			state.vy *= decay;

			if (Math.hypot(state.vx, state.vy) < config.stopSpeedThreshold) {
				state.vx = 0;
				state.vy = 0;
			}
		}
	}

	const finalBounds = state.z === prevZ ? currentBounds : readBounds(viewport, state.z, config);
	clampCameraPosition(state, finalBounds);
	return state.x !== prevX || state.y !== prevY || state.z !== prevZ;
}

/**
 * Hard-clamps camera position to bounds and zeros any velocity pushing into a clamped wall.
 */
export function clampCameraPosition(state: ShelfCameraState, bounds: ShelfCameraBounds): void {
	state.z = Math.min(Math.max(state.z, bounds.minZ), bounds.maxZ);
	state.targetZ = Math.min(Math.max(state.targetZ, bounds.minZ), bounds.maxZ);

	if (state.x <= bounds.minX) {
		state.x = bounds.minX;
		if (state.vx < 0) state.vx = 0;
	} else if (state.x >= bounds.maxX) {
		state.x = bounds.maxX;
		if (state.vx > 0) state.vx = 0;
	}

	if (state.y <= bounds.minY) {
		state.y = bounds.minY;
		if (state.vy < 0) state.vy = 0;
	} else if (state.y >= bounds.maxY) {
		state.y = bounds.maxY;
		if (state.vy > 0) state.vy = 0;
	}
}

function clampVelocity(state: ShelfCameraState, maxSpeed: number): void {
	const speed = Math.hypot(state.vx, state.vy);
	if (speed > maxSpeed && speed > 0) {
		const scale = maxSpeed / speed;
		state.vx *= scale;
		state.vy *= scale;
	}
}
