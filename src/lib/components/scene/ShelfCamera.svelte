<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import type { PerspectiveCamera } from 'three';
	import { SHELF_CAMERA_DEFAULTS } from '#lib/catalog/bookcase.ts';
	import {
		SHELF_CAMERA_CONFIG,
		applyDragPan,
		applyPinchZoom,
		applyWheelImpulse,
		clampDelta,
		computeDefaultCameraZ,
		computeShelfCameraBounds,
		createShelfCameraState,
		stepShelfCamera
	} from '#lib/physics/shelf-camera.ts';

	const { canvas, size } = useThrelte();

	const cameraState = createShelfCameraState(size.current);

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
		stepShelfCamera(cameraState, viewport, 0);
		syncCameraTransform();
	});

	// Attach single-pointer drag, two-finger pinch zoom, and wheel listeners to the WebGL canvas.
	$effect(() => {
		const activePointers = new Map<number, { x: number; y: number }>();
		let primaryPointerId: number | null = null;
		let dragStartX = 0;
		let dragStartY = 0;
		let lastPointerX = 0;
		let lastPointerY = 0;
		let lastMoveTimeMs = 0;
		let hasExceededDragThreshold = false;

		let prevPinchDistance = 0;
		let prevPinchMidX = 0;
		let prevPinchMidY = 0;

		canvas.style.cursor = 'grab';

		function getPinchMetrics(): { distance: number; midX: number; midY: number } | null {
			if (activePointers.size < 2) return null;
			const iter = activePointers.values();
			const first = iter.next().value;
			const second = iter.next().value;
			if (!first || !second) return null;
			return {
				distance: Math.hypot(second.x - first.x, second.y - first.y),
				midX: (first.x + second.x) / 2,
				midY: (first.y + second.y) / 2
			};
		}

		function onPointerDown(event: PointerEvent): void {
			if (event.pointerType === 'mouse' && event.button !== 0) return;

			activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

			// Catch any active inertia glide immediately when the reader touches/grabs the Bookcase.
			cameraState.isDragging = true;
			cameraState.vx = 0;
			cameraState.vy = 0;

			if (activePointers.size === 1) {
				primaryPointerId = event.pointerId;
				dragStartX = event.clientX;
				dragStartY = event.clientY;
				lastPointerX = event.clientX;
				lastPointerY = event.clientY;
				lastMoveTimeMs = performance.now();
				hasExceededDragThreshold = false;
			} else if (activePointers.size === 2) {
				const pinch = getPinchMetrics();
				if (pinch) {
					prevPinchDistance = pinch.distance;
					prevPinchMidX = pinch.midX;
					prevPinchMidY = pinch.midY;
				}
				lastMoveTimeMs = performance.now();
			}
		}

		function onPointerMove(event: PointerEvent): void {
			if (!activePointers.has(event.pointerId)) return;
			activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

			const now = performance.now();
			const viewport = size.current;
			const bounds = computeShelfCameraBounds(viewport, cameraState.z);

			if (activePointers.size >= 2) {
				const pinch = getPinchMetrics();
				if (pinch && prevPinchDistance > 0 && pinch.distance > 0) {
					hasUserZoomed = true;
					const distanceRatio = prevPinchDistance / pinch.distance;
					applyPinchZoom(cameraState, distanceRatio, bounds);

					const midDx = pinch.midX - prevPinchMidX;
					const midDy = pinch.midY - prevPinchMidY;
					const dtSeconds = (now - lastMoveTimeMs) / 1000;
					applyDragPan(cameraState, midDx, midDy, dtSeconds, viewport.height, bounds);
					cameraState.vx = 0;
					cameraState.vy = 0;
					syncCameraTransform();

					prevPinchDistance = pinch.distance;
					prevPinchMidX = pinch.midX;
					prevPinchMidY = pinch.midY;
					lastMoveTimeMs = now;
				}
				return;
			}

			if (event.pointerId !== primaryPointerId) return;

			if (!hasExceededDragThreshold) {
				const totalDist = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY);
				if (totalDist < SHELF_CAMERA_CONFIG.dragThresholdPx) {
					return;
				}
				hasExceededDragThreshold = true;
				lastPointerX = event.clientX;
				lastPointerY = event.clientY;
				lastMoveTimeMs = now;
				canvas.style.cursor = 'grabbing';
				return;
			}

			const dx = event.clientX - lastPointerX;
			const dy = event.clientY - lastPointerY;
			const dtSeconds = (now - lastMoveTimeMs) / 1000;

			applyDragPan(cameraState, dx, dy, dtSeconds, viewport.height, bounds);
			syncCameraTransform();

			lastPointerX = event.clientX;
			lastPointerY = event.clientY;
			lastMoveTimeMs = now;
		}

		function onPointerEnd(event: PointerEvent): void {
			if (!activePointers.has(event.pointerId)) return;
			activePointers.delete(event.pointerId);

			if (activePointers.size === 1) {
				// Smoothly hand off to the remaining single finger without jumping.
				const [remainingId, pos] = activePointers.entries().next().value!;
				primaryPointerId = remainingId;
				dragStartX = pos.x;
				dragStartY = pos.y;
				lastPointerX = pos.x;
				lastPointerY = pos.y;
				lastMoveTimeMs = performance.now();
				hasExceededDragThreshold = true;
				prevPinchDistance = 0;
				return;
			}

			if (activePointers.size === 0) {
				if (performance.now() - lastMoveTimeMs > SHELF_CAMERA_CONFIG.dragReleaseGraceMs) {
					cameraState.vx = 0;
					cameraState.vy = 0;
				}
				primaryPointerId = null;
				prevPinchDistance = 0;
				cameraState.isDragging = false;
				canvas.style.cursor = 'grab';
			}
		}

		function onWheel(event: WheelEvent): void {
			event.preventDefault();
			const viewport = size.current;
			const bounds = computeShelfCameraBounds(viewport, cameraState.z);
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
				event.ctrlKey
			);
		}

		canvas.addEventListener('pointerdown', onPointerDown);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerEnd);
		window.addEventListener('pointercancel', onPointerEnd);

		return () => {
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
		const moved = stepShelfCamera(cameraState, size.current, dt);
		if (moved) {
			syncCameraTransform();
		}
	});
</script>

<T.PerspectiveCamera
	makeDefault
	fov={SHELF_CAMERA_DEFAULTS.fov}
	near={SHELF_CAMERA_DEFAULTS.near}
	far={SHELF_CAMERA_DEFAULTS.far}
	position={[cameraState.x, cameraState.y, cameraState.z]}
	oncreate={(camera) => {
		cameraRef = camera;
		syncCameraTransform();
	}}
/>
