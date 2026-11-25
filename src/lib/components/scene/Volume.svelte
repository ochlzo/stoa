<script lang="ts">
	import { T } from '@threlte/core';
	import { getVolumeGeometryParts } from '#lib/catalog/layout.ts';
	import { PAGE_BLOCK_CLAY_COLOR, VOLUME_CLAY_COLORS } from '#lib/catalog/volumes.ts';
	import type { PlacedVolume } from '#lib/catalog/types.ts';

	interface Props {
		placed: PlacedVolume;
	}

	let { placed }: Props = $props();

	const parts = $derived(getVolumeGeometryParts(placed.volume.dimensions));
	const coverColor = $derived(VOLUME_CLAY_COLORS[placed.volume.clayTone]);
</script>

<T.Group
	name={`volume-${placed.volume.id}`}
	position={[placed.position[0], placed.position[1], placed.position[2]]}
	rotation={[0, 0, placed.rotationZ]}
>
	<!-- Rounded spine curving forward to local z = 0 -->
	<T.Mesh
		name="spine"
		position={[parts.spine.position[0], parts.spine.position[1], parts.spine.position[2]]}
		scale={[1, 1, parts.spine.scaleZ]}
	>
		<T.CylinderGeometry
			args={[
				parts.spine.radius,
				parts.spine.radius,
				parts.spine.height,
				12,
				1,
				false,
				-Math.PI / 2,
				Math.PI
			]}
		/>
		<T.MeshStandardMaterial color={coverColor} roughness={0.9} metalness={0} />
	</T.Mesh>

	<!-- Front cover board -->
	<T.Mesh
		name="front-board"
		position={[
			parts.frontBoard.position[0],
			parts.frontBoard.position[1],
			parts.frontBoard.position[2]
		]}
	>
		<T.BoxGeometry
			args={[parts.frontBoard.size[0], parts.frontBoard.size[1], parts.frontBoard.size[2]]}
		/>
		<T.MeshStandardMaterial color={coverColor} roughness={0.9} metalness={0} />
	</T.Mesh>

	<!-- Back cover board -->
	<T.Mesh
		name="back-board"
		position={[
			parts.backBoard.position[0],
			parts.backBoard.position[1],
			parts.backBoard.position[2]
		]}
	>
		<T.BoxGeometry
			args={[parts.backBoard.size[0], parts.backBoard.size[1], parts.backBoard.size[2]]}
		/>
		<T.MeshStandardMaterial color={coverColor} roughness={0.9} metalness={0} />
	</T.Mesh>

	<!-- Slightly recessed page block -->
	<T.Mesh
		name="page-block"
		position={[
			parts.pageBlock.position[0],
			parts.pageBlock.position[1],
			parts.pageBlock.position[2]
		]}
	>
		<T.BoxGeometry
			args={[parts.pageBlock.size[0], parts.pageBlock.size[1], parts.pageBlock.size[2]]}
		/>
		<T.MeshStandardMaterial color={PAGE_BLOCK_CLAY_COLOR} roughness={0.95} metalness={0} />
	</T.Mesh>
</T.Group>
