import { Color, MeshStandardMaterial, Float32BufferAttribute, type BoxGeometry, type Texture } from 'three';
import { LOOKDEV_PALETTE } from '#lib/catalog/lookdev.ts';

import { createPbrTextureCache } from '#lib/textures/pbr-texture-cache.ts';
import { createVolumeStamp, type StampFace } from '#lib/textures/volume-stamp.ts';
import type { Volume } from '#lib/catalog/types.ts';
import type { VolumeFinishes } from '#lib/textures/volume-finishes.ts';

export function createVolumeStamps(finishes: VolumeFinishes) {
	const textures = createPbrTextureCache<Texture>();
	const materials = createPbrTextureCache<MeshStandardMaterial>();
	return {
		get(volume: Volume, face: StampFace) {
			const key = volume.id + '/' + face;
			return materials.getOrCreate(key, () => createStampedMaterial(finishes.cover(volume, false),
				textures.getOrCreate(key, () => createVolumeStamp(volume, face))));
		},
		dispose() { materials.dispose(); textures.dispose(); }
	};
}

export type VolumeStamps = ReturnType<typeof createVolumeStamps>;

export function setStampFace(geometry: BoxGeometry, face: '+x' | '-x' | '+z' | '-z') {
	const slot = { '+x': 0, '-x': 1, '+z': 4, '-z': 5 }[face];
	const group = geometry.groups[slot];
	const uv = geometry.attributes.uv;
	const values = new Float32Array(uv.count * 2).fill(-1);
	for (let i = group.start; i < group.start + group.count; i++) {
		const vertex = geometry.index!.getX(i);
		values[vertex * 2] = uv.getX(vertex);
		values[vertex * 2 + 1] = uv.getY(vertex);
	}
	geometry.setAttribute('stampUv', new Float32BufferAttribute(values, 2));
}

// Keep the cloth/leather maps on UV0. Only the printed face has valid stamp UVs.
function createStampedMaterial(base: ConstructorParameters<typeof MeshStandardMaterial>[0], stamp: Texture) {
	const material = new MeshStandardMaterial(base);
	material.customProgramCacheKey = () => 'volume-stamp-v1';
	material.onBeforeCompile = (shader) => {
		shader.uniforms.stampMap = { value: stamp };
		shader.uniforms.foilColor = { value: new Color(LOOKDEV_PALETTE.paperAndInk.goldFoil) };
		shader.uniforms.toolColor = { value: new Color(LOOKDEV_PALETTE.paperAndInk.blindTooling) };
		shader.vertexShader = 'attribute vec2 stampUv; varying vec2 vStampUv;\n' + shader.vertexShader
			.replace('#include <uv_vertex>', '#include <uv_vertex>\nvStampUv = stampUv;');
		shader.fragmentShader = 'uniform sampler2D stampMap; uniform vec3 foilColor, toolColor; varying vec2 vStampUv;\n' + shader.fragmentShader
			.replace('#include <map_fragment>', `#include <map_fragment>
				vec3 stamp = texture2D(stampMap, vStampUv).rgb * step(0.0, vStampUv.x);
				float coverage = min(1.0, stamp.r + stamp.b);
				diffuseColor.rgb = diffuseColor.rgb * (1.0 - coverage) + foilColor * stamp.b + toolColor * stamp.r;`)
			.replace('#include <normal_fragment_maps>', `vec3 pressedNormal = normal;
				#include <normal_fragment_maps>
				normal = normalize(mix(normal, pressedNormal, coverage * 0.85));`)
			.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = roughnessFactor * (1.0 - coverage) + stamp.g;')
			.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = metalnessFactor * (1.0 - coverage) + stamp.b;');
	};
	return material;
}
