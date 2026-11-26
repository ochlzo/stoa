<script lang="ts">
	import { T } from '@threlte/core';
	import { interactivity } from '@threlte/extras';
	import { CLAY_COLORS } from '#lib/catalog/bookcase.ts';
	import Bookcase from '#lib/components/scene/Bookcase.svelte';
	import ClayStudioLights from '#lib/components/scene/ClayStudioLights.svelte';
	import OpenVolume from '#lib/components/scene/OpenVolume.svelte';
	import RoomBackdrop from '#lib/components/scene/RoomBackdrop.svelte';
	import ShelfCamera from '#lib/components/scene/ShelfCamera.svelte';
	import ShelfProps from '#lib/components/scene/ShelfProps.svelte';
	import ShelfVolumes from '#lib/components/scene/ShelfVolumes.svelte';
	import { getInspectedVolume, getSceneMode } from '#lib/state/library.svelte.ts';

	interactivity();

	const readingVolume = $derived(getSceneMode() === 'reading' ? getInspectedVolume() : null);
</script>

<T.Color attach="background" args={[CLAY_COLORS.background]} />

<ShelfCamera />
<ClayStudioLights />
<RoomBackdrop />
<Bookcase />
<ShelfVolumes />
<ShelfProps />
{#if readingVolume}
	<OpenVolume volume={readingVolume} />
{/if}
