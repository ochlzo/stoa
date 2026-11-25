<script lang="ts">
	import { T } from '@threlte/core';
	import { interactivity } from '@threlte/extras';
	import { CLAY_COLORS } from '#lib/catalog/bookcase.ts';
	import Bookcase from './Bookcase.svelte';
	import ClayStudioLights from './ClayStudioLights.svelte';
	import RoomBackdrop from './RoomBackdrop.svelte';
	import ShelfCamera from './ShelfCamera.svelte';
	import ShelfProps from './ShelfProps.svelte';
	import ShelfVolumes from './ShelfVolumes.svelte';

	interactivity();
</script>

<T.Color attach="background" args={[CLAY_COLORS.background]} />

<ShelfCamera />
<ClayStudioLights />
<RoomBackdrop />
<Bookcase />
<ShelfVolumes />
<ShelfProps />
