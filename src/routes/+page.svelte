<script lang="ts">
	import { Canvas } from '@threlte/core';
	import LibraryScene from '#lib/components/scene/LibraryScene.svelte';
	import VolumePeekCue from '#lib/components/ui/VolumePeekCue.svelte';
</script>

<main class="relative h-dvh w-dvw overflow-hidden select-none touch-none">
	<Canvas>
		<LibraryScene />
	</Canvas>
	<VolumePeekCue />
</main>
