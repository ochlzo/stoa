<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import type { CanvasTexture, Group, PerspectiveCamera } from 'three';
	import { VOLUME_LAYOUT_CONSTANTS } from '#lib/catalog/layout.ts';
	import { getSpread, getVolumeReadingModel } from '#lib/catalog/reading.ts';
	import type { Volume } from '#lib/catalog/types.ts';
	import { PAGE_BLOCK_CLAY_COLOR, VOLUME_CLAY_COLORS } from '#lib/catalog/volumes.ts';
	import { createOpenPageSurfaceGeometry } from '#lib/components/scene/open-volume-geometry.ts';
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

	const { camera, size } = useThrelte();

	const openDims = $derived(
		computeOpenVolumeDimensions(volume.dimensions, volume.spineProfile, volume.bindingStyle)
	);
	const coverColor = $derived(VOLUME_CLAY_COLORS[volume.clayTone]);
	const readingModel = $derived(getVolumeReadingModel(volume));
	const activeSpread = $derived(getSpread(readingModel, getCurrentSpreadIndex()));
	const stackSplit = $derived(
		computePageStackSplit(openDims.totalPageThickness, activeSpread.progress)
	);
	const innerClearance = VOLUME_LAYOUT_CONSTANTS.innerClearance;
	const pageLift = READING_VOLUME_CONFIG.pageSurfaceLift;
	const creaseHalfGap = 0.0005;

	// Build and cleanly dispose the gently arched 3D Page surface geometries.
	const leftPageGeoBundle = $derived(
		createOpenPageSurfaceGeometry(
			openDims.pageWidth,
			openDims.pageHeight,
			'left',
			READING_VOLUME_CONFIG.pageGutterArch
		)
	);
	const rightPageGeoBundle = $derived(
		createOpenPageSurfaceGeometry(
			openDims.pageWidth,
			openDims.pageHeight,
			'right',
			READING_VOLUME_CONFIG.pageGutterArch
		)
	);

	$effect(() => {
		const left = leftPageGeoBundle;
		const right = rightPageGeoBundle;
		return () => {
			left.dispose();
			right.dispose();
		};
	});

	// Generate procedural clay placeholder CanvasTextures for the active Spread and
	// dispose previous textures immediately on Spread change or unmount (zero WebGL leaks).
	let leftTexture = $state<CanvasTexture | null>(null);
	let rightTexture = $state<CanvasTexture | null>(null);

	$effect(() => {
		const spread = activeSpread;
		const chapterCount = readingModel.chapters.length;
		const nextLeft = createClayPageTexture(spread.leftPage, spread, chapterCount);
		const nextRight = createClayPageTexture(spread.rightPage, spread, chapterCount);
		leftTexture = nextLeft;
		rightTexture = nextRight;

		return () => {
			nextLeft.dispose();
			nextRight.dispose();
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
			volume.bindingStyle
		);

		const step = stepReadingVolume(readingState, dt, readingPose.focusOffsetX);
		const openT = easeInOutCubic(readingState.openProgress);
		const pose = evaluateOpenVolumePose(readingState.openProgress, openDims);

		const targetX = activeCamera.position.x + readingState.currentFocusOffsetX;
		const x = inspectPose.center[0] + (targetX - inspectPose.center[0]) * openT + pose.spineShiftX;
		const y = inspectPose.center[1] + (readingPose.center[1] - inspectPose.center[1]) * openT;
		const z = inspectPose.center[2] + (readingPose.center[2] - inspectPose.center[2]) * openT;

		if (rootGroupRef) {
			rootGroupRef.position.set(x, y, z);
			rootGroupRef.rotation.set(pose.pitchX, 0, 0);
		}

		// Spine cradle sits cleanly behind the page stacks when open, and swings to the left edge when closed.
		const maxStackZ = Math.max(stackSplit.leftThickness, stackSplit.rightThickness);
		const closedSpineCenterZ = (stackSplit.leftThickness - stackSplit.rightThickness) / 2;
		const openSpineZ = -(maxStackZ + innerClearance + openDims.boardThickness / 2);
		if (spineGroupRef) {
			const spineX = (-openDims.boardThickness / 2) * (1 - openT);
			const spineZ = closedSpineCenterZ * (1 - openT) + openSpineZ * openT;
			spineGroupRef.position.set(spineX, 0, spineZ);
			spineGroupRef.rotation.set(0, (Math.PI / 2) * (1 - openT), 0);
		}

		if (leftHingeRef) {
			leftHingeRef.position.set(-creaseHalfGap * openT, 0, 0);
			leftHingeRef.rotation.set(0, pose.leftHingeAngle, 0);
		}

		if (rightHingeRef) {
			rightHingeRef.position.set(creaseHalfGap * openT, 0, 0);
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

		<!-- Left cover board + left page-stack half + left Clay Page surface (meeting at central crease) -->
		<T.Group
			name="open-left-half"
			oncreate={(group) => {
				leftHingeRef = group;
			}}
		>
			<!-- Left cover board (sits directly behind left page-stack half with hardcover overhang) -->
			<T.Mesh
				name="left-cover-board"
				position={[
					-openDims.boardWidth / 2,
					0,
					-(stackSplit.leftThickness + innerClearance + openDims.boardThickness / 2)
				]}
			>
				<T.BoxGeometry args={[openDims.boardWidth, openDims.boardHeight, openDims.boardThickness]} />
				<T.MeshStandardMaterial color={coverColor} roughness={0.9} metalness={0} />
			</T.Mesh>

			<!-- Left page-stack half (extends behind the reading plane; thickness grows with reading progress) -->
			<T.Mesh
				name="left-page-stack"
				position={[-openDims.pageWidth / 2, 0, -stackSplit.leftThickness / 2]}
			>
				<T.BoxGeometry args={[openDims.pageWidth, openDims.pageHeight, stackSplit.leftThickness]} />
				<T.MeshStandardMaterial color={PAGE_BLOCK_CLAY_COLOR} roughness={0.95} metalness={0} />
			</T.Mesh>

			<!-- Left active Page surface (arched clay CanvasTexture, lifted cleanly above stack) -->
			<T.Mesh
				name="left-page-surface"
				geometry={leftPageGeoBundle.geometry}
				position={[0, 0, pageLift]}
			>
				<T.MeshStandardMaterial
					map={leftTexture}
					color="#ffffff"
					roughness={0.94}
					metalness={0}
				/>
			</T.Mesh>
		</T.Group>

		<!-- Right cover board + right page-stack half + right Clay Page surface (meeting at central crease) -->
		<T.Group
			name="open-right-half"
			oncreate={(group) => {
				rightHingeRef = group;
			}}
		>
			<!-- Right cover board (sits directly behind right page-stack half with hardcover overhang) -->
			<T.Mesh
				name="right-cover-board"
				position={[
					openDims.boardWidth / 2,
					0,
					-(stackSplit.rightThickness + innerClearance + openDims.boardThickness / 2)
				]}
			>
				<T.BoxGeometry args={[openDims.boardWidth, openDims.boardHeight, openDims.boardThickness]} />
				<T.MeshStandardMaterial color={coverColor} roughness={0.9} metalness={0} />
			</T.Mesh>

			<!-- Right page-stack half (extends behind the reading plane; thickness shrinks with reading progress) -->
			<T.Mesh
				name="right-page-stack"
				position={[openDims.pageWidth / 2, 0, -stackSplit.rightThickness / 2]}
			>
				<T.BoxGeometry args={[openDims.pageWidth, openDims.pageHeight, stackSplit.rightThickness]} />
				<T.MeshStandardMaterial color={PAGE_BLOCK_CLAY_COLOR} roughness={0.95} metalness={0} />
			</T.Mesh>

			<!-- Right active Page surface (arched clay CanvasTexture, lifted cleanly above stack) -->
			<T.Mesh
				name="right-page-surface"
				geometry={rightPageGeoBundle.geometry}
				position={[0, 0, pageLift]}
			>
				<T.MeshStandardMaterial
					map={rightTexture}
					color="#ffffff"
					roughness={0.94}
					metalness={0}
				/>
			</T.Mesh>
		</T.Group>
	</T.Group>
{/if}
