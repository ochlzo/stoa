<script lang="ts">
	import type { VolumeStamps } from '#lib/components/scene/volume-stamp-geometry.ts';
	import { T, useTask } from '@threlte/core';
	import { layoutCatalogOnBookcase } from '#lib/catalog/layout.ts';
	import { clampDelta } from '#lib/physics/shelf-camera.ts';
	import {
		createShelfDominoSimulation,
		startShelfDomino,
		startShelfDominoReturn,
		stepShelfDomino
	} from '#lib/physics/shelf-domino.ts';
	import {
		getInspectPhase,
		getInspectShelfCleared,
		getInspectedVolumeId,
		getPeekedVolumeId,
		getSceneMode
	} from '#lib/state/library.svelte.ts';
	import { markShadowsDirty } from '#lib/components/scene/shadow-invalidation.ts';
	import Volume from '#lib/components/scene/Volume.svelte';

	let { stamps }: { stamps: VolumeStamps } = $props();
	const placedVolumes = layoutCatalogOnBookcase();
	const dominoSim = createShelfDominoSimulation(placedVolumes);

	// Release Shelf domino physics only once the pulled Volume has cleared its slot,
	// keep neighbors resting through Reading Mode, and right them when returning.
	const removedVolumeId = $derived(
		(getSceneMode() === 'inspect' || getSceneMode() === 'reading') &&
			getInspectPhase() !== 'returning' &&
			getInspectShelfCleared()
			? getInspectedVolumeId()
			: null
	);

	// Trigger real 2D shelf-plane domino physics on pull-out and smooth righting on return.
	$effect(() => {
		if (removedVolumeId !== null) {
			startShelfDomino(dominoSim, removedVolumeId);
		} else {
			startShelfDominoReturn(dominoSim);
		}
	});

	useTask((delta) => {
		const dt = clampDelta(delta);
		if (stepShelfDomino(dominoSim, dt)) {
			markShadowsDirty();
		}
	});
</script>

<T.Group name="shelf-volumes">
	{#each placedVolumes as placed (placed.volume.id)}
		<Volume
			{placed}
			{stamps}
			isPeeked={getPeekedVolumeId() === placed.volume.id}
			isInspected={getInspectedVolumeId() === placed.volume.id}
			{dominoSim}
		/>
	{/each}
</T.Group>
