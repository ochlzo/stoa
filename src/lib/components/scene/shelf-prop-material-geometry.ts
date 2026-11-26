import { MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import {
	SHELF_PROP_FINISHES,
	type ShelfPropFinish,
	type ShelfPropFinishPreset
} from '#lib/catalog/shelf-prop-materials.ts';
import { createPbrTextureCache } from '#lib/textures/pbr-texture-cache.ts';
import { createShelfPropTextures } from '#lib/textures/shelf-prop-textures.ts';
import type { VolumeFinishes } from '#lib/textures/volume-finishes.ts';

export function createShelfPropMaterials() {
	const textures = createShelfPropTextures();
	const materials = createPbrTextureCache<MeshStandardMaterial>();

	function get(kind: ShelfPropFinish, bindings: VolumeFinishes) {
		return materials.getOrCreate(kind, () => {
			const preset: ShelfPropFinishPreset = SHELF_PROP_FINISHES[kind];
			const base = {
				color: preset.color,
				roughness: preset.roughness,
				metalness: preset.metalness
			};
			switch (preset.materialKind) {
				case 'glass':
					return new MeshPhysicalMaterial({ ...base, transmission: 0.94, thickness: 0.015, ior: 1.5 });
				case 'paper':
					return new MeshStandardMaterial(bindings.paper(false));
				case 'leather':
					return new MeshStandardMaterial(
						bindings.decorativeCover('raised-band-leather', preset.color)
					);
				case 'cloth':
					return new MeshStandardMaterial(bindings.decorativeCover('linen-cloth', preset.color));
				case 'plain':
					return new MeshStandardMaterial(base);
				case 'textured':
					return new MeshStandardMaterial({ ...base, map: textures.get(kind) });
			}
		});
	}
	return {
		get,
		dispose() {
			materials.dispose();
			textures.dispose();
		}
	};
}
