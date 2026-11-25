<script lang="ts">
	import { T } from '@threlte/core';
	import { CLAY_COLORS, getBookcaseStructure, type BoxSpec } from '#lib/catalog/bookcase.ts';

	const structure = getBookcaseStructure();

	const parts: BoxSpec[] = [
		structure.plinth,
		structure.backPanel,
		structure.leftSide,
		structure.rightSide,
		...structure.shelves.map((shelf) => shelf.board),
		structure.topBoard,
		structure.crown
	];
</script>

<T.Group name="bookcase">
	{#each parts as part (part.id)}
		<T.Mesh name={part.id} position={[part.position[0], part.position[1], part.position[2]]}>
			<T.BoxGeometry args={[part.size[0], part.size[1], part.size[2]]} />
			<T.MeshStandardMaterial
				color={CLAY_COLORS[part.tone]}
				roughness={0.92}
				metalness={0}
			/>
		</T.Mesh>
	{/each}
</T.Group>
