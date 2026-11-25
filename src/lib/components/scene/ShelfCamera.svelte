<script lang="ts">
	import { T } from '@threlte/core';
	import { SHELF_CAMERA_DEFAULTS, getInitialShelfCameraY } from '#lib/catalog/bookcase.ts';

	const initialY = getInitialShelfCameraY();
</script>

<T.PerspectiveCamera
	makeDefault
	fov={SHELF_CAMERA_DEFAULTS.fov}
	near={SHELF_CAMERA_DEFAULTS.near}
	far={SHELF_CAMERA_DEFAULTS.far}
	position={[0, initialY, SHELF_CAMERA_DEFAULTS.distance]}
	oncreate={(camera) => {
		camera.lookAt(0, initialY, 0);
	}}
/>
