<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import type { IntersectionEvent } from '@threlte/extras';
	import { Vector3, type Group, type Mesh, type MeshBasicMaterial, type PerspectiveCamera } from 'three';
	import { getVolumeGeometryParts } from '#lib/catalog/layout.ts';
	import { PAGE_BLOCK_CLAY_COLOR, VOLUME_CLAY_COLORS } from '#lib/catalog/volumes.ts';
	import type { PlacedVolume } from '#lib/catalog/types.ts';
	import { createBookmarkRibbonGeometry } from '#lib/components/scene/volume-ribbon-geometry.ts';
	import {
		INSPECT_VOLUME_CONFIG,
		computeInspectPose,
		computeVolumeShelfCenter,
		createInspectOrbitGestures,
		createInspectVolumeState,
		evaluateInspectTransform,
		startInspectEnter,
		startInspectReturn,
		stepInspectVolume
	} from '#lib/physics/inspect-volume.ts';
	import {
		createLeaningNeighborState,
		evaluateLeaningTransform,
		stepLeaningNeighbor,
		type LeaningNeighborSupport
	} from '#lib/physics/leaning-neighbor.ts';
	import { SHELF_CAMERA_CONFIG, clampDelta, getShelfCameraFov } from '#lib/physics/shelf-camera.ts';
	import { createVolumePeekState, stepVolumePeek } from '#lib/physics/volume-peek.ts';
	import {
		canSelectVolume,
		clearPeek,
		completeReturnToShelf,
		enterInspectMode,
		getInspectPhase,
		getPeekSource,
		getSceneMode,
		requestReturnToShelf,
		setInspectOrbiting,
		setInspectPhase,
		setPeekedVolume,
		updatePeekAnchor
	} from '#lib/state/library.svelte.ts';

	interface Props {
		placed: PlacedVolume;
		hasBookmark?: boolean;
		isPeeked?: boolean;
		isInspected?: boolean;
		leaningSupport?: LeaningNeighborSupport | null;
		isSupportRemoved?: boolean;
	}

	let {
		placed,
		hasBookmark = false,
		isPeeked = false,
		isInspected = false,
		leaningSupport = null,
		isSupportRemoved = false
	}: Props = $props();

	const { camera, canvas, size } = useThrelte();

	const parts = $derived(
		getVolumeGeometryParts(
			placed.volume.dimensions,
			placed.volume.spineProfile,
			placed.volume.bindingStyle
		)
	);
	const coverColor = $derived(VOLUME_CLAY_COLORS[placed.volume.clayTone]);
	const showRibbon = $derived(placed.volume.kind === 'readable' && hasBookmark);
	const highlightReadable = $derived(isPeeked && !isInspected && placed.volume.kind === 'readable');
	const coverEmissive = $derived(highlightReadable ? '#f4ede0' : '#000000');
	const coverEmissiveIntensity = $derived(highlightReadable ? 0.16 : 0);

	// Exact world-space geometric center of this Volume when seated flush in its Shelf slot.
	const shelfCenter = $derived(computeVolumeShelfCenter(placed, 0));
	const halfHeight = $derived(placed.volume.dimensions.height / 2);
	const halfDepth = $derived(placed.volume.dimensions.depth / 2);

	// Lazily construct and dispose the procedural Bookmark Ribbon only when active.
	const ribbonBundle = $derived(
		showRibbon ? createBookmarkRibbonGeometry(parts.bookmarkRibbon) : null
	);

	$effect(() => {
		const bundle = ribbonBundle;
		return () => {
			bundle?.dispose();
		};
	});

	const peekState = createVolumePeekState();
	const inspectState = createInspectVolumeState();
	const leaningState = createLeaningNeighborState(0);
	let leaningInitialized = false;
	const anchorPoint = new Vector3();
	let motionGroupRef: Group | undefined;
	let peekGroupRef: Group | undefined;
	let backdropMeshRef: Mesh | undefined;
	let backdropMaterialRef: MeshBasicMaterial | undefined;
	let lastPointerType = 'mouse';

	// Seed the leaning neighbor's angular state from its exact resting lean angle.
	$effect(() => {
		if (leaningSupport && !leaningInitialized) {
			leaningState.angle = leaningSupport.restingAngle;
			leaningState.angularVelocity = 0;
			leaningState.atCatch = false;
			leaningInitialized = true;
		}
	});

	function applyRestingTransform(): void {
		if (!motionGroupRef) return;
		motionGroupRef.position.set(shelfCenter[0], shelfCenter[1], shelfCenter[2]);
		motionGroupRef.rotation.order = 'YXZ';
		motionGroupRef.rotation.set(0, 0, placed.rotationZ);
	}

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
		if (!isInspected) return;
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

		canvas.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerEnd);
		window.addEventListener('pointercancel', onPointerEnd);

		return () => {
			gestures.reset();
			setInspectOrbiting(false);
			canvas.removeEventListener('pointerdown', onPointerDown);
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
			const step = stepInspectVolume(inspectState, dt);
			if (step.enteredInspect) {
				setInspectPhase('inspecting');
			}

			const activeCamera = camera.current as PerspectiveCamera;
			const viewport = size.current;
			const fov = activeCamera.fov || getShelfCameraFov(viewport);
			const pose = computeInspectPose(
				[activeCamera.position.x, activeCamera.position.y, activeCamera.position.z],
				fov,
				viewport,
				placed.volume.dimensions
			);
			const transform = evaluateInspectTransform(inspectState, placed, pose.center);

			if (motionGroupRef) {
				motionGroupRef.position.set(
					transform.position[0],
					transform.position[1],
					transform.position[2]
				);
				motionGroupRef.rotation.order = 'YXZ';
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
				backdropMaterialRef.opacity = transform.backdropOpacity;
			}

			if (step.completedReturn) {
				applyRestingTransform();
				completeReturnToShelf();
			}
			return;
		}

		if (leaningSupport && leaningInitialized) {
			const tipped = stepLeaningNeighbor(leaningState, leaningSupport, isSupportRemoved, dt);
			if (tipped && motionGroupRef) {
				const leanTransform = evaluateLeaningTransform(
					placed,
					leaningSupport.footX,
					leaningSupport.surfaceY,
					leaningSupport.sign,
					leaningState.angle
				);
				motionGroupRef.position.set(
					leanTransform.center[0],
					leanTransform.center[1],
					leanTransform.center[2]
				);
				motionGroupRef.rotation.order = 'YXZ';
				motionGroupRef.rotation.set(0, 0, leanTransform.rotationZ);
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
		requestReturnToShelf();
	}
</script>

{#if isInspected}
	<!-- Dimmed Bookcase backdrop plane placed behind the orbiting Volume in world space -->
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
			color="#141210"
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
	position={[shelfCenter[0], shelfCenter[1], shelfCenter[2]]}
	rotation={[0, 0, placed.rotationZ]}
	oncreate={(group) => {
		motionGroupRef = group;
		group.rotation.order = 'YXZ';
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
					<T.BoxGeometry args={[parts.spine.size[0], parts.spine.size[1], parts.spine.size[2]]} />
					<T.MeshStandardMaterial
						color={coverColor}
						emissive={coverEmissive}
						emissiveIntensity={coverEmissiveIntensity}
						roughness={0.9}
						metalness={0}
					/>
				</T.Mesh>
			{:else}
				<!-- Rounded (or shallow) spine: half-cylinder squashed to curve forward to local z = 0 -->
				<T.Mesh
					name="spine"
					position={[parts.spine.position[0], parts.spine.position[1], parts.spine.position[2]]}
					scale={[1, 1, parts.spine.scaleZ]}
				>
					<T.CylinderGeometry
						args={[
							parts.spine.radius,
							parts.spine.radius,
							parts.spine.height,
							16,
							1,
							false,
							-Math.PI / 2,
							Math.PI
						]}
					/>
					<T.MeshStandardMaterial
						color={coverColor}
						emissive={coverEmissive}
						emissiveIntensity={coverEmissiveIntensity}
						roughness={0.9}
						metalness={0}
					/>
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
							color={coverColor}
							emissive={coverEmissive}
							emissiveIntensity={coverEmissiveIntensity}
							roughness={0.86}
							metalness={0}
						/>
					</T.Mesh>
				{:else}
					<T.Mesh
						name={band.id}
						position={[band.position[0], band.position[1], band.position[2]]}
						scale={[1, 1, band.scaleZ]}
					>
						<T.CylinderGeometry
							args={[
								band.radius,
								band.radius,
								band.height,
								16,
								1,
								false,
								-Math.PI / 2,
								Math.PI
							]}
						/>
						<T.MeshStandardMaterial
							color={coverColor}
							emissive={coverEmissive}
							emissiveIntensity={coverEmissiveIntensity}
							roughness={0.86}
							metalness={0}
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
					args={[parts.frontBoard.size[0], parts.frontBoard.size[1], parts.frontBoard.size[2]]}
				/>
				<T.MeshStandardMaterial
					color={coverColor}
					emissive={coverEmissive}
					emissiveIntensity={coverEmissiveIntensity}
					roughness={0.9}
					metalness={0}
				/>
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
					args={[parts.backBoard.size[0], parts.backBoard.size[1], parts.backBoard.size[2]]}
				/>
				<T.MeshStandardMaterial
					color={coverColor}
					emissive={coverEmissive}
					emissiveIntensity={coverEmissiveIntensity}
					roughness={0.9}
					metalness={0}
				/>
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
				<T.MeshStandardMaterial color={PAGE_BLOCK_CLAY_COLOR} roughness={0.95} metalness={0} />
			</T.Mesh>

			<!-- Binding Style woven headbands at top and bottom of the page block -->
			{#each parts.headbands as headband (headband.id)}
				<T.Mesh
					name={headband.id}
					position={[headband.position[0], headband.position[1], headband.position[2]]}
					rotation={[0, 0, Math.PI / 2]}
				>
					<T.CylinderGeometry args={[headband.radius, headband.radius, headband.width, 10]} />
					<T.MeshStandardMaterial color="#d8d4cc" roughness={0.92} metalness={0} />
				</T.Mesh>
			{/each}

			<!-- Procedural Bookmark Ribbon tail (rendered only on bookmarked Readable Volumes) -->
			{#if ribbonBundle}
				<T.Mesh name="bookmark-ribbon" geometry={ribbonBundle.geometry}>
					<T.MeshStandardMaterial color="#b5b0a7" roughness={0.85} metalness={0} />
				</T.Mesh>
			{/if}
		</T.Group>
	</T.Group>
</T.Group>
