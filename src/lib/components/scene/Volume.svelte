<script lang="ts">
	import { setStampFace, type VolumeStamps } from '#lib/components/scene/volume-stamp-geometry.ts';
	import type { StampFace } from '#lib/textures/volume-stamp.ts';
	import type { VolumeFinishes } from '#lib/textures/volume-finishes.ts';
	import { T, useTask, useThrelte } from '@threlte/core';
	import type { IntersectionEvent } from '@threlte/extras';
	import { Vector3, type Group, type Mesh, type MeshBasicMaterial, type PerspectiveCamera } from 'three';
	import { getVolumeGeometryParts } from '#lib/catalog/layout.ts';
	import type { PlacedVolume } from '#lib/catalog/types.ts';
	import { createSpineGeometry } from '#lib/components/scene/spine-geometry.ts';
	import {
		INSPECT_VOLUME_CONFIG,
		applyInspectWheelZoom,
		computeInspectPose,
		computeVolumeShelfCenter,
		createInspectOrbitGestures,
		createInspectVolumeState,
		evaluateInspectTransform,
		normalizeAngle,
		startInspectEnter,
		startInspectReturn,
		stepInspectVolume
	} from '#lib/physics/inspect-volume.ts';
	import { READING_VOLUME_CONFIG, computeReadingPose } from '#lib/physics/reading-volume.ts';
	import { SHELF_CAMERA_CONFIG, clampDelta, getShelfCameraFov } from '#lib/physics/shelf-camera.ts';
	import {
		getShelfDominoPose,
		type ShelfDominoSimulation
	} from '#lib/physics/shelf-domino.ts';
	import { createVolumePeekState, stepVolumePeek } from '#lib/physics/volume-peek.ts';
	import {
		canSelectVolume,
		clearPeek,
		completeReturnToShelf,
		enterInspectMode,
		getFocusedPageSide,
		getInspectPhase,
		getPeekSource,
		getReadingPhase,
		getReadingUnfolding,
		getSceneMode,
		requestCloseToInspect,
		requestReturnToShelf,
		setInspectOrbiting,
		setInspectPhase,
		setInspectShelfCleared,
		setPeekedVolume,
		setReadingUnfolding,
		updatePeekAnchor
	} from '#lib/state/library.svelte.ts';
	import { LOOKDEV_BACKDROP } from '#lib/catalog/lookdev.ts';
	import { stepBackdropOpacity } from '#lib/physics/study-lighting.ts';
	import { isClayMode } from '#lib/state/lookdev.svelte.ts';

	interface Props {
		stamps: VolumeStamps;
		finishes: VolumeFinishes;
		placed: PlacedVolume;
		isPeeked?: boolean;
		isInspected?: boolean;
		dominoSim?: ShelfDominoSimulation | null;
	}

	let {
		stamps,
		finishes,
		placed,
		isPeeked = false,
		isInspected = false,
		dominoSim = null
	}: Props = $props();

	const { camera, canvas, size } = useThrelte();

	const parts = $derived(
		getVolumeGeometryParts(
			placed.volume.dimensions,
			placed.volume.spineProfile,
			placed.volume.bindingStyle
		)
	);
	const curvedSpine = $derived(parts.spine.shape === 'flat' ? null :
		createSpineGeometry(parts.spine.radius, parts.spine.depth, parts.frontBoard.size[0]));
	$effect(() => {
		const bundle = curvedSpine;
		return () => bundle?.dispose();
	});
	const cover = $derived(finishes.cover(placed.volume, isClayMode()));
	const bandFinish = $derived(finishes.cover(placed.volume, isClayMode(), 0.86));
	const paper = $derived(finishes.paper(isClayMode()));
	const headbandFinish = $derived(finishes.headband(isClayMode()));
	const highlightReadable = $derived(isPeeked && !isInspected && placed.volume.kind === 'readable');
	const coverEmissive = $derived(highlightReadable ? '#f4ede0' : '#000000');
	const coverEmissiveIntensity = $derived(highlightReadable ? 0.16 : 0);

	// Exact world-space geometric center of this Volume when seated flush in its Shelf slot.
	const shelfCenter = $derived(computeVolumeShelfCenter(placed, 0));
	const halfHeight = $derived(placed.volume.dimensions.height / 2);
	const halfDepth = $derived(placed.volume.dimensions.depth / 2);

	const peekState = createVolumePeekState();
	const inspectState = createInspectVolumeState();
	const anchorPoint = new Vector3();
	let motionGroupRef: Group | undefined;
	let peekGroupRef = $state<Group | undefined>(undefined);
	let backdropMeshRef: Mesh | undefined;
	let backdropMaterialRef: MeshBasicMaterial | undefined;
	const inspectBackdrop = $derived(
		isClayMode() ? INSPECT_VOLUME_CONFIG.backdropMaxOpacity : LOOKDEV_BACKDROP.inspectOpacity
	);
	const readingBackdrop = $derived(
		isClayMode() ? READING_VOLUME_CONFIG.backdropOpacity : LOOKDEV_BACKDROP.readingOpacity
	);
	const backdropColor = $derived(
		isClayMode() ? LOOKDEV_BACKDROP.clayColor : LOOKDEV_BACKDROP.lookdevColor
	);
	const shadowsEnabled = $derived(!isClayMode());

	$effect(() => {
		const group = peekGroupRef;
		const enabled = shadowsEnabled;
		if (!group) return;
		group.traverse((obj) => {
			if ('isMesh' in obj && (obj as Mesh).isMesh) {
				obj.castShadow = enabled;
				obj.receiveShadow = enabled;
			}
		});
	});
	let lastPointerType = 'mouse';
	let readingAlignProgress = 0;
	let readingAlignStartYaw = -Math.PI / 2;
	let readingAlignStartPitch = 0;
	let readingAlignStartZoom = 1;

	const hideClosedForReading = $derived(
		isInspected && getSceneMode() === 'reading' && getReadingUnfolding()
	);

	function applyRestingTransform(): void {
		if (!motionGroupRef) return;
		motionGroupRef.position.set(shelfCenter[0], shelfCenter[1], shelfCenter[2]);
		motionGroupRef.rotation.order = 'XYZ';
		motionGroupRef.rotation.set(0, 0, placed.rotationZ);
	}

	// Capture starting orbit angles and zoom when transitioning from Inspect Mode into Reading Mode.
	$effect(() => {
		if (isInspected && getSceneMode() === 'reading' && getReadingPhase() === 'opening' && !getReadingUnfolding()) {
			readingAlignProgress = 0;
			readingAlignStartYaw = normalizeAngle(inspectState.yaw);
			readingAlignStartPitch = inspectState.pitch;
			readingAlignStartZoom = inspectState.zoom;
			inspectState.targetZoom = 1;
			inspectState.yawVelocity = 0;
			inspectState.pitchVelocity = 0;
			inspectState.isDragging = false;
		}
	});

	// React to Inspect Mode phase changes (entering / returning) when this Volume is inspected.
	$effect(() => {
		if (!isInspected) return;
		const phase = getInspectPhase();
		if (phase === 'entering' && inspectState.phase === 'idle') {
			startInspectEnter(inspectState, peekState.offset);
			peekState.offset = 0;
			peekState.velocity = 0;
			if (peekGroupRef) {
				peekGroupRef.position.z = 0;
			}
		} else if (phase === 'returning' && inspectState.phase !== 'returning' && inspectState.phase !== 'idle') {
			startInspectReturn(inspectState);
		}
	});

	// Attach 3D orbit pointer gestures while this Volume is active in Inspect Mode.
	$effect(() => {
		if (!isInspected || getSceneMode() !== 'inspect') return;
		const gestures = createInspectOrbitGestures(inspectState);

		function onPointerDown(event: PointerEvent): void {
			if (event.pointerType === 'mouse' && event.button !== 0) return;
			if (inspectState.phase !== 'inspecting' && inspectState.phase !== 'entering') return;
			gestures.start(event.pointerId, event.clientX, event.clientY, event.timeStamp);
		}

		function onPointerMove(event: PointerEvent): void {
			const moved = gestures.move(event.pointerId, event.clientX, event.clientY, event.timeStamp);
			if (moved) {
				setInspectOrbiting(true);
			}
		}

		function onPointerEnd(event: PointerEvent): void {
			gestures.end(event.pointerId, event.timeStamp, event.type === 'pointercancel');
			if (!inspectState.isDragging) {
				setInspectOrbiting(false);
			}
		}

		function onWheel(event: WheelEvent): void {
			if (inspectState.phase !== 'inspecting' && inspectState.phase !== 'entering') return;
			event.preventDefault();
			applyInspectWheelZoom(inspectState, event.deltaY, event.deltaMode);
		}

		canvas.addEventListener('pointerdown', onPointerDown);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerEnd);
		window.addEventListener('pointercancel', onPointerEnd);

		return () => {
			gestures.reset();
			setInspectOrbiting(false);
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('wheel', onWheel);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerEnd);
			window.removeEventListener('pointercancel', onPointerEnd);
		};
	});

	function projectPeekAnchor(): void {
		if (!peekGroupRef) return;
		const activeCamera = camera.current;
		const viewport = size.current;
		anchorPoint.set(0, placed.volume.dimensions.height + 0.016, 0);
		peekGroupRef.localToWorld(anchorPoint);
		anchorPoint.project(activeCamera);
		const visible = anchorPoint.z >= -1 && anchorPoint.z <= 1;
		const screenX = (anchorPoint.x * 0.5 + 0.5) * viewport.width;
		const screenY = (-anchorPoint.y * 0.5 + 0.5) * viewport.height;
		updatePeekAnchor(placed.volume, screenX, screenY, visible);
	}

	useTask((delta) => {
		const dt = clampDelta(delta);

		if (isInspected || inspectState.phase !== 'idle') {
			const activeCamera = camera.current as PerspectiveCamera;
			const viewport = size.current;
			const fov = activeCamera.fov || getShelfCameraFov(viewport);
			const camPos: readonly [number, number, number] = [
				activeCamera.position.x,
				activeCamera.position.y,
				activeCamera.position.z
			];
			const pose = computeInspectPose(
				camPos,
				fov,
				viewport,
				placed.volume.dimensions,
				INSPECT_VOLUME_CONFIG,
				inspectState.zoom
			);

			if (isInspected && getSceneMode() === 'reading') {
				const readingPose = computeReadingPose(
					camPos,
					fov,
					viewport,
					placed.volume.dimensions,
					getFocusedPageSide(),
					placed.volume.spineProfile,
					placed.volume.bindingStyle
				);

				if (!getReadingUnfolding()) {
					// Smoothly align the closed Volume to front-cover-facing (-π/2 yaw, 0 pitch, 1.0 zoom) before unfolding.
					readingAlignProgress = Math.min(
						1,
						readingAlignProgress + dt / Math.max(0.05, READING_VOLUME_CONFIG.alignDuration)
					);
					const t =
						readingAlignProgress < 0.5
							? 4 * readingAlignProgress * readingAlignProgress * readingAlignProgress
							: 1 - Math.pow(-2 * readingAlignProgress + 2, 3) / 2;
					const targetYaw = -Math.PI / 2;
					const deltaYaw = normalizeAngle(targetYaw - readingAlignStartYaw);
					inspectState.yaw = readingAlignStartYaw + deltaYaw * t;
					inspectState.pitch = readingAlignStartPitch * (1 - t);
					inspectState.zoom = readingAlignStartZoom + (1 - readingAlignStartZoom) * t;
					inspectState.progress = 1;
					const alignedPose = computeInspectPose(
						camPos,
						fov,
						viewport,
						placed.volume.dimensions,
						INSPECT_VOLUME_CONFIG,
						inspectState.zoom
					);

					if (motionGroupRef) {
						motionGroupRef.position.set(
							alignedPose.center[0],
							alignedPose.center[1],
							alignedPose.center[2]
						);
						motionGroupRef.rotation.order = 'XYZ';
						motionGroupRef.rotation.set(inspectState.pitch, inspectState.yaw, 0);
					}
					if (backdropMeshRef) {
						backdropMeshRef.position.set(
							activeCamera.position.x,
							activeCamera.position.y,
							pose.backdropZ + (readingPose.backdropZ - pose.backdropZ) * t
						);
						backdropMeshRef.scale.set(
							pose.backdropWidth + (readingPose.backdropWidth - pose.backdropWidth) * t,
							pose.backdropHeight + (readingPose.backdropHeight - pose.backdropHeight) * t,
							1
						);
					}
					if (backdropMaterialRef) {
						backdropMaterialRef.opacity =
							inspectBackdrop +
							(readingBackdrop - inspectBackdrop) *
								t;
					}

					if (readingAlignProgress >= 1) {
						inspectState.yaw = targetYaw;
						inspectState.pitch = 0;
						setReadingUnfolding(true);
					}
				} else {
					if (backdropMeshRef) {
						backdropMeshRef.position.set(
							activeCamera.position.x,
							activeCamera.position.y,
							readingPose.backdropZ
						);
						backdropMeshRef.scale.set(readingPose.backdropWidth, readingPose.backdropHeight, 1);
					}
					if (backdropMaterialRef) {
						const target = getReadingPhase().startsWith('closing') ? inspectBackdrop : readingBackdrop;
						backdropMaterialRef.opacity = stepBackdropOpacity(backdropMaterialRef.opacity, target, dt);
					}
				}
				return;
			}

			const step = stepInspectVolume(inspectState, dt);
			if (step.clearedShelf) {
				setInspectShelfCleared(true);
			}
			if (step.enteredInspect) {
				setInspectPhase('inspecting');
			}

			const transform = evaluateInspectTransform(inspectState, placed, pose.center);

			if (motionGroupRef) {
				motionGroupRef.position.set(
					transform.position[0],
					transform.position[1],
					transform.position[2]
				);
				motionGroupRef.rotation.order = 'XYZ';
				motionGroupRef.rotation.set(
					transform.rotation[0],
					transform.rotation[1],
					transform.rotation[2]
				);
			}

			if (backdropMeshRef) {
				backdropMeshRef.position.set(activeCamera.position.x, activeCamera.position.y, pose.backdropZ);
				backdropMeshRef.scale.set(pose.backdropWidth, pose.backdropHeight, 1);
			}
			if (backdropMaterialRef) {
				backdropMaterialRef.opacity = transform.backdropOpacity * inspectBackdrop / INSPECT_VOLUME_CONFIG.backdropMaxOpacity;
			}

			if (step.completedReturn) {
				applyRestingTransform();
				completeReturnToShelf();
			}
			return;
		}

		if (dominoSim && motionGroupRef) {
			const dominoPose = getShelfDominoPose(dominoSim, placed.volume.id);
			if (dominoPose) {
				motionGroupRef.position.set(dominoPose.centerX, dominoPose.centerY, dominoPose.centerZ);
				motionGroupRef.rotation.order = 'XYZ';
				motionGroupRef.rotation.set(0, 0, dominoPose.angle);
			}
		}

		const moved = stepVolumePeek(peekState, isPeeked, dt);
		if (moved && peekGroupRef) {
			peekGroupRef.position.z = peekState.offset;
		}
		if (isPeeked) {
			projectPeekAnchor();
		}
	});

	function onPointerDown(event: IntersectionEvent<PointerEvent>): void {
		lastPointerType = event.nativeEvent.pointerType;
	}

	function onPointerEnter(event: IntersectionEvent<PointerEvent>): void {
		if (getSceneMode() !== 'shelf') return;
		if (event.nativeEvent.pointerType === 'touch') return;
		event.stopPropagation();
		setPeekedVolume(placed.volume, 'hover');
	}

	function onPointerLeave(event: IntersectionEvent<PointerEvent>): void {
		if (getSceneMode() !== 'shelf') return;
		if (event.nativeEvent.pointerType === 'touch') return;
		event.stopPropagation();
		clearPeek(placed.volume.id);
	}

	function onClick(event: IntersectionEvent<MouseEvent>): void {
		if (event.delta > SHELF_CAMERA_CONFIG.dragThresholdPx) return;
		event.stopPropagation();

		if (isInspected) {
			return;
		}
		if (getSceneMode() !== 'shelf') {
			return;
		}

		// Touch requires first-tap Peek, second-tap Inspect; desktop enters Inspect directly on click.
		if (lastPointerType === 'touch' && !isPeeked) {
			setPeekedVolume(placed.volume, 'tap');
			return;
		}

		if (!canSelectVolume(placed.volume)) {
			if (!isPeeked) {
				setPeekedVolume(placed.volume, 'tap');
			}
			return;
		}

		enterInspectMode(placed.volume);
	}

	function onPointerMissed(): void {
		if (getSceneMode() !== 'shelf') return;
		if (isPeeked && getPeekSource() === 'tap') {
			clearPeek(placed.volume.id);
		}
	}

	function onBackdropClick(event: IntersectionEvent<MouseEvent>): void {
		if (event.delta > INSPECT_VOLUME_CONFIG.dragThresholdPx) return;
		event.stopPropagation();
		if (getSceneMode() === 'reading') {
			requestCloseToInspect();
			return;
		}
		requestReturnToShelf();
	}
</script>

{#snippet binding(face: StampFace)}
	{#if !isClayMode() && (face === 'spine' || placed.volume.kind === 'readable')}
		<T is={stamps.get(placed.volume, face)} dispose={false} emissive={coverEmissive} emissiveIntensity={coverEmissiveIntensity} />
	{:else}
		<T.MeshStandardMaterial {...cover} emissive={coverEmissive} emissiveIntensity={coverEmissiveIntensity} />
	{/if}
{/snippet}

{#if isInspected}
	<!-- Dimmed Bookcase backdrop plane placed behind the orbiting/open Volume in world space -->
	<T.Mesh
		name={`inspect-backdrop-${placed.volume.id}`}
		renderOrder={1}
		oncreate={(mesh) => {
			backdropMeshRef = mesh;
		}}
		onclick={onBackdropClick}
	>
		<T.PlaneGeometry args={[1, 1]} />
		<T.MeshBasicMaterial
			color={backdropColor}
			transparent
			opacity={0}
			depthWrite={false}
			oncreate={(mat) => {
				backdropMaterialRef = mat;
			}}
		/>
	</T.Mesh>
{/if}

<T.Group
	name={`volume-${placed.volume.id}`}
	visible={!hideClosedForReading}
	position={[shelfCenter[0], shelfCenter[1], shelfCenter[2]]}
	rotation={[0, 0, placed.rotationZ]}
	oncreate={(group) => {
		motionGroupRef = group;
		group.rotation.order = 'XYZ';
	}}
>
	<T.Group position={[0, -halfHeight, halfDepth]}>
		<T.Group
			name={`volume-peek-${placed.volume.id}`}
			oncreate={(group) => {
				peekGroupRef = group;
			}}
			onpointerdown={onPointerDown}
			onpointerenter={onPointerEnter}
			onpointerleave={onPointerLeave}
			onclick={onClick}
			onpointermissed={onPointerMissed}
		>
			{#if parts.spine.shape === 'flat'}
				<!-- Squared-off spine: a thin box whose front face sits at local z = 0 -->
				<T.Mesh
					name="spine"
					position={[parts.spine.position[0], parts.spine.position[1], parts.spine.position[2]]}
				>
					<T.BoxGeometry oncreate={(geometry) => setStampFace(geometry, '+z')} args={[parts.spine.size[0], parts.spine.size[1], parts.spine.size[2]]} />
					{@render binding('spine')}
				</T.Mesh>
			{:else if curvedSpine}
				<T.Mesh
					name="spine"
					geometry={curvedSpine.geometry}
					position={[...parts.spine.position]}
					scale={[1, parts.spine.height, 1]}
				>
					{@render binding('spine')}
				</T.Mesh>
			{/if}

			<!-- Binding Style raised spine bands -->
			{#each parts.spineBands as band (band.id)}
				{#if band.shape === 'flat'}
					<T.Mesh
						name={band.id}
						position={[band.position[0], band.position[1], band.position[2]]}
					>
						<T.BoxGeometry args={[band.size[0], band.size[1], band.size[2]]} />
						<T.MeshStandardMaterial
							{...bandFinish}
							emissive={coverEmissive}
							emissiveIntensity={coverEmissiveIntensity}
						/>
					</T.Mesh>
				{:else if curvedSpine}
					<T.Mesh
						name={band.id}
						geometry={curvedSpine.geometry}
						position={[...band.position]}
						scale={[1, band.height, band.scaleZ / parts.spine.scaleZ]}
					>
						<T.MeshStandardMaterial
							{...bandFinish}
							emissive={coverEmissive}
							emissiveIntensity={coverEmissiveIntensity}
						/>
					</T.Mesh>
				{/if}
			{/each}

			<!-- Front cover board -->
			<T.Mesh
				name="front-board"
				position={[
					parts.frontBoard.position[0],
					parts.frontBoard.position[1],
					parts.frontBoard.position[2]
				]}
			>
				<T.BoxGeometry
					oncreate={(geometry) => setStampFace(geometry, '+x')} args={[parts.frontBoard.size[0], parts.frontBoard.size[1], parts.frontBoard.size[2]]}
				/>
				{@render binding('front')}
			</T.Mesh>

			<!-- Back cover board -->
			<T.Mesh
				name="back-board"
				position={[
					parts.backBoard.position[0],
					parts.backBoard.position[1],
					parts.backBoard.position[2]
				]}
			>
				<T.BoxGeometry
					oncreate={(geometry) => setStampFace(geometry, '-x')} args={[parts.backBoard.size[0], parts.backBoard.size[1], parts.backBoard.size[2]]}
				/>
				{@render binding('back')}
			</T.Mesh>

			<!-- Slightly recessed page block -->
			<T.Mesh
				name="page-block"
				position={[
					parts.pageBlock.position[0],
					parts.pageBlock.position[1],
					parts.pageBlock.position[2]
				]}
			>
				<T.BoxGeometry
					args={[parts.pageBlock.size[0], parts.pageBlock.size[1], parts.pageBlock.size[2]]}
				/>
				<T.MeshStandardMaterial {...paper} />
			</T.Mesh>

			{#if curvedSpine}
				<!-- Rounded backs of the Leaves fill the case beneath its projecting rim. -->
				<T.Mesh
					position={[0, parts.pageBlock.position[1], parts.spine.position[2]]}
					scale={[parts.pageBlock.size[0] / 2, parts.pageBlock.size[1],
						parts.spine.depth - Math.min(parts.frontBoard.size[0], parts.spine.depth * 0.8)]}
				>
					<T.CylinderGeometry args={[1, 1, 1, 32, 1, false, -Math.PI / 2, Math.PI]} />
					<T.MeshStandardMaterial {...paper} />
				</T.Mesh>
			{/if}

			<!-- Binding Style woven headbands at top and bottom of the page block -->
			{#each parts.headbands as headband (headband.id)}
				<T.Mesh
					name={headband.id}
					position={[headband.position[0], headband.position[1], headband.position[2]]}
					rotation={[0, 0, Math.PI / 2]}
				>
					<T.CylinderGeometry args={[headband.radius, headband.radius, headband.width, 10]} />
					<T.MeshStandardMaterial {...headbandFinish} />
				</T.Mesh>
			{/each}
		</T.Group>
	</T.Group>
</T.Group>
