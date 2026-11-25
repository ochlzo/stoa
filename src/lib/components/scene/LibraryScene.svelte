<script lang="ts">
	import { T } from '@threlte/core';
	import { interactivity } from '@threlte/extras';
	import { CLAY_COLORS } from '#lib/catalog/bookcase.ts';
	import Bookcase from './Bookcase.svelte';
	import ClayStudioLights from './ClayStudioLights.svelte';
	import ShelfCamera from './ShelfCamera.svelte';

	interactivity();
</script>

<T.Color attach="background" args={[CLAY_COLORS.background]} />

<ShelfCamera />
<ClayStudioLights />
<Bookcase />
