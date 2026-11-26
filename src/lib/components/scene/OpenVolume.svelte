<script lang="ts">
	import { setStampFace, type VolumeStamps } from '#lib/components/scene/volume-stamp-geometry.ts';
	import type { StampFace } from '#lib/textures/volume-stamp.ts';
	import type { VolumeFinishes } from '#lib/textures/volume-finishes.ts';
	import { T, useTask, useThrelte } from '@threlte/core';
	import type { Group, PerspectiveCamera } from 'three';
	import { getSpread, getVolumeReadingModel } from '#lib/catalog/reading.ts';
	import { isClayMode } from '#lib/state/lookdev.svelte.ts';
	import type { Volume } from '#lib/catalog/types.ts';
	import { createPageStackGeometry } from '#lib/components/scene/open-volume-geometry.ts';
	import { createLeafGeometry } from '#lib/components/scene/leaf-geometry.ts';
	import { attachOpenVolumeGestures } from '#lib/components/scene/open-volume-gestures.ts';
	import { stepLeafTurn } from '#lib/physics/leaf-turn.ts';
	import { computeInspectPose } from '#lib/physics/inspect-volume.ts';
	import {
		READING_VOLUME_CONFIG,
		computeOpenVolumeDimensions,
		computePageStackSplit,
		computeReadingPose,
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
		finishLeafTurn,
		getCurrentSpreadIndex,
		getFocusedPageSide,
		getLeafTurn,
		getReadingPhase,
		getReadingUnfolding,
		setFocusedPageSide,
		startLeafTurn,
		toggleReadingHud
	} from '#lib/state/library.svelte.ts';
	import { createReadingPagePainter } from '#lib/textures/reading-page-texture.ts';

	interface Props {
		stamps: VolumeStamps;
		finishes: VolumeFinishes;
		volume: Volume;
	}

	let { volume, finishes, stamps }: Props = $props();

	const { camera, canvas, size } = useThrelte();

	const openDims = $derived(
		computeOpenVolumeDimensions(volume.dimensions, volume.spineProfile, volume.bindingStyle)
	);
	const cover = $derived(finishes.cover(volume, isClayMode()));
	const { paintPage, stepIllustrations } = createReadingPagePainter();
	const volumeDesign = $derived(volume.kind === 'readable' ? volume.design : undefined);
	const readingModel = $derived(getVolumeReadingModel(volume));
	const activeSpread = $derived(getSpread(readingModel, getCurrentSpreadIndex()));
	const stackSplit = $derived(
		computePageStackSplit(openDims.totalPageThickness, activeSpread.progress)
	);
	const gutterDepth = $derived(Math.min(stackSplit.leftThickness, stackSplit.rightThickness));
	let unfold = $state(0);
	const turn = $derived(getLeafTurn());
	const adjacent = $derived(turn ? getSpread(readingModel, activeSpread.index + turn.direction) : null);
	const leaf = $derived.by(() => {
		if (!turn || !adjacent) return null;
		const forward = turn.direction === 1;
		return createLeafGeometry({
			width: openDims.pageWidth,
			height: openDims.pageHeight,
			leftThickness: stackSplit.leftThickness,
			rightThickness: stackSplit.rightThickness,
			turn,
			clay: isClayMode(),
			frontTexture: paintPage(
				forward ? activeSpread.rightPage : activeSpread.leftPage,
				readingModel.chapters.length,
				isClayMode(),
				volumeDesign
			),
			backTexture: paintPage(
				forward ? adjacent.leftPage : adjacent.rightPage,
				readingModel.chapters.length,
				isClayMode(),
				volumeDesign
			)
		});
	});
	$effect(() => {
		const current = leaf;
		return () => current?.dispose();
	});
	const halves = $derived.by(() => {
		return (['left', 'right'] as const).map((side) => {
			const left = side === 'left';
			const thickness = left ? stackSplit.leftThickness : stackSplit.rightThickness;
			const exposed = adjacent && (left ? turn?.direction === -1 : turn?.direction === 1) ? adjacent : activeSpread;
			const page = left ? exposed.leftPage : exposed.rightPage;
			const texture = paintPage(page, readingModel.chapters.length, isClayMode(), volumeDesign);
			const stack = createPageStackGeometry({
				width: openDims.pageWidth,
				height: openDims.pageHeight,
				thickness,
				gutterDepth,
				arch: READING_VOLUME_CONFIG.pageGutterArch,
				side,
				texture,
				edgeFinish: finishes.paper(isClayMode()),
				clay: isClayMode()
			});
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
	let panOffsetRatio = 0;
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

	// Delegate Reading Mode pointer, Leaf curl, gutter pan, tilt, and zoom gestures to helper.
	$effect(() => {
		if (getReadingPhase() !== 'reading') return;
		return attachOpenVolumeGestures({
			canvas,
			getCamera: () => camera.current,
			getRootGroup: () => rootGroupRef,
			getPageWidth: () => openDims.pageWidth,
			readingState,
			wheelTurnsPages: readingModel.wheelTurnsPages,
			getLeafTurn,
			startLeafTurn,
			getFocusedPageSide,
			setFocusedPageSide,
			onPanOffsetChange: (ratio) => {
				panOffsetRatio = ratio;
			},
			onToggleHud: toggleReadingHud
		});
	});

	function easeInOutCubic(t: number): number {
		const c = Math.max(0, Math.min(1, t));
		return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
	}

	useTask((delta) => {
		const dt = clampDelta(delta);
		if (!getReadingUnfolding()) return;
		stepIllustrations(dt);

		if (turn && leaf) {
			if (stepLeafTurn(turn, dt)) finishLeafTurn();
			else leaf.update();
		}

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

		const maxFocusOffset = openDims.boardWidth * 0.5;
		const targetFocusOffsetX = readingPose.isMobileSinglePage
			? Math.max(
					-maxFocusOffset,
					Math.min(maxFocusOffset, readingPose.focusOffsetX + panOffsetRatio * openDims.boardWidth)
				)
			: readingPose.focusOffsetX;

		if (readingPose.isMobileSinglePage && panOffsetRatio !== 0) {
			readingState.currentFocusOffsetX = targetFocusOffsetX;
		}

		const step = stepReadingVolume(readingState, dt, targetFocusOffsetX);
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
			spineGroupRef.scale.x = 1 - openT * (1 - (2 * openDims.boardThickness) / openDims.spineWidth);
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

{#snippet binding(face: StampFace)}
	{#if isClayMode()}
		<T.MeshStandardMaterial {...cover} />
	{:else}
		<T is={stamps.get(volume, face)} dispose={false} />
	{/if}
{/snippet}

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
				<T.BoxGeometry oncreate={(geometry) => setStampFace(geometry, '-z')} args={[openDims.spineWidth, openDims.boardHeight, openDims.boardThickness]} />
				{@render binding('spine')}
			</T.Mesh>
		</T.Group>

		{#if leaf}
			<T.Mesh name="turning-leaf" args={[leaf.geometry, leaf.materials]} frustumCulled={false} />
		{/if}

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
					position={[
						(half.sign * openDims.boardWidth) / 2,
						0,
						-(half.thickness * (1 - unfold) + gutterDepth * unfold + openDims.boardThickness / 2)
					]}
				>
					<T.BoxGeometry oncreate={(geometry) => setStampFace(geometry, '-z')} args={[openDims.boardWidth, openDims.boardHeight, openDims.boardThickness]} />
					{@render binding(half.side === 'left' ? 'front' : 'back')}
				</T.Mesh>
				<T.Mesh
					name={half.side + '-page-stack'}
					userData={{ pageSide: half.side }}
					args={[half.stack.geometry, half.stack.materials]}
					morphTargetInfluences={[unfold]}
				/>
			</T.Group>
		{/each}
	</T.Group>
{/if}
