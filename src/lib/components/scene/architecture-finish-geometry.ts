import { Float32BufferAttribute, MeshStandardMaterial, type BufferGeometry } from 'three';
import type { BookcaseStructure, BoxSpec } from '#lib/catalog/bookcase.ts';
import { LOOKDEV_PALETTE, WOOD_GRAIN_TILE_WIDTH } from '#lib/catalog/lookdev.ts';
import { createFinishMaps } from '#lib/textures/architecture-finish.ts';
import { createPbrTextureCache } from '#lib/textures/pbr-texture-cache.ts';

type FinishName = keyof typeof LOOKDEV_PALETTE.architecture;

export function createArchitectureFinishes() {
	const maps = createPbrTextureCache<ReturnType<typeof createFinishMaps>>();
	const materials = createPbrTextureCache<MeshStandardMaterial>();
	return {
		get(name: FinishName, vertexColors = false) {
			const cacheKey = vertexColors ? `${name}:ao` : name;
			return materials.getOrCreate(cacheKey, () => {
				const kind =
					name === 'plasterWall' ? 'plaster' : name === 'hardwoodFloor' ? 'floor' : 'wood';
				const finish = maps.getOrCreate(name, () =>
					createFinishMaps(kind, LOOKDEV_PALETTE.architecture[name])
				);
				return new MeshStandardMaterial({
					map: finish.map,
					roughnessMap: finish.detail,
					bumpMap: finish.detail,
					bumpScale: name === 'baseboard' ? 0.00012 : 0.0005,
					roughness: kind === 'plaster' ? 1 : name === 'woodTrim' ? 0.56 : 0.64,
					vertexColors
				});
			});
		},
		dispose() {
			materials.dispose();
			maps.dispose();
		}
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
		const u = vertical ? (top ? z : y) : side ? z : x;
		const v = vertical ? (side ? z : x) : top ? z : y;
		uv.setXY(
			i,
			u + part.position[1] * 1.7,
			v / WOOD_GRAIN_TILE_WIDTH + part.position[0] + part.position[1]
		);
	}
	uv.needsUpdate = true;
}

/**
 * Bakes subtle procedural architectural ambient occlusion into Bookcase vertex colors
 * so recessed Shelf bays, upper overhangs, and back corners carry rich warm cabinet depth.
 */
export function applyBookcaseOcclusion(
	geometry: BufferGeometry,
	part: BoxSpec,
	structure: BookcaseStructure
): void {
	const pos = geometry.getAttribute('position');
	const colors = new Float32Array(pos.count * 3);
	const { innerMinX, innerMaxX, interiorDepth } = structure.bounds;
	const halfInnerW = (innerMaxX - innerMinX) / 2;

	// Collect underside Y of every Shelf board and the closing top board for back-panel overhang AO.
	const undersides = [
		...structure.shelves.map((s) => s.board.position[1] - s.board.size[1] / 2),
		structure.topBoard.position[1] - structure.topBoard.size[1] / 2
	];
	const surfaces = structure.shelves.map((s) => s.surfaceY);

	for (let i = 0; i < pos.count; i++) {
		const wx = part.position[0] + pos.getX(i);
		const wy = part.position[1] + pos.getY(i);
		const wz = part.position[2] + pos.getZ(i);
		let ao = 1;

		if (part.id === 'back-panel') {
			// Darken near left/right side panels and under each overhanging Shelf board.
			const sideDist = Math.max(0, halfInnerW - Math.abs(wx));
			const sideOcclusion = 0.62 + 0.38 * Math.min(1, sideDist / 0.14);

			let topOcclusion = 1;
			for (const underY of undersides) {
				const below = underY - wy;
				if (below >= -0.005 && below < 0.18) {
					const t = Math.max(0, below) / 0.18;
					topOcclusion = Math.min(topOcclusion, 0.48 + 0.52 * (t * t * (3 - 2 * t)));
				}
			}

			let bottomOcclusion = 1;
			for (const surfY of surfaces) {
				const above = wy - surfY;
				if (above >= -0.005 && above < 0.06) {
					const t = Math.max(0, above) / 0.06;
					bottomOcclusion = Math.min(bottomOcclusion, 0.78 + 0.22 * t);
				}
			}

			ao = sideOcclusion * topOcclusion * bottomOcclusion;
		} else if (part.id.startsWith('shelf-') || part.id === 'top-board') {
			// Recess depth darkening from front bullnose (z = 0) toward back panel (-interiorDepth).
			const depthFrac = Math.max(0, Math.min(1, -wz / interiorDepth));
			const sideDist = Math.max(0, halfInnerW - Math.abs(wx));
			const cornerFactor = 0.85 + 0.15 * Math.min(1, sideDist / 0.12);
			ao = (1 - 0.34 * depthFrac * depthFrac) * cornerFactor;
		} else if (part.id === 'left-side' || part.id === 'right-side') {
			const depthFrac = Math.max(0, Math.min(1, -wz / interiorDepth));
			ao = 1 - 0.36 * depthFrac;
		}

		// Subtle warm shift in shadowed crevices (slightly deeper blue attenuation).
		colors[i * 3] = ao;
		colors[i * 3 + 1] = ao * (0.94 + 0.06 * ao);
		colors[i * 3 + 2] = ao * (0.86 + 0.14 * ao);
	}

	geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
}
