<script lang="ts">
	import { T } from '@threlte/core';
	import { createVolumeStamps } from '#lib/components/scene/volume-stamp-geometry.ts';
	import { onDestroy } from 'svelte';
	import { createVolumeFinishes } from '#lib/textures/volume-finishes.ts';
	import { interactivity } from '@threlte/extras';
	import { CLAY_COLORS } from '#lib/catalog/bookcase.ts';
	import { SUNLIT_STUDY_LIGHTS } from '#lib/catalog/lookdev.ts';
	import Bookcase from '#lib/components/scene/Bookcase.svelte';
	import LibraryLights from '#lib/components/scene/LibraryLights.svelte';
	import OpenVolume from '#lib/components/scene/OpenVolume.svelte';
	import RoomBackdrop from '#lib/components/scene/RoomBackdrop.svelte';
	import ShelfCamera from '#lib/components/scene/ShelfCamera.svelte';
	import ShelfProps from '#lib/components/scene/ShelfProps.svelte';
	import ShelfVolumes from '#lib/components/scene/ShelfVolumes.svelte';
	import { getInspectedVolume, getSceneMode } from '#lib/state/library.svelte.ts';
	import { isClayMode } from '#lib/state/lookdev.svelte.ts';

	interactivity();
	const finishes = createVolumeFinishes();
	const stamps = createVolumeStamps(finishes);
	onDestroy(stamps.dispose);
	onDestroy(finishes.dispose);

	const readingVolume = $derived(getSceneMode() === 'reading' ? getInspectedVolume() : null);
	const backgroundColor = $derived(
		isClayMode() ? CLAY_COLORS.background : SUNLIT_STUDY_LIGHTS.background
	);
</script>

<T.Color attach="background" args={[backgroundColor]} />

<ShelfCamera />
<LibraryLights />
<RoomBackdrop />
<Bookcase />
<ShelfVolumes {stamps} />
<ShelfProps {finishes} />
{#if readingVolume}
	<OpenVolume {stamps} {finishes} volume={readingVolume} />
{/if}
