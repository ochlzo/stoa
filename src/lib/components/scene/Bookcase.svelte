<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		applyBookcaseOcclusion,
		createArchitectureFinishes,
		setBoardUvs
	} from '#lib/components/scene/architecture-finish-geometry.ts';
	import { T } from '@threlte/core';
	import { CLAY_COLORS, getBookcaseStructure, type BoxSpec } from '#lib/catalog/bookcase.ts';
	import { createBookcaseCrownGeometry } from '#lib/components/scene/bookcase-trim-geometry.ts';
	import { isClayMode } from '#lib/state/lookdev.svelte.ts';

	const structure = getBookcaseStructure();
	const crownBundle = createBookcaseCrownGeometry();
	const crownBaseY = structure.crown.position[1] - structure.crown.size[1] / 2;
	const finishes = createArchitectureFinishes();
	onDestroy(() => finishes.dispose());
	const shadowsEnabled = $derived(!isClayMode());

	$effect(() => () => crownBundle.dispose());

	const finishByTone = { structure: 'woodPrimary', back: 'woodBackPanel', trim: 'woodTrim' } as const;

	const parts: BoxSpec[] = [
		structure.plinth,
		structure.backPanel,
		structure.leftSide,
		structure.rightSide,
		...structure.shelves.map((shelf) => shelf.board),
		structure.topBoard,
		...structure.trimParts
	];

	function boxSegments(part: BoxSpec): readonly [number, number, number] {
		if (part.id === 'back-panel') return [16, 40, 1];
		if (part.id.startsWith('shelf-') || part.id === 'top-board') return [8, 1, 8];
		if (part.id === 'left-side' || part.id === 'right-side') return [1, 16, 8];
		return [1, 1, 1];
	}
</script>

<T.Group name="bookcase">
	{#each parts as part (part.id)}
		{@const segs = boxSegments(part)}
		<T.Mesh
			name={part.id}
			position={[part.position[0], part.position[1], part.position[2]]}
			castShadow={shadowsEnabled}
			receiveShadow={shadowsEnabled}
		>
			<T.BoxGeometry
				args={[part.size[0], part.size[1], part.size[2], segs[0], segs[1], segs[2]]}
				oncreate={(geometry) => {
					setBoardUvs(geometry, part);
					applyBookcaseOcclusion(geometry, part, structure);
				}}
			/>
			{#if shadowsEnabled}
				<T is={finishes.get(finishByTone[part.tone], true)} dispose={false} />
			{:else}
				<T.MeshStandardMaterial color={CLAY_COLORS[part.tone]} roughness={0.92} metalness={0} />
			{/if}
		</T.Mesh>
	{/each}

	<!-- Classical mitered ogee crown molding -->
	<T.Mesh
		name="crown"
		geometry={crownBundle.geometry}
		position={[0, crownBaseY, 0]}
		castShadow={shadowsEnabled}
		receiveShadow={shadowsEnabled}
	>
		{#if shadowsEnabled}
			<T is={finishes.get('woodTrim')} dispose={false} />
		{:else}
			<T.MeshStandardMaterial color={CLAY_COLORS.trim} roughness={0.9} metalness={0} />
		{/if}
	</T.Mesh>
</T.Group>
