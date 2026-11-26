import { BINDING_STYLE_PRESETS, VOLUME_LAYOUT_CONSTANTS } from '#lib/catalog/layout.ts';
import type { BindingStyleId, SpineProfile, VolumeDimensions } from '#lib/catalog/types.ts';
import type { PageSide } from '#lib/catalog/reading.ts';
import { clampDelta, type ViewportSize } from '#lib/physics/shelf-camera.ts';

export type ReadingPhase =
	| 'idle'
	| 'opening'
	| 'reading'
	| 'closing-to-inspect'
	| 'closing-to-shelf';

export interface ReadingVolumeConfig {
	/** Duration (seconds) to align the closed Volume before unfolding starts. */
	readonly alignDuration: number;
	/** Duration (seconds) to unfold/fold the hinged cover boards and glide to Reading Mode. */
	readonly unfoldDuration: number;
	/** Subtle resting board cup angle (radians) when fully open so the book feels held. */
	readonly openRestAngle: number;
	/** Gentle reading pitch tilt (radians, negative tilts bottom slightly toward the reader). */
	readonly readingPitch: number;
	/** Minimum physical thickness (meters) for each page-stack half so paper mass never collapses. */
	readonly minStackThickness: number;
	/** Clearance (meters) between the active Page surface and the top of its page stack (prevents Z-fighting). */
	readonly pageSurfaceLift: number;
	/** Subtle upward arch height (meters) near the spine gutter of an open Page. */
	readonly pageGutterArch: number;
	/** Viewport aspect ratio threshold below which mobile single-Page framing activates (ADR 0004). */
	readonly mobilePortraitAspectThreshold: number;
	/** Fraction of the viewport width/height occupied by the open Spread on desktop. */
	readonly desktopFillRatio: number;
	/** Fraction of the viewport width occupied by a single focused Page on mobile portrait. */
	readonly mobilePageFillRatio: number;
	/** Upward vertical bias (fraction of visible height) to clear bottom floating controls. */
	readonly verticalBiasRatio: number;
	/** Minimum world Z for the open Volume center so it stays cleanly in front of the Bookcase. */
	readonly minReadingZ: number;
	/** Dimmed backdrop opacity in Reading Mode (slightly deeper than Inspect Mode for focus). */
	readonly backdropOpacity: number;
	/** Smooth lateral damping rate (1/s) when shifting between left and right Page on mobile. */
	readonly pageFocusSmoothing: number;
	/** Maximum physics step duration in seconds. */
	readonly maxDelta: number;
}

export const READING_VOLUME_CONFIG: ReadingVolumeConfig = {
	alignDuration: 0.22,
	unfoldDuration: 0.56,
	openRestAngle: 0.09,
	readingPitch: 0.1,
	minStackThickness: 0.0022,
	pageSurfaceLift: 0.0007,
	pageGutterArch: 0.006,
	mobilePortraitAspectThreshold: 0.85,
	desktopFillRatio: 0.82,
	mobilePageFillRatio: 0.88,
	verticalBiasRatio: 0.015,
	minReadingZ: 0.36,
	backdropOpacity: 0.72,
	pageFocusSmoothing: 12,
	maxDelta: 0.05
};

export interface OpenVolumeDimensions {
	readonly boardThickness: number;
	readonly boardWidth: number;
	readonly boardHeight: number;
	readonly spineWidth: number;
	readonly pageWidth: number;
	readonly pageHeight: number;
	readonly totalPageThickness: number;
	readonly pageInsetForeEdge: number;
	readonly pageInsetVertical: number;
	readonly openSpanWidth: number;
}

export interface PageStackSplit {
	readonly leftThickness: number;
	readonly rightThickness: number;
	readonly progress: number;
}

export interface ReadingFramingPose {
	/** Target world-space center [x, y, z] of the open Volume's spine midpoint. */
	readonly center: readonly [number, number, number];
	/** Whether narrow mobile portrait single-Page focus is active (ADR 0004). */
	readonly isMobileSinglePage: boolean;
	/** Lateral X offset applied to center the focused Page on mobile (0 on desktop). */
	readonly focusOffsetX: number;
	/** World Z of the dimmed Bookcase backdrop plane behind the open Volume. */
	readonly backdropZ: number;
	readonly backdropWidth: number;
	readonly backdropHeight: number;
}

export interface ReadingVolumeState {
	phase: ReadingPhase;
	/** Alignment progress (0..1) while rotating closed Volume into front-cover-facing pose. */
	alignProgress: number;
	/** Unfold progress (0 = closed hinged book, 1 = fully open Spread in Reading Mode). */
	openProgress: number;
	/** Smoothed lateral X offset for mobile single-Page focus switching. */
	currentFocusOffsetX: number;
	/** Inspect orbit yaw captured at the moment "Open to Read" was clicked. */
	startYaw: number;
	/** Inspect orbit pitch captured at the moment "Open to Read" was clicked. */
	startPitch: number;
}

export interface ReadingStepResult {
	readonly changed: boolean;
	readonly finishedOpening: boolean;
	readonly finishedClosingToInspect: boolean;
	readonly finishedClosingToShelf: boolean;
}

export interface OpenVolumePose {
	/** Left cover + page-stack hinge rotation around Y (radians: π = closed, openRestAngle = open). */
	readonly leftHingeAngle: number;
	/** Right cover + page-stack hinge rotation around Y (radians: 0 = closed, -openRestAngle = open). */
	readonly rightHingeAngle: number;
	/** Horizontal shift of the spine center so closed book stays centered on the closed center. */
	readonly spineShiftX: number;
	/** Gentle reading pitch around X (radians). */
	readonly pitchX: number;
	/** Opacity (0..1) of the inner Page surfaces (fades in smoothly as cover opens past 15°). */
	readonly pageVisibility: number;
}

function easeInOutCubic(t: number): number {
	const c = Math.max(0, Math.min(1, t));
	return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/**
 * Derives exact metric dimensions for an open Volume from its Catalog dimensions
 * and Binding Style preset so the closed and open silhouettes match seamlessly.
 */
export function computeOpenVolumeDimensions(
	dimensions: VolumeDimensions,
	spineProfile: SpineProfile = 'rounded',
	bindingStyle: BindingStyleId = 'linen-cloth'
): OpenVolumeDimensions {
	const preset = BINDING_STYLE_PRESETS[bindingStyle];
	const c = VOLUME_LAYOUT_CONSTANTS;
	const spineDepth =
		spineProfile === 'flat'
			? 0.004
			: spineProfile === 'shallow'
				? Math.min(0.005, dimensions.thickness * 0.14)
				: Math.min(0.012, dimensions.thickness * 0.28);

	const boardWidth = Math.max(0.04, dimensions.depth - spineDepth);
	const boardHeight = dimensions.height;
	const spineWidth = dimensions.thickness;
	const totalPageThickness = Math.max(
		0.006,
		dimensions.thickness - preset.boardThickness * 2 - c.innerClearance * 2
	);
	const pageWidth = Math.max(
		0.03,
		boardWidth - preset.pageBlockForeEdgeInset - c.innerClearance
	);
	const pageHeight = Math.max(0.03, boardHeight - preset.pageBlockVerticalInset * 2);

	return {
		boardThickness: preset.boardThickness,
		boardWidth,
		boardHeight,
		spineWidth,
		pageWidth,
		pageHeight,
		totalPageThickness,
		pageInsetForeEdge: preset.pageBlockForeEdgeInset,
		pageInsetVertical: preset.pageBlockVerticalInset,
		openSpanWidth: boardWidth * 2 + 0.004
	};
}

/**
 * Splits the Volume's total page-block thickness between the left and right halves
 * based on normalized reading progress [0..1], preserving exact total thickness
 * while keeping both halves above `minStackThickness` to prevent zero-volume meshes.
 */
export function computePageStackSplit(
	totalPageThickness: number,
	progress: number,
	config: ReadingVolumeConfig = READING_VOLUME_CONFIG
): PageStackSplit {
	const clampedProgress = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
	const safeTotal = Math.max(0.004, totalPageThickness);
	const minHalf = Math.min(config.minStackThickness, safeTotal * 0.25);
	const variableThickness = Math.max(0, safeTotal - minHalf * 2);

	const leftThickness = minHalf + variableThickness * clampedProgress;
	const rightThickness = safeTotal - leftThickness;

	return {
		leftThickness,
		rightThickness,
		progress: clampedProgress
	};
}

/**
 * Computes responsive Reading Mode camera-relative framing for desktop (full two-Page
 * Spread) and narrow mobile portrait (single focused Page per ADR 0004).
 */
export function computeReadingPose(
	cameraPosition: readonly [number, number, number],
	fovDegrees: number,
	viewport: ViewportSize,
	dimensions: VolumeDimensions,
	focusedSide: PageSide,
	spineProfile: SpineProfile = 'rounded',
	bindingStyle: BindingStyleId = 'linen-cloth',
	config: ReadingVolumeConfig = READING_VOLUME_CONFIG
): ReadingFramingPose {
	const openDims = computeOpenVolumeDimensions(dimensions, spineProfile, bindingStyle);
	const aspect = Math.max(0.25, viewport.width / Math.max(1, viewport.height));
	const tanHalfV = Math.tan((fovDegrees * Math.PI) / 360);
	const tanHalfH = tanHalfV * aspect;

	const isMobileSinglePage = aspect < config.mobilePortraitAspectThreshold;

	let desiredDistance: number;
	let focusOffsetX = 0;

	if (isMobileSinglePage) {
		// Frame a single Page cleanly across the narrow portrait viewport (ADR 0004).
		const singlePageTargetW = openDims.boardWidth * 1.08;
		const singlePageTargetH = openDims.boardHeight * 1.12;
		const distForWidth = singlePageTargetW / Math.max(0.01, 2 * tanHalfH * config.mobilePageFillRatio);
		const distForHeight = singlePageTargetH / Math.max(0.01, 2 * tanHalfV * 0.72);
		desiredDistance = Math.max(distForWidth, distForHeight);

		// Shift the open Volume horizontally so the focused Page sits dead-center.
		const pageCenterFromSpine = openDims.boardWidth * 0.5;
		focusOffsetX = focusedSide === 'left' ? pageCenterFromSpine : -pageCenterFromSpine;
	} else {
		// Frame the full two-Page Spread on desktop / landscape tablets.
		const distForWidth = openDims.openSpanWidth / Math.max(0.01, 2 * tanHalfH * config.desktopFillRatio);
		const distForHeight = openDims.boardHeight / Math.max(0.01, 2 * tanHalfV * 0.72);
		desiredDistance = Math.max(distForWidth, distForHeight);
	}

	const maxAllowedDistance = Math.max(0.24, cameraPosition[2] - config.minReadingZ);
	const minAllowedDistance = openDims.boardHeight * 0.55;
	const distance = Math.max(minAllowedDistance, Math.min(desiredDistance, maxAllowedDistance));

	const visibleHeight = 2 * distance * tanHalfV;
	const readingZ = cameraPosition[2] - distance;
	const readingY = cameraPosition[1] + visibleHeight * config.verticalBiasRatio;

	const backdropZ = Math.max(0.12, readingZ - openDims.boardWidth * 0.6 - 0.08);
	const backdropDistance = Math.max(0.1, cameraPosition[2] - backdropZ);
	const backdropHeight = 2 * backdropDistance * tanHalfV * 1.45;
	const backdropWidth = backdropHeight * aspect;

	return {
		center: [cameraPosition[0] + focusOffsetX, readingY, readingZ],
		isMobileSinglePage,
		focusOffsetX,
		backdropZ,
		backdropWidth,
		backdropHeight
	};
}

export function createReadingVolumeState(): ReadingVolumeState {
	return {
		phase: 'idle',
		alignProgress: 0,
		openProgress: 0,
		currentFocusOffsetX: 0,
		startYaw: -Math.PI / 2,
		startPitch: 0
	};
}

export function startReadingOpen(
	state: ReadingVolumeState,
	inspectYaw: number,
	inspectPitch: number,
	initialFocusOffsetX = 0
): void {
	state.phase = 'opening';
	state.alignProgress = 0;
	state.openProgress = 0;
	state.currentFocusOffsetX = initialFocusOffsetX;
	state.startYaw = inspectYaw;
	state.startPitch = inspectPitch;
}

export function startReadingClose(
	state: ReadingVolumeState,
	target: 'inspect' | 'shelf'
): void {
	if (state.phase === 'idle') return;
	state.phase = target === 'inspect' ? 'closing-to-inspect' : 'closing-to-shelf';
}

export function stepReadingVolume(
	state: ReadingVolumeState,
	rawDelta: number,
	targetFocusOffsetX: number,
	config: ReadingVolumeConfig = READING_VOLUME_CONFIG
): ReadingStepResult {
	const dt = clampDelta(rawDelta, config.maxDelta);
	if (dt === 0 || state.phase === 'idle') {
		return {
			changed: false,
			finishedOpening: false,
			finishedClosingToInspect: false,
			finishedClosingToShelf: false
		};
	}

	let changed = false;
	let finishedOpening = false;
	let finishedClosingToInspect = false;
	let finishedClosingToShelf = false;

	if (state.phase === 'opening') {
		if (state.alignProgress < 1) {
			const prev = state.alignProgress;
			state.alignProgress = Math.min(1, state.alignProgress + dt / Math.max(0.05, config.alignDuration));
			changed = changed || state.alignProgress !== prev;
		} else if (state.openProgress < 1) {
			const prev = state.openProgress;
			state.openProgress = Math.min(1, state.openProgress + dt / Math.max(0.05, config.unfoldDuration));
			changed = changed || state.openProgress !== prev;
			if (state.openProgress >= 1) {
				state.openProgress = 1;
				state.phase = 'reading';
				finishedOpening = true;
			}
		}
	} else if (state.phase === 'closing-to-inspect' || state.phase === 'closing-to-shelf') {
		const prev = state.openProgress;
		state.openProgress = Math.max(0, state.openProgress - dt / Math.max(0.05, config.unfoldDuration * 0.85));
		changed = changed || state.openProgress !== prev;
		if (state.openProgress <= 0) {
			state.openProgress = 0;
			state.alignProgress = 0;
			const wasToInspect = state.phase === 'closing-to-inspect';
			state.phase = 'idle';
			finishedClosingToInspect = wasToInspect;
			finishedClosingToShelf = !wasToInspect;
		}
	}

	// Smoothly interpolate mobile single-Page lateral focus offset.
	const diff = targetFocusOffsetX - state.currentFocusOffsetX;
	if (Math.abs(diff) > 0.0002) {
		const factor = 1 - Math.exp(-config.pageFocusSmoothing * dt);
		state.currentFocusOffsetX += diff * factor;
		changed = true;
	} else if (state.currentFocusOffsetX !== targetFocusOffsetX) {
		state.currentFocusOffsetX = targetFocusOffsetX;
		changed = true;
	}

	return {
		changed,
		finishedOpening,
		finishedClosingToInspect,
		finishedClosingToShelf
	};
}

/**
 * Evaluates the hinged cover angles, spine centering shift, and reading pitch
 * for a given openProgress in [0, 1].
 */
export function evaluateOpenVolumePose(
	openProgress: number,
	openDims: OpenVolumeDimensions,
	config: ReadingVolumeConfig = READING_VOLUME_CONFIG
): OpenVolumePose {
	const t = easeInOutCubic(openProgress);

	// Left board swings smoothly from folded shut (+π) to gently cupped open (+openRestAngle).
	const leftHingeAngle = Math.PI + (config.openRestAngle - Math.PI) * t;
	// Right board settles symmetrically from flat (0) to gently cupped open (-openRestAngle).
	const rightHingeAngle = -config.openRestAngle * t;

	// When closed (t = 0), both halves extend along +X from the spine, so shift spine left by
	// half a board width to keep the closed book centered on the Inspect Mode center.
	const spineShiftX = -(openDims.boardWidth * 0.5) * (1 - t);
	const pitchX = config.readingPitch * t;
	const pageVisibility = Math.max(0, Math.min(1, (t - 0.08) / 0.2));

	return {
		leftHingeAngle,
		rightHingeAngle,
		spineShiftX,
		pitchX,
		pageVisibility
	};
}
