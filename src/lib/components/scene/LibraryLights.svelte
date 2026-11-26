<script lang="ts">
	import { T, useThrelte } from '@threlte/core';
	import type { DirectionalLight } from 'three';
	import { LOOKDEV_RENDERER_CONFIG, SUNLIT_STUDY_LIGHTS } from '#lib/catalog/lookdev.ts';
	import ClayStudioLights from '#lib/components/scene/ClayStudioLights.svelte';
	import { isClayMode } from '#lib/state/lookdev.svelte.ts';
	import { createStudyEnvironment } from '#lib/textures/environment.ts';

	const { renderer, scene } = useThrelte();
	const clayMode = $derived(isClayMode());

	// Sync filmic tone-mapping exposure and procedural IBL environment with Clay vs Lookdev mode.
	$effect(() => {
		if (clayMode) {
			renderer.toneMappingExposure = LOOKDEV_RENDERER_CONFIG.clayExposure;
			scene.environment = null;
			return;
		}

		renderer.toneMappingExposure = LOOKDEV_RENDERER_CONFIG.exposure;
		const envBundle = createStudyEnvironment(renderer);
		scene.environment = envBundle.texture;
		scene.environmentIntensity = LOOKDEV_RENDERER_CONFIG.environmentIntensity;

		return () => {
			if (scene.environment === envBundle.texture) {
				scene.environment = null;
			}
			envBundle.dispose();
		};
	});

	function aimKeyLight(light: DirectionalLight): void {
		const [tx, ty, tz] = SUNLIT_STUDY_LIGHTS.sunKey.target;
		light.target.position.set(tx, ty, tz);
		light.target.updateMatrixWorld();
		scene.add(light.target);
	}

	function aimDirectionalTarget(targetPos: readonly [number, number, number]) {
		return (light: DirectionalLight) => {
			light.target.position.set(targetPos[0], targetPos[1], targetPos[2]);
			light.target.updateMatrixWorld();
			scene.add(light.target);
		};
	}

	const frustum = LOOKDEV_RENDERER_CONFIG.shadowFrustum;
</script>

{#if clayMode}
	<ClayStudioLights />
{:else}
	<!-- Warm sunlit afternoon study lighting rig -->
	<T.HemisphereLight
		args={[
			SUNLIT_STUDY_LIGHTS.hemisphere.skyColor,
			SUNLIT_STUDY_LIGHTS.hemisphere.groundColor,
			SUNLIT_STUDY_LIGHTS.hemisphere.intensity
		]}
	/>

	<T.DirectionalLight
		position={[...SUNLIT_STUDY_LIGHTS.sunKey.position]}
		intensity={SUNLIT_STUDY_LIGHTS.sunKey.intensity}
		color={SUNLIT_STUDY_LIGHTS.sunKey.color}
		castShadow={SUNLIT_STUDY_LIGHTS.sunKey.castShadow}
		shadow.mapSize.width={LOOKDEV_RENDERER_CONFIG.shadowMapSize}
		shadow.mapSize.height={LOOKDEV_RENDERER_CONFIG.shadowMapSize}
		shadow.bias={LOOKDEV_RENDERER_CONFIG.shadowBias}
		shadow.normalBias={LOOKDEV_RENDERER_CONFIG.shadowNormalBias}
		shadow.camera.left={frustum.left}
		shadow.camera.right={frustum.right}
		shadow.camera.top={frustum.top}
		shadow.camera.bottom={frustum.bottom}
		shadow.camera.near={frustum.near}
		shadow.camera.far={frustum.far}
		oncreate={(light) => {
			aimKeyLight(light);
			return () => {
				scene.remove(light.target);
			};
		}}
	/>

	<T.DirectionalLight
		position={[...SUNLIT_STUDY_LIGHTS.skyFill.position]}
		intensity={SUNLIT_STUDY_LIGHTS.skyFill.intensity}
		color={SUNLIT_STUDY_LIGHTS.skyFill.color}
		oncreate={(light) => {
			aimDirectionalTarget(SUNLIT_STUDY_LIGHTS.skyFill.target)(light);
			return () => {
				scene.remove(light.target);
			};
		}}
	/>

	<T.DirectionalLight
		position={[...SUNLIT_STUDY_LIGHTS.warmBounce.position]}
		intensity={SUNLIT_STUDY_LIGHTS.warmBounce.intensity}
		color={SUNLIT_STUDY_LIGHTS.warmBounce.color}
		oncreate={(light) => {
			aimDirectionalTarget(SUNLIT_STUDY_LIGHTS.warmBounce.target)(light);
			return () => {
				scene.remove(light.target);
			};
		}}
	/>
{/if}
