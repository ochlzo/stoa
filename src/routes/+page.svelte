<script lang="ts">
	import { LOOKDEV_PALETTE } from '#lib/catalog/lookdev.ts';
	import { Canvas } from '@threlte/core';
	import { ACESFilmicToneMapping, PCFSoftShadowMap } from 'three';
	import LibraryScene from '#lib/components/scene/LibraryScene.svelte';
	import InspectControls from '#lib/components/ui/InspectControls.svelte';
	import ReadingControls from '#lib/components/ui/ReadingControls.svelte';
	import VolumePeekCue from '#lib/components/ui/VolumePeekCue.svelte';
</script>

<main
	style:--study-paper={LOOKDEV_PALETTE.paperAndInk.archivalPaper}
	style:--study-ink={LOOKDEV_PALETTE.paperAndInk.inkPrimary}
	style:--study-muted={LOOKDEV_PALETTE.paperAndInk.inkMuted}
	style:--study-brass={LOOKDEV_PALETTE.props.brushedBrass}
	class="relative h-dvh w-dvw overflow-hidden select-none">
	<div class="h-full w-full touch-none">
		<Canvas toneMapping={ACESFilmicToneMapping} shadows={PCFSoftShadowMap}>
			<LibraryScene />
		</Canvas>
	</div>
	<VolumePeekCue />
	<InspectControls />
	<ReadingControls />
</main>
