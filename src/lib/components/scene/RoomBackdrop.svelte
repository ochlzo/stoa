<script lang="ts">
	import { T } from '@threlte/core';
	import {
		BOOKCASE_DIMENSIONS,
		CLAY_COLORS,
		ROOM_BACKDROP_DIMENSIONS
	} from '#lib/catalog/bookcase.ts';

	const r = ROOM_BACKDROP_DIMENSIONS;
	const wallZ = -(BOOKCASE_DIMENSIONS.depth + r.baseboardDepth + r.wallOffsetBehindBookcase);
</script>

<T.Group name="room-backdrop">
	<!-- Neutral clay room wall directly behind the Bookcase -->
	<T.Mesh name="room-wall" position={[0, r.wallHeight / 2, wallZ]}>
		<T.PlaneGeometry args={[r.wallWidth, r.wallHeight]} />
		<T.MeshStandardMaterial color={CLAY_COLORS.wall} roughness={0.96} metalness={0} />
	</T.Mesh>

	<!-- Floor plane flush at y = 0 -->
	<T.Mesh
		name="room-floor"
		position={[0, 0, wallZ + r.floorDepth / 2]}
		rotation={[-Math.PI / 2, 0, 0]}
	>
		<T.PlaneGeometry args={[r.wallWidth, r.floorDepth]} />
		<T.MeshStandardMaterial color={CLAY_COLORS.floor} roughness={0.94} metalness={0} />
	</T.Mesh>

	<!-- Subtle baseboard along the wall-floor seam -->
	<T.Mesh
		name="room-baseboard"
		position={[0, r.baseboardHeight / 2, wallZ + r.baseboardDepth / 2]}
	>
		<T.BoxGeometry args={[r.wallWidth, r.baseboardHeight, r.baseboardDepth]} />
		<T.MeshStandardMaterial color={CLAY_COLORS.baseboard} roughness={0.92} metalness={0} />
	</T.Mesh>
</T.Group>
