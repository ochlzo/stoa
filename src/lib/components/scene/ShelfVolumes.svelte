<script lang="ts">
	import { T } from '@threlte/core';
	import { layoutCatalogOnBookcase } from '#lib/catalog/layout.ts';
	import { hasBookmark } from '#lib/state/bookmarks.svelte.ts';
	import Volume from '#lib/components/scene/Volume.svelte';

	const placedVolumes = layoutCatalogOnBookcase();
</script>

<T.Group name="shelf-volumes">
	{#each placedVolumes as placed (placed.volume.id)}
		<Volume {placed} hasBookmark={hasBookmark(placed.volume.id)} />
	{/each}
</T.Group>
