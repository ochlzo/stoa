<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { onMount } from 'svelte';
	import type { DirectionalLight, HemisphereLight } from 'three';
	import {
		LOOKDEV_RENDERER_CONFIG,
		STUDY_LIGHTING,
		SUNLIT_STUDY_LIGHTS
	} from '#lib/catalog/lookdev.ts';
	import ClayStudioLights from '#lib/components/scene/ClayStudioLights.svelte';
	import SunlitDust from '#lib/components/scene/SunlitDust.svelte';
	import { stepStudyLighting } from '#lib/physics/study-lighting.ts';
	import { getInspectPhase, getReadingPhase, getSceneMode } from '#lib/state/library.svelte.ts';
	import { isClayMode } from '#lib/state/lookdev.svelte.ts';
	import { createStudyEnvironment } from '#lib/textures/environment.ts';

	const { renderer, scene } = useThrelte();
	const clayMode = $derived(isClayMode());

	const lighting = { ...STUDY_LIGHTING.shelf };
	let sun = $state<DirectionalLight>();
	let sky = $state<DirectionalLight>();
	let ambient = $state<HemisphereLight>();
	let rim = $state<DirectionalLight>();
	let showDust = $state(false);

	onMount(() => {
		const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => {
			showDust = !preference.matches;
		};
		update();
		preference.addEventListener('change', update);
		return () => preference.removeEventListener('change', update);
	});

	useTask((delta) => {
		const dt = Math.min(delta, 0.05);
		if (clayMode || !sun || !rim || !sky || !ambient) return;
		const mode = getSceneMode();
		const closing = getReadingPhase();
		const returning = closing === 'closing-to-shelf' || getInspectPhase() === 'returning';
		const target = returning ? 'shelf' : closing === 'closing-to-inspect' ? 'inspect' : mode;
		stepStudyLighting(lighting, STUDY_LIGHTING[target], dt);
		sun.intensity = lighting.sun;
		sky.intensity = lighting.sky;
		ambient.intensity = lighting.ambient;
		rim.intensity = lighting.rim;
		scene.environmentIntensity = lighting.environment;
		renderer.toneMappingExposure = lighting.exposure;
	});

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
		bind:ref={ambient}
		args={[
			SUNLIT_STUDY_LIGHTS.hemisphere.skyColor,
			SUNLIT_STUDY_LIGHTS.hemisphere.groundColor,
			SUNLIT_STUDY_LIGHTS.hemisphere.intensity
		]}
	/>

	<T.DirectionalLight
		bind:ref={sun}
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
			aimDirectionalTarget(SUNLIT_STUDY_LIGHTS.sunKey.target)(light);
			return () => {
				scene.remove(light.target);
			};
		}}
	/>

	<T.DirectionalLight
		bind:ref={sky}
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

	<T.DirectionalLight
		bind:ref={rim}
		position={[...SUNLIT_STUDY_LIGHTS.rim.position]}
		intensity={SUNLIT_STUDY_LIGHTS.rim.intensity}
		color={SUNLIT_STUDY_LIGHTS.rim.color}
		oncreate={(light) => {
			aimDirectionalTarget(SUNLIT_STUDY_LIGHTS.rim.target)(light);
			return () => {
				scene.remove(light.target);
			};
		}}
	/>

	<SunlitDust {lighting} animate={showDust} />
{/if}
