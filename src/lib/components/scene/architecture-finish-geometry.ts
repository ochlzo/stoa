import { MeshStandardMaterial, type BufferGeometry } from 'three';
import { LOOKDEV_PALETTE, WOOD_GRAIN_TILE_WIDTH } from '#lib/catalog/lookdev.ts';
import type { BoxSpec } from '#lib/catalog/bookcase.ts';
import { createFinishMaps } from '#lib/textures/architecture-finish.ts';
import { createPbrTextureCache } from '#lib/textures/pbr-texture-cache.ts';

type FinishName = keyof typeof LOOKDEV_PALETTE.architecture;
export function createArchitectureFinishes() {
	const maps = createPbrTextureCache<ReturnType<typeof createFinishMaps>>();
	const materials = createPbrTextureCache<MeshStandardMaterial>();
	return {
		get(name: FinishName) {
			return materials.getOrCreate(name, () => {
				const kind = name === 'plasterWall' ? 'plaster' : name === 'hardwoodFloor' ? 'floor' : 'wood';
				const finish = maps.getOrCreate(name, () => createFinishMaps(kind, LOOKDEV_PALETTE.architecture[name]));
				return new MeshStandardMaterial({
					map: finish.map,
					roughnessMap: finish.detail,
					bumpMap: finish.detail,
					bumpScale: name === 'baseboard' ? 0.00012 : 0.00045,
					roughness: kind === 'plaster' ? 1 : 0.68
				});
			});
		},
		dispose() { materials.dispose(); maps.dispose(); }
	};
}

// U follows the board length. One grain tile spans 1 m along and 0.42 m across.
export function setBoardUvs(geometry: BufferGeometry, part: Pick<BoxSpec, 'size' | 'position'>) {
	const vertical = part.size[1] > part.size[0];
	const pos = geometry.getAttribute('position');
	const normal = geometry.getAttribute('normal');
	const uv = geometry.getAttribute('uv');
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const side = Math.abs(normal.getX(i)) > 0.5;
		const top = Math.abs(normal.getY(i)) > 0.5;
		const u = vertical ? (top ? z : y) : (side ? z : x);
		const v = vertical ? (side ? z : x) : (top ? z : y);
		uv.setXY(
			i,
			u + part.position[1] * 1.7,
			v / WOOD_GRAIN_TILE_WIDTH + part.position[0] + part.position[1]
		);
	}
	uv.needsUpdate = true;
}
