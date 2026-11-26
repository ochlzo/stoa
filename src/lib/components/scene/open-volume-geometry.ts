import { BoxGeometry, MeshStandardMaterial, type CanvasTexture } from 'three';
import type { PageSide } from '#lib/catalog/reading.ts';
import { PAGE_BLOCK_CLAY_COLOR } from '#lib/catalog/volumes.ts';

/** The printed Page and the cut edges share one profile, even while unfolding. */
export function createPageStackGeometry(
	width: number, height: number, thickness: number, gutterDepth: number,
	arch: number, side: PageSide, texture: CanvasTexture
) {
	const sign = side === 'left' ? -1 : 1;
	const geometry = new BoxGeometry(width, height, thickness, 40);
	geometry.translate(sign * width / 2, 0, -thickness / 2);
	const open = geometry.clone();
	const position = open.attributes.position;
	for (let i = 0; i < position.count; i++) {
		const distance = Math.min(1, Math.abs(position.getX(i)) / width);
		const t = Math.min(1, distance / 0.55);
		const rise = t * (2 - t);
		const crown = arch * 4 * distance * (1 - distance) ** 3;
		const top = (thickness - gutterDepth) * rise + crown;
		position.setZ(i, position.getZ(i) > -thickness / 2 ? top : -gutterDepth);
	}
	open.computeVertexNormals();
	geometry.morphAttributes.position = [position];
	geometry.morphAttributes.normal = [open.attributes.normal];

	const edge = new MeshStandardMaterial({ color: PAGE_BLOCK_CLAY_COLOR, roughness: 0.95 });
	const page = new MeshStandardMaterial({ map: texture, roughness: 0.94 });
	// BoxGeometry puts the front (+Z) face in material slot four.
	const materials = [edge, edge, edge, edge, page, edge];
	return {
		geometry, materials,
		dispose() {
			geometry.dispose();
			open.dispose();
			edge.dispose();
			page.dispose();
		}
	};
}
