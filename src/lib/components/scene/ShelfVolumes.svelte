<script lang="ts">
	import { T } from '@threlte/core';
	import { layoutCatalogOnBookcase } from '#lib/catalog/layout.ts';
	import { buildLeaningNeighborMap } from '#lib/physics/leaning-neighbor.ts';
	import { hasBookmark } from '#lib/state/bookmarks.svelte.ts';
	import {
		getInspectPhase,
		getInspectedVolumeId,
		getPeekedVolumeId,
		getSceneMode
	} from '#lib/state/library.svelte.ts';
	import Volume from '#lib/components/scene/Volume.svelte';

	const placedVolumes = layoutCatalogOnBookcase();
	const leaningNeighborMap = buildLeaningNeighborMap(placedVolumes);

	const removedVolumeId = $derived(
		getSceneMode() === 'inspect' && getInspectPhase() !== 'returning'
			? getInspectedVolumeId()
			: null
	);
</script>

<T.Group name="shelf-volumes">
	{#each placedVolumes as placed (placed.volume.id)}
		{@const leaningSupport = leaningNeighborMap.get(placed.volume.id) ?? null}
		<Volume
			{placed}
			hasBookmark={hasBookmark(placed.volume.id)}
			isPeeked={getPeekedVolumeId() === placed.volume.id}
			isInspected={getInspectedVolumeId() === placed.volume.id}
			{leaningSupport}
			isSupportRemoved={leaningSupport !== null &&
				removedVolumeId === leaningSupport.supportVolumeId}
		/>
	{/each}
</T.Group>
