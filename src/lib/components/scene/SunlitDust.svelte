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
		const beamVisible = lighting.dust > 0.015;
		dust.scattering.visible = beamVisible;
		dust.scattering.uniforms.intensity.value = lighting.dust;
		dust.material.visible = animate && beamVisible;
		if (!dust.material.visible) return;
		const uniforms = dust.material.uniforms;
		uniforms.time.value += dt;
		uniforms.intensity.value = lighting.dust;
		uniforms.pixelRatio.value = renderer.getPixelRatio();
	});
</script>

<T.Mesh name="window-sunlight" geometry={dust.shaft} material={dust.scattering} dispose={false} />
<T.Points name="sunlit-dust" geometry={dust.geometry} material={dust.material} dispose={false} />
