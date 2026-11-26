import { BoxGeometry, MeshStandardMaterial, type CanvasTexture } from 'three';
import { pageStackHeight } from '#lib/physics/leaf-turn.ts';
import type { PageSide } from '#lib/catalog/reading.ts';
import { PAGE_BLOCK_CLAY_COLOR } from '#lib/catalog/volumes.ts';

export const PAGE_STACK_SEGMENTS = 40;
export const PAGE_CLAY_ROUGHNESS = 0.94;
export const PAGE_EDGE_CLAY_ROUGHNESS = 0.95;
/** BoxGeometry places the front (+Z) face in material group slot 4. */
export const PAGE_STACK_FRONT_MATERIAL_INDEX = 4;

/** The printed Page and the cut edges share one profile, even while unfolding. */
export function createPageStackGeometry(
	width: number,
	height: number,
	thickness: number,
	gutterDepth: number,
	arch: number,
	side: PageSide,
	texture: CanvasTexture
) {
	const sign = side === 'left' ? -1 : 1;
	const geometry = new BoxGeometry(width, height, thickness, PAGE_STACK_SEGMENTS);
	geometry.translate((sign * width) / 2, 0, -thickness / 2);
	const open = geometry.clone();
	const position = open.attributes.position;
	for (let i = 0; i < position.count; i++) {
		const distance = Math.min(1, Math.abs(position.getX(i)) / width);
		const top = pageStackHeight(distance, thickness, gutterDepth, arch);
		position.setZ(i, position.getZ(i) > -thickness / 2 ? top : -gutterDepth);
	}
	open.computeVertexNormals();
	geometry.morphAttributes.position = [position];
	geometry.morphAttributes.normal = [open.attributes.normal];

	const edge = new MeshStandardMaterial({
		color: PAGE_BLOCK_CLAY_COLOR,
		roughness: PAGE_EDGE_CLAY_ROUGHNESS
	});
	const page = new MeshStandardMaterial({ map: texture, roughness: PAGE_CLAY_ROUGHNESS });
	const materials = [edge, edge, edge, edge, page, edge];
	return {
		geometry,
		materials,
		dispose() {
			geometry.dispose();
			open.dispose();
			edge.dispose();
			page.dispose();
		}
	};
}
