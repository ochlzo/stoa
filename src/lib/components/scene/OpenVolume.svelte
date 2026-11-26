<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import type { Group, PerspectiveCamera } from 'three';
	import { getSpread, getVolumeReadingModel } from '#lib/catalog/reading.ts';
	import type { Volume } from '#lib/catalog/types.ts';
	import { VOLUME_CLAY_COLORS } from '#lib/catalog/volumes.ts';
	import { createPageStackGeometry } from '#lib/components/scene/open-volume-geometry.ts';
	import { computeInspectPose } from '#lib/physics/inspect-volume.ts';
	import {
		READING_VOLUME_CONFIG,
		applyReadingWheelZoom,
		computeOpenVolumeDimensions,
		computePageStackSplit,
		computeReadingPose,
		createReadingTiltGestures,
		createReadingVolumeState,
		evaluateOpenVolumePose,
		startReadingClose,
		startReadingOpen,
		stepReadingVolume
	} from '#lib/physics/reading-volume.ts';
	import { clampDelta, getShelfCameraFov } from '#lib/physics/shelf-camera.ts';
	import {
		completeCloseToInspect,
		completeCloseToShelf,
		completeReadingOpen,
		getCurrentSpreadIndex,
		getFocusedPageSide,
		getReadingPhase,
		getReadingUnfolding
	} from '#lib/state/library.svelte.ts';
	import { createClayPageTexture } from '#lib/textures/page-clay-texture.ts';

	interface Props {
		volume: Volume;
	}

	let { volume }: Props = $props();

	const { camera, canvas, size } = useThrelte();

	const openDims = $derived(
		computeOpenVolumeDimensions(volume.dimensions, volume.spineProfile, volume.bindingStyle)
	);
	const coverColor = $derived(VOLUME_CLAY_COLORS[volume.clayTone]);
	const readingModel = $derived(getVolumeReadingModel(volume));
	const activeSpread = $derived(getSpread(readingModel, getCurrentSpreadIndex()));
	const stackSplit = $derived(
		computePageStackSplit(openDims.totalPageThickness, activeSpread.progress)
	);
	const gutterDepth = $derived(Math.min(stackSplit.leftThickness, stackSplit.rightThickness));
	let unfold = $state(0);
	const halves = $derived.by(() => {
		return (['left', 'right'] as const).map((side) => {
			const left = side === 'left';
			const thickness = left ? stackSplit.leftThickness : stackSplit.rightThickness;
			const page = left ? activeSpread.leftPage : activeSpread.rightPage;
			const texture = createClayPageTexture(page, readingModel.chapters.length);
			const stack = createPageStackGeometry(openDims.pageWidth, openDims.pageHeight,
				thickness, gutterDepth, READING_VOLUME_CONFIG.pageGutterArch, side, texture);
			return { side, sign: left ? -1 : 1, thickness, texture, stack };
		});
	});

	$effect(() => {
		const current = halves;
		return () => {
			for (const half of current) {
				half.stack.dispose();
				half.texture.dispose();
			}
		};
	});

	const readingState = createReadingVolumeState();
	let rootGroupRef: Group | undefined;
	let spineGroupRef: Group | undefined;
	let leftHingeRef: Group | undefined;
	let rightHingeRef: Group | undefined;

	// React to Reading Mode unfolding / closing transitions.
	$effect(() => {
		const phase = getReadingPhase();
		const unfolding = getReadingUnfolding();
		if (phase === 'opening' && unfolding && readingState.phase === 'idle') {
			startReadingOpen(readingState, -Math.PI / 2, 0, 0);
			readingState.alignProgress = 1;
		} else if (
			phase === 'closing-to-inspect' &&
			readingState.phase !== 'closing-to-inspect' &&
			readingState.phase !== 'idle'
		) {
			startReadingClose(readingState, 'inspect');
		} else if (
			phase === 'closing-to-shelf' &&
			readingState.phase !== 'closing-to-shelf' &&
			readingState.phase !== 'idle'
		) {
			startReadingClose(readingState, 'shelf');
		}
	});

	// Attach subtle spring-back drag-to-tilt gestures while actively reading.
	$effect(() => {
		if (getReadingPhase() !== 'reading') return;
		const tiltGestures = createReadingTiltGestures(readingState);

		function onPointerDown(event: PointerEvent): void {
			if (event.pointerType === 'mouse' && event.button !== 0) return;
			tiltGestures.start(event.pointerId, event.clientX, event.clientY);
		}

		function onPointerMove(event: PointerEvent): void {
			const moved = tiltGestures.move(event.pointerId, event.clientX, event.clientY);
			if (moved) {
				canvas.style.cursor = 'grabbing';
			}
		}

		function onPointerEnd(event: PointerEvent): void {
			tiltGestures.end(event.pointerId);
			if (!readingState.isTilting) {
				canvas.style.cursor = 'default';
			}
		}

		function onWheel(event: WheelEvent): void {
			event.preventDefault();
			applyReadingWheelZoom(readingState, event.deltaY, event.deltaMode);
		}

		canvas.addEventListener('pointerdown', onPointerDown);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerEnd);
		window.addEventListener('pointercancel', onPointerEnd);

		return () => {
			tiltGestures.reset();
			canvas.style.cursor = 'default';
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('wheel', onWheel);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerEnd);
			window.removeEventListener('pointercancel', onPointerEnd);
		};
	});

	function easeInOutCubic(t: number): number {
		const c = Math.max(0, Math.min(1, t));
		return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
	}

	useTask((delta) => {
		const dt = clampDelta(delta);
		if (!getReadingUnfolding()) return;

		const activeCamera = camera.current as PerspectiveCamera;
		const viewport = size.current;
		const fov = activeCamera.fov || getShelfCameraFov(viewport);
		const camPos: readonly [number, number, number] = [
			activeCamera.position.x,
			activeCamera.position.y,
			activeCamera.position.z
		];

		const inspectPose = computeInspectPose(camPos, fov, viewport, volume.dimensions);
		const readingPose = computeReadingPose(
			camPos,
			fov,
			viewport,
			volume.dimensions,
			getFocusedPageSide(),
			volume.spineProfile,
			volume.bindingStyle,
			READING_VOLUME_CONFIG,
			readingState.zoom
		);

		const step = stepReadingVolume(readingState, dt, readingPose.focusOffsetX);
		const openT = easeInOutCubic(readingState.openProgress);
		unfold = openT;
		const pose = evaluateOpenVolumePose(readingState.openProgress, openDims);

		const targetX = activeCamera.position.x + readingState.currentFocusOffsetX;
		const x = inspectPose.center[0] + (targetX - inspectPose.center[0]) * openT + pose.spineShiftX;
		const y = inspectPose.center[1] + (readingPose.center[1] - inspectPose.center[1]) * openT;
		const z = inspectPose.center[2] + (readingPose.center[2] - inspectPose.center[2]) * openT;

		if (rootGroupRef) {
			rootGroupRef.position.set(x, y, z);
			rootGroupRef.rotation.order = 'XYZ';
			rootGroupRef.rotation.set(pose.pitchX + readingState.tiltPitch, readingState.tiltYaw, 0);
		}

		// Spine cradle sits cleanly behind the page stacks when open, and swings to the left edge when closed.
		const closedSpineCenterZ = (stackSplit.leftThickness - stackSplit.rightThickness) / 2;
		const openSpineZ = -(gutterDepth + openDims.boardThickness / 2);
		if (spineGroupRef) {
			const spineX = (-openDims.boardThickness / 2) * (1 - openT);
			const spineZ = closedSpineCenterZ * (1 - openT) + openSpineZ * openT;
			spineGroupRef.scale.x = 1 - openT * (1 - 2 * openDims.boardThickness / openDims.spineWidth);
			spineGroupRef.position.set(spineX, 0, spineZ);
			spineGroupRef.rotation.set(0, (Math.PI / 2) * (1 - openT), 0);
		}

		if (leftHingeRef) {
			leftHingeRef.rotation.set(0, pose.leftHingeAngle, 0);
		}

		if (rightHingeRef) {
			rightHingeRef.rotation.set(0, pose.rightHingeAngle, 0);
		}

		if (step.finishedOpening) {
			completeReadingOpen();
		} else if (step.finishedClosingToInspect) {
			completeCloseToInspect();
		} else if (step.finishedClosingToShelf) {
			completeCloseToShelf();
		}
	});
</script>

{#if getReadingUnfolding()}
	<T.Group
		name={`open-volume-${volume.id}`}
		oncreate={(group) => {
			rootGroupRef = group;
		}}
	>
		<!-- Spine cradle connecting the left and right cover boards behind the gutter -->
		<T.Group
			name="open-spine"
			oncreate={(group) => {
				spineGroupRef = group;
			}}
		>
			<T.Mesh>
				<T.BoxGeometry args={[openDims.spineWidth, openDims.boardHeight, openDims.boardThickness]} />
				<T.MeshStandardMaterial color={coverColor} roughness={0.9} metalness={0} />
			</T.Mesh>
		</T.Group>

		{#each halves as half (half)}
			<T.Group
				name={'open-' + half.side + '-half'}
				oncreate={(group) => {
					if (half.side === 'left') leftHingeRef = group;
					else rightHingeRef = group;
					const pose = evaluateOpenVolumePose(readingState.openProgress, openDims);
					group.rotation.y = half.side === 'left' ? pose.leftHingeAngle : pose.rightHingeAngle;
				}}
			>
				<T.Mesh
					name={half.side + '-cover-board'}
					position={[half.sign * openDims.boardWidth / 2, 0,
						-(half.thickness * (1 - unfold) + gutterDepth * unfold + openDims.boardThickness / 2)]}
				>
					<T.BoxGeometry args={[openDims.boardWidth, openDims.boardHeight, openDims.boardThickness]} />
					<T.MeshStandardMaterial color={coverColor} roughness={0.9} />
				</T.Mesh>
				<T.Mesh
					name={half.side + '-page-stack'}
					args={[half.stack.geometry, half.stack.materials]}
					morphTargetInfluences={[unfold]}
				/>
			</T.Group>
		{/each}
	</T.Group>
{/if}
