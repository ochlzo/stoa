import {
	CanvasTexture,
	ClampToEdgeWrapping,
	Color,
	Float32BufferAttribute,
	MeshStandardMaterial,
	type BoxGeometry,
	type Texture
} from 'three';
import { LOOKDEV_PALETTE } from '#lib/catalog/lookdev.ts';
import type { VolumeDesign } from '#lib/catalog/readable/types.ts';
import { configurePbrTexture, createPbrTextureCache } from '#lib/textures/pbr-texture-cache.ts';
import { createVolumeStamp, type StampFace } from '#lib/textures/volume-stamp.ts';
import type { Volume } from '#lib/catalog/types.ts';
import type { VolumeFinishes } from '#lib/textures/volume-finishes.ts';

interface ArtLayer {
	texture: CanvasTexture;
	loaded: { value: number };
	opacity: number;
}

function createCoverArtLayer(src: string, opacity: number): ArtLayer {
	const canvas = document.createElement('canvas');
	canvas.width = 1024;
	canvas.height = 1024;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const texture = configurePbrTexture(new CanvasTexture(canvas), 'albedo', {
		wrapS: ClampToEdgeWrapping,
		wrapT: ClampToEdgeWrapping
	});
	const loaded = { value: 0 };

	if (typeof Image !== 'undefined' && typeof document !== 'undefined') {
		const resolvedSrc = new URL(src.replace(/^\/+/, ''), document.baseURI).href;
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
			const drawW = img.naturalWidth * scale;
			const drawH = img.naturalHeight * scale;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, (canvas.width - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);
			loaded.value = 1;
			texture.needsUpdate = true;
		};
		img.src = resolvedSrc;
	}

	return { texture, loaded, opacity };
}

export const VOLUME_HIGHLIGHT_EMISSIVE = LOOKDEV_PALETTE.paperAndInk.goldFoil;
export const VOLUME_HIGHLIGHT_INTENSITY = 0.065;

export function createVolumeStamps(finishes: VolumeFinishes) {
	const textures = createPbrTextureCache<Texture>();
	const artTextures = createPbrTextureCache<Texture>();
	const materials = createPbrTextureCache<MeshStandardMaterial>();
	return {
		get(volume: Volume, face: StampFace) {
			const key = volume.id + '/' + face;
			const design = volume.kind === 'readable' ? volume.design : undefined;
			return materials.getOrCreate(key, () => {
				const stamp = textures.getOrCreate(key, () => createVolumeStamp(volume, face));
				const artSrc = design?.coverArtwork?.[face];
				const artLayer = artSrc
					? (() => {
							const layer = createCoverArtLayer(artSrc, design?.coverArtwork?.opacity ?? 0.92);
							artTextures.getOrCreate(key, () => layer.texture);
							return layer;
						})()
					: undefined;
				return createStampedMaterial(finishes.cover(volume, false), stamp, design, artLayer);
			});
		},
		coverMaterial(volume: Volume, clay: boolean, highlighted = false, clayRoughness = 0.9) {
			const props = finishes.cover(volume, clay, clayRoughness);
			const key = `cover:${clay ? 'c' : volume.bindingStyle}:${props.color}:${props.roughness}:${props.bumpScale}:${highlighted ? 'h' : 'n'}`;
			return materials.getOrCreate(
				key,
				() =>
					new MeshStandardMaterial({
						...props,
						emissive: highlighted ? VOLUME_HIGHLIGHT_EMISSIVE : '#000000',
						emissiveIntensity: highlighted ? VOLUME_HIGHLIGHT_INTENSITY : 0
					})
			);
		},
		paperMaterial(clay: boolean) {
			const key = `paper:${clay ? 'c' : 'l'}`;
			return materials.getOrCreate(key, () => new MeshStandardMaterial(finishes.paper(clay)));
		},
		headbandMaterial(clay: boolean, volume?: Volume) {
			const props = finishes.headband(clay, volume);
			const key = `headband:${clay ? 'c' : props.color}`;
			return materials.getOrCreate(key, () => new MeshStandardMaterial(props));
		},
		dispose() {
			materials.dispose();
			textures.dispose();
			artTextures.dispose();
		}
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
function createStampedMaterial(
	base: ConstructorParameters<typeof MeshStandardMaterial>[0],
	stamp: Texture,
	design?: VolumeDesign,
	artLayer?: ArtLayer
) {
	const material = new MeshStandardMaterial(base);
	material.customProgramCacheKey = () => (artLayer ? 'volume-stamp-art-v1' : 'volume-stamp-v1');
	material.onBeforeCompile = (shader) => {
		shader.uniforms.stampMap = { value: stamp };
		shader.uniforms.foilColor = {
			value: new Color(design?.foilColor ?? LOOKDEV_PALETTE.paperAndInk.goldFoil)
		};
		shader.uniforms.toolColor = {
			value: new Color(design?.toolColor ?? LOOKDEV_PALETTE.paperAndInk.blindTooling)
		};
		if (artLayer) {
			shader.uniforms.artMap = { value: artLayer.texture };
			shader.uniforms.artLoaded = artLayer.loaded;
			shader.uniforms.artOpacity = { value: artLayer.opacity };
		}

		shader.vertexShader =
			'attribute vec2 stampUv; varying vec2 vStampUv;\n' +
			shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvStampUv = stampUv;');

		const artUniformDecl = artLayer
			? 'uniform sampler2D artMap; uniform float artLoaded, artOpacity;\n'
			: '';
		const artBlendBlock = artLayer
			? `
				float onFace = step(0.0, vStampUv.x);
				vec4 artSample = texture2D(artMap, vStampUv);
				float artWeight = onFace * artLoaded * artOpacity * artSample.a;
				diffuseColor.rgb = mix(diffuseColor.rgb, artSample.rgb, artWeight);`
			: '';

		shader.fragmentShader =
			'uniform sampler2D stampMap; uniform vec3 foilColor, toolColor; varying vec2 vStampUv;\n' +
			artUniformDecl +
			shader.fragmentShader
				.replace(
					'#include <map_fragment>',
					`#include <map_fragment>${artBlendBlock}
				vec3 stamp = texture2D(stampMap, vStampUv).rgb * step(0.0, vStampUv.x);
				float coverage = min(1.0, stamp.r + stamp.b);
				diffuseColor.rgb = diffuseColor.rgb * (1.0 - coverage) + foilColor * stamp.b + toolColor * stamp.r;`
				)
				.replace(
					'#include <normal_fragment_maps>',
					`vec3 pressedNormal = normal;
				#include <normal_fragment_maps>
				normal = normalize(mix(normal, pressedNormal, coverage * 0.85));`
				)
				.replace(
					'#include <roughnessmap_fragment>',
					'#include <roughnessmap_fragment>\nroughnessFactor = roughnessFactor * (1.0 - coverage) + stamp.g;'
				)
				.replace(
					'#include <metalnessmap_fragment>',
					'#include <metalnessmap_fragment>\nmetalnessFactor = metalnessFactor * (1.0 - coverage) + stamp.b;'
				);
	};
	return material;
}
