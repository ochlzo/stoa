<script lang="ts">
	import { T } from '@threlte/core';
	import { CLAY_COLORS, getBookcaseStructure, type BoxSpec } from '#lib/catalog/bookcase.ts';
	import { createBookcaseCrownGeometry } from '#lib/components/scene/bookcase-trim-geometry.ts';
	import { isClayMode } from '#lib/state/lookdev.svelte.ts';

	const structure = getBookcaseStructure();
	const crownBundle = createBookcaseCrownGeometry();
	const crownBaseY = structure.crown.position[1] - structure.crown.size[1] / 2;
	const shadowsEnabled = $derived(!isClayMode());

	$effect(() => () => crownBundle.dispose());

	const parts: BoxSpec[] = [
		structure.plinth,
		structure.backPanel,
		structure.leftSide,
		structure.rightSide,
		...structure.shelves.map((shelf) => shelf.board),
		structure.topBoard,
		...structure.trimParts
	];
</script>

<T.Group name="bookcase">
	{#each parts as part (part.id)}
		<T.Mesh
			name={part.id}
			position={[part.position[0], part.position[1], part.position[2]]}
			castShadow={shadowsEnabled}
			receiveShadow={shadowsEnabled}
		>
			<T.BoxGeometry args={[part.size[0], part.size[1], part.size[2]]} />
			<T.MeshStandardMaterial
				color={CLAY_COLORS[part.tone]}
				roughness={0.92}
				metalness={0}
			/>
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
		<T.MeshStandardMaterial color={CLAY_COLORS.trim} roughness={0.9} metalness={0} />
	</T.Mesh>
</T.Group>
