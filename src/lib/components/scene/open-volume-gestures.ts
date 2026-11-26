import { Raycaster, Vector2, Vector3, type Camera, type Group, type Intersection } from 'three';
import type { PageSide } from '#lib/catalog/reading.ts';
import { PAGE_STACK_FRONT_MATERIAL_INDEX } from '#lib/components/scene/open-volume-geometry.ts';
import type { LeafTurn, TurnDirection } from '#lib/physics/leaf-turn.ts';
import {
	READING_SWIPE_CONFIG,
	createReadingSwipe,
	isWithinTapThreshold,
	type PageHit
} from '#lib/physics/reading-swipe.ts';
import {
	READING_VOLUME_CONFIG,
	applyReadingWheelZoom,
	createReadingTiltGestures,
	type ReadingVolumeState
} from '#lib/physics/reading-volume.ts';
import { normalizeWheelDelta } from '#lib/physics/shelf-camera.ts';

const WHEEL_TURN_THRESHOLD_PX = 32;
const WHEEL_GESTURE_GAP_MS = 180;

export interface OpenVolumeGestureOptions {
	readonly canvas: HTMLCanvasElement;
	readonly getCamera: () => Camera;
	readonly getRootGroup: () => Group | undefined;
	readonly getPageWidth: () => number;
	readonly readingState: ReadingVolumeState;
	readonly wheelTurnsPages: boolean;
	readonly getLeafTurn: () => LeafTurn | null;
	readonly startLeafTurn: (direction: TurnDirection, drag?: boolean) => LeafTurn | null;
	readonly getFocusedPageSide: () => PageSide;
	readonly setFocusedPageSide: (side: PageSide) => void;
	readonly onPanOffsetChange: (panOffsetRatio: number) => void;
	readonly onToggleHud: (clientX: number, clientY: number) => void;
}

function resolvePageHit(
	hit: Intersection | undefined,
	camera: Camera,
	pageWidth: number,
	rectWidth: number
): PageHit | null {
	const side = hit?.object.userData?.pageSide as PageSide | undefined;
	if (
		!hit ||
		(side !== 'left' && side !== 'right') ||
		hit.face?.materialIndex !== PAGE_STACK_FRONT_MATERIAL_INDEX ||
		!hit.uv
	) {
		return null;
	}
	const uvFromSpine = side === 'right' ? hit.uv.x : 1 - hit.uv.x;
	const outerMargin = uvFromSpine >= READING_SWIPE_CONFIG.outerMarginUvThreshold;
	const projectX = (x: number) =>
		hit.object.localToWorld(new Vector3(x, 0, 0)).project(camera).x;
	const sign = side === 'right' ? 1 : -1;
	const width = (Math.abs(projectX(pageWidth * sign) - projectX(0)) * rectWidth) / 2;
	return { side, outerMargin, width };
}

/**
 * Attaches Reading Mode pointer, swipe, tilt, pinch-zoom, and wheel handlers to the canvas.
 * Keeps raycasting and event arbitration out of OpenVolume.svelte.
 */
export function attachOpenVolumeGestures(options: OpenVolumeGestureOptions): () => void {
	const {
		canvas,
		getCamera,
		getRootGroup,
		getPageWidth,
		readingState,
		wheelTurnsPages,
		getLeafTurn,
		startLeafTurn,
		getFocusedPageSide,
		setFocusedPageSide,
		onPanOffsetChange,
		onToggleHud
	} = options;

	const tiltGestures = createReadingTiltGestures(readingState);
	const raycaster = new Raycaster();
	const activePointers = new Set<number>();
	let swipe: ReturnType<typeof createReadingSwipe> | undefined;
	let swipeOwner: number | undefined;
	let pressedVolume = false;
	let lastWheelTime = -Infinity;
	let wheelTravel = 0;
	let wheelConsumed = false;
	let pendingTap: { id: number; x: number; y: number } | undefined;

	function onClick(event: MouseEvent): void {
		// A margin press replaces the stack meshes before Threlte tests the backdrop click.
		if (pressedVolume) event.stopImmediatePropagation();
		pressedVolume = false;
	}

	function onPointerDown(event: PointerEvent): void {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		activePointers.add(event.pointerId);
		tiltGestures.start(event.pointerId, event.clientX, event.clientY);

		if (activePointers.size > 1) {
			pendingTap = undefined;
			swipe?.end(0, 0, event.timeStamp, true);
			swipe = undefined;
			swipeOwner = undefined;
			return;
		}

		pressedVolume = false;
		const rootGroup = getRootGroup();
		if (!rootGroup) return;

		const rect = canvas.getBoundingClientRect();
		const ndc = new Vector2(
			((event.clientX - rect.left) / rect.width) * 2 - 1,
			1 - ((event.clientY - rect.top) / rect.height) * 2
		);
		const activeCamera = getCamera();
		raycaster.setFromCamera(ndc, activeCamera);
		const hit = raycaster.intersectObject(rootGroup)[0];
		pressedVolume = Boolean(hit);
		if (getLeafTurn()) return;

		if (hit) {
			pendingTap = { id: event.pointerId, x: event.clientX, y: event.clientY };
		}

		const pageHit = resolvePageHit(hit, activeCamera, getPageWidth(), rect.width);
		if (!pageHit) return;

		swipeOwner = event.pointerId;
		swipe = createReadingSwipe({
			hit: pageHit,
			portrait: rect.width / rect.height < READING_VOLUME_CONFIG.mobilePortraitAspectThreshold,
			focusedSide: getFocusedPageSide(),
			startX: event.clientX,
			startY: event.clientY,
			startTime: event.timeStamp,
			beginTurn: (direction) => startLeafTurn(direction, true),
			focusSide: setFocusedPageSide,
			onPan: onPanOffsetChange
		});
	}

	function onPointerMove(event: PointerEvent): void {
		if (
			pendingTap?.id === event.pointerId &&
			!isWithinTapThreshold(event.clientX - pendingTap.x, event.clientY - pendingTap.y)
		) {
			pendingTap = undefined;
		}
		const swiping =
			event.pointerId === swipeOwner &&
			Boolean(swipe?.move(event.clientX, event.clientY, event.timeStamp));
		const moved = tiltGestures.move(event.pointerId, event.clientX, event.clientY, swiping);
		if (moved) {
			canvas.style.cursor = 'grabbing';
		}
	}

	function onPointerEnd(event: PointerEvent): void {
		if (swipeOwner === event.pointerId) {
			swipe?.end(event.clientX, event.clientY, event.timeStamp, event.type === 'pointercancel');
			swipe = undefined;
			swipeOwner = undefined;
		}
		if (pendingTap?.id === event.pointerId) {
			if (
				event.type === 'pointerup' &&
				!getLeafTurn() &&
				isWithinTapThreshold(event.clientX - pendingTap.x, event.clientY - pendingTap.y)
			) {
				onToggleHud(event.clientX, event.clientY);
			}
			pendingTap = undefined;
		}
		activePointers.delete(event.pointerId);
		tiltGestures.end(event.pointerId);
		if (!readingState.isTilting) {
			canvas.style.cursor = 'default';
		}
	}

	function onWheel(event: WheelEvent): void {
		event.preventDefault();
		if (!wheelTurnsPages || event.ctrlKey) {
			applyReadingWheelZoom(readingState, event.deltaY, event.deltaMode);
			return;
		}

		const deltaMode = event.deltaMode;
		const delta = normalizeWheelDelta(event.deltaY, deltaMode, canvas.clientHeight);
		if (!delta || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
		if (event.timeStamp - lastWheelTime >= WHEEL_GESTURE_GAP_MS) {
			wheelTravel = 0;
			wheelConsumed = false;
		}
		lastWheelTime = event.timeStamp;

		// Treat trackpad momentum as part of the same gesture, including during a Leaf turn.
		if (getLeafTurn() || activePointers.size > 0) {
			wheelConsumed = true;
		}
		if (wheelConsumed) return;
		wheelTravel += delta;
		if (Math.abs(wheelTravel) < WHEEL_TURN_THRESHOLD_PX) return;
		wheelConsumed = true;
		startLeafTurn(wheelTravel > 0 ? 1 : -1);
	}

	canvas.addEventListener('click', onClick, true);
	canvas.addEventListener('pointerdown', onPointerDown);
	canvas.addEventListener('wheel', onWheel, { passive: false });
	window.addEventListener('pointermove', onPointerMove);
	window.addEventListener('pointerup', onPointerEnd);
	window.addEventListener('pointercancel', onPointerEnd);

	return () => {
		onPanOffsetChange(0);
		tiltGestures.reset();
		canvas.style.cursor = 'default';
		canvas.removeEventListener('click', onClick, true);
		canvas.removeEventListener('pointerdown', onPointerDown);
		canvas.removeEventListener('wheel', onWheel);
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerEnd);
		window.removeEventListener('pointercancel', onPointerEnd);
	};
}
