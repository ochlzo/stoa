<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { layoutCatalogOnBookcase } from '#lib/catalog/layout.ts';
	import { clampDelta } from '#lib/physics/shelf-camera.ts';
	import {
		createShelfDominoSimulation,
		startShelfDomino,
		startShelfDominoReturn,
		stepShelfDomino
	} from '#lib/physics/shelf-domino.ts';
	import { hasBookmark } from '#lib/state/bookmarks.svelte.ts';
	import {
		getInspectPhase,
		getInspectShelfCleared,
		getInspectedVolumeId,
		getPeekedVolumeId,
		getSceneMode
	} from '#lib/state/library.svelte.ts';
	import Volume from '#lib/components/scene/Volume.svelte';

	const placedVolumes = layoutCatalogOnBookcase();
	const dominoSim = createShelfDominoSimulation(placedVolumes);

	// Release Shelf domino physics only once the pulled Volume has cleared its slot,
	// and begin righting neighbors immediately when the Volume starts returning.
	const removedVolumeId = $derived(
		getSceneMode() === 'inspect' &&
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
		stepShelfDomino(dominoSim, dt);
	});
</script>

<T.Group name="shelf-volumes">
	{#each placedVolumes as placed (placed.volume.id)}
		<Volume
			{placed}
			hasBookmark={hasBookmark(placed.volume.id)}
			isPeeked={getPeekedVolumeId() === placed.volume.id}
			isInspected={getInspectedVolumeId() === placed.volume.id}
			{dominoSim}
		/>
	{/each}
</T.Group>
