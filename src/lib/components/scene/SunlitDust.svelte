<script lang="ts">
	import { onDestroy } from 'svelte';
	import { T, useTask, useThrelte } from '@threlte/core';
	import { createSunlitDust } from '#lib/components/scene/sunlit-dust-geometry.ts';
	import type { StudyLighting } from '#lib/physics/study-lighting.ts';

	let { lighting, animate }: { lighting: StudyLighting; animate: boolean } = $props();
	const dust = createSunlitDust();
	const { renderer } = useThrelte();
	onDestroy(dust.dispose);

	useTask((delta) => {
		const dt = Math.min(delta, 0.05);
		dust.material.visible = animate && lighting.dust > 0.015;
		if (!dust.material.visible) return;
		const uniforms = dust.material.uniforms;
		uniforms.time.value += dt;
		uniforms.intensity.value = lighting.dust;
		uniforms.pixelRatio.value = renderer.getPixelRatio();
	});
</script>

<T.Points name="sunlit-dust" geometry={dust.geometry} material={dust.material} dispose={false} />
