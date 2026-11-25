<script lang="ts">
	import { T } from '@threlte/core';
	import { getVolumeGeometryParts } from '#lib/catalog/layout.ts';
	import { PAGE_BLOCK_CLAY_COLOR, VOLUME_CLAY_COLORS } from '#lib/catalog/volumes.ts';
	import type { PlacedVolume } from '#lib/catalog/types.ts';
	import { createBookmarkRibbonGeometry } from '#lib/components/scene/volume-ribbon-geometry.ts';

	interface Props {
		placed: PlacedVolume;
		hasBookmark?: boolean;
	}

	let { placed, hasBookmark = false }: Props = $props();

	const parts = $derived(
		getVolumeGeometryParts(
			placed.volume.dimensions,
			placed.volume.spineProfile,
			placed.volume.bindingStyle
		)
	);
	const coverColor = $derived(VOLUME_CLAY_COLORS[placed.volume.clayTone]);
	const showRibbon = $derived(placed.volume.kind === 'readable' && hasBookmark);

	// Lazily construct and dispose the procedural Bookmark Ribbon only when active.
	const ribbonBundle = $derived(
		showRibbon ? createBookmarkRibbonGeometry(parts.bookmarkRibbon) : null
	);

	$effect(() => {
		const bundle = ribbonBundle;
		return () => {
			bundle?.dispose();
		};
	});
</script>

<T.Group
	name={`volume-${placed.volume.id}`}
	position={[placed.position[0], placed.position[1], placed.position[2]]}
	rotation={[0, 0, placed.rotationZ]}
>
	{#if parts.spine.shape === 'flat'}
		<!-- Squared-off spine: a thin box whose front face sits at local z = 0 -->
		<T.Mesh
			name="spine"
			position={[parts.spine.position[0], parts.spine.position[1], parts.spine.position[2]]}
		>
			<T.BoxGeometry args={[parts.spine.size[0], parts.spine.size[1], parts.spine.size[2]]} />
			<T.MeshStandardMaterial color={coverColor} roughness={0.9} metalness={0} />
		</T.Mesh>
	{:else}
		<!-- Rounded (or shallow) spine: half-cylinder squashed to curve forward to local z = 0 -->
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
					16,
					1,
					false,
					-Math.PI / 2,
					Math.PI
				]}
			/>
			<T.MeshStandardMaterial color={coverColor} roughness={0.9} metalness={0} />
		</T.Mesh>
	{/if}

	<!-- Binding Style raised spine bands -->
	{#each parts.spineBands as band (band.id)}
		{#if band.shape === 'flat'}
			<T.Mesh
				name={band.id}
				position={[band.position[0], band.position[1], band.position[2]]}
			>
				<T.BoxGeometry args={[band.size[0], band.size[1], band.size[2]]} />
				<T.MeshStandardMaterial color={coverColor} roughness={0.86} metalness={0} />
			</T.Mesh>
		{:else}
			<T.Mesh
				name={band.id}
				position={[band.position[0], band.position[1], band.position[2]]}
				scale={[1, 1, band.scaleZ]}
			>
				<T.CylinderGeometry
					args={[
						band.radius,
						band.radius,
						band.height,
						16,
						1,
						false,
						-Math.PI / 2,
						Math.PI
					]}
				/>
				<T.MeshStandardMaterial color={coverColor} roughness={0.86} metalness={0} />
			</T.Mesh>
		{/if}
	{/each}

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

	<!-- Binding Style woven headbands at top and bottom of the page block -->
	{#each parts.headbands as headband (headband.id)}
		<T.Mesh
			name={headband.id}
			position={[headband.position[0], headband.position[1], headband.position[2]]}
			rotation={[0, 0, Math.PI / 2]}
		>
			<T.CylinderGeometry args={[headband.radius, headband.radius, headband.width, 10]} />
			<T.MeshStandardMaterial color="#d8d4cc" roughness={0.92} metalness={0} />
		</T.Mesh>
	{/each}

	<!-- Procedural Bookmark Ribbon tail (rendered only on bookmarked Readable Volumes) -->
	{#if ribbonBundle}
		<T.Mesh name="bookmark-ribbon" geometry={ribbonBundle.geometry}>
			<T.MeshStandardMaterial color="#b5b0a7" roughness={0.85} metalness={0} />
		</T.Mesh>
	{/if}
</T.Group>
