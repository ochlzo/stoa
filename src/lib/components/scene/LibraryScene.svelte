<script lang="ts">
	import { T } from '@threlte/core';
	import { interactivity } from '@threlte/extras';
	import { CLAY_COLORS } from '#lib/catalog/bookcase.ts';
	import Bookcase from '#lib/components/scene/Bookcase.svelte';
	import ClayStudioLights from '#lib/components/scene/ClayStudioLights.svelte';
	import RoomBackdrop from '#lib/components/scene/RoomBackdrop.svelte';
	import ShelfCamera from '#lib/components/scene/ShelfCamera.svelte';
	import ShelfProps from '#lib/components/scene/ShelfProps.svelte';
	import ShelfVolumes from '#lib/components/scene/ShelfVolumes.svelte';

	interactivity();
</script>

<T.Color attach="background" args={[CLAY_COLORS.background]} />

<ShelfCamera />
<ClayStudioLights />
<RoomBackdrop />
<Bookcase />
<ShelfVolumes />
<ShelfProps />
