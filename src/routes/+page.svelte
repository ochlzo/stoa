<script lang="ts">
	import { Canvas } from '@threlte/core';
	import LibraryScene from '#lib/components/scene/LibraryScene.svelte';
	import InspectControls from '#lib/components/ui/InspectControls.svelte';
	import ReadingControls from '#lib/components/ui/ReadingControls.svelte';
	import VolumePeekCue from '#lib/components/ui/VolumePeekCue.svelte';
</script>

<main class="relative h-dvh w-dvw overflow-hidden select-none touch-none">
	<Canvas>
		<LibraryScene />
	</Canvas>
	<VolumePeekCue />
	<InspectControls />
	<ReadingControls />
</main>
