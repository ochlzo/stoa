<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import type { PerspectiveCamera } from 'three';
	import { SHELF_CAMERA_DEFAULTS } from '#lib/catalog/bookcase.ts';
	import {
		SHELF_CAMERA_CONFIG,
		createCameraBoundsReader,
		getShelfCameraFov,
		applyWheelImpulse,
		clampDelta,
		computeDefaultCameraZ,
		createShelfCameraState,
		stepShelfCamera
	} from '#lib/physics/shelf-camera.ts';

	import { createShelfGestures } from '#lib/physics/shelf-gestures.ts';
	import {
		getIsShelfPanning,
		getPeekedVolume,
		setShelfPanning
	} from '#lib/state/library.svelte.ts';

	const { canvas, size } = useThrelte();

	const cameraState = createShelfCameraState(size.current);

	const readBounds = createCameraBoundsReader();
	const fov = $derived(getShelfCameraFov($size));

	let cameraRef: PerspectiveCamera | undefined;
	let hasUserZoomed = false;

	function syncCameraTransform(): void {
		if (!cameraRef) return;
		cameraRef.position.set(cameraState.x, cameraState.y, cameraState.z);
		cameraRef.lookAt(cameraState.x, cameraState.y, 0);
	}

	// Keep the default zoom adapted to viewport orientation/size until the reader zooms manually.
	$effect(() => {
		const viewport = $size;
		if (!hasUserZoomed) {
			const nextDefaultZ = computeDefaultCameraZ(viewport);
			cameraState.z = nextDefaultZ;
			cameraState.targetZ = nextDefaultZ;
		}
		stepShelfCamera(cameraState, viewport, 0, SHELF_CAMERA_CONFIG, readBounds);
		syncCameraTransform();
	});

	// Keep the canvas cursor aligned with panning state and the hovered Volume type.
	$effect(() => {
		if (getIsShelfPanning()) {
			canvas.style.cursor = 'grabbing';
			return;
		}
		const peeked = getPeekedVolume();
		if (peeked?.kind === 'readable') {
			canvas.style.cursor = 'pointer';
		} else if (peeked?.kind === 'placeholder') {
			canvas.style.cursor = 'default';
		} else {
			canvas.style.cursor = 'grab';
		}
	});

	// Attach single-pointer drag, two-finger pinch zoom, and wheel listeners to the WebGL canvas.
	$effect(() => {
		const gestures = createShelfGestures(cameraState);

		function onPointerDown(event: PointerEvent): void {
			if (event.pointerType === 'mouse' && event.button !== 0) return;
			gestures.start(event.pointerId, event.clientX, event.clientY, event.timeStamp);
		}

		function onPointerMove(event: PointerEvent): void {
			if (!cameraState.isDragging) return;
			const viewport = size.current;
			const gesture = gestures.move(event.pointerId, event.clientX, event.clientY,
				event.timeStamp, viewport.height, readBounds(viewport, cameraState.z), fov);
			if (!gesture) return;
			if (gesture === 'pinch') hasUserZoomed = true;
			setShelfPanning(true);
			syncCameraTransform();
		}

		function onPointerEnd(event: PointerEvent): void {
			gestures.end(event.pointerId, event.timeStamp, event.type === 'pointercancel');
			if (!cameraState.isDragging) setShelfPanning(false);
		}

		function onWheel(event: WheelEvent): void {
			event.preventDefault();
			const viewport = size.current;
			const bounds = readBounds(viewport, cameraState.z);
			if (event.ctrlKey) {
				hasUserZoomed = true;
			}
			applyWheelImpulse(
				cameraState,
				event.deltaX,
				event.deltaY,
				event.deltaMode,
				viewport.height,
				bounds,
				event.ctrlKey,
				SHELF_CAMERA_CONFIG,
				fov
			);
		}

		canvas.addEventListener('pointerdown', onPointerDown);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerEnd);
		window.addEventListener('pointercancel', onPointerEnd);

		return () => {
			setShelfPanning(false);
			canvas.style.cursor = '';
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('wheel', onWheel);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerEnd);
			window.removeEventListener('pointercancel', onPointerEnd);
		};
	});

	// Advance camera inertia and smooth zoom each frame with clamped delta.
	useTask((delta) => {
		const dt = clampDelta(delta);
		const moved = stepShelfCamera(cameraState, size.current, dt, SHELF_CAMERA_CONFIG, readBounds);
		if (moved) {
			syncCameraTransform();
		}
	});
</script>

<T.PerspectiveCamera
	makeDefault
	{fov}
	near={SHELF_CAMERA_DEFAULTS.near}
	far={SHELF_CAMERA_DEFAULTS.far}
	position={[cameraState.x, cameraState.y, cameraState.z]}
	oncreate={(camera) => {
		cameraRef = camera;
		syncCameraTransform();
	}}
/>
