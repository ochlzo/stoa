import { BoxGeometry, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, type Side, type MeshStandardMaterialParameters, type CanvasTexture } from 'three';
import { pageStackHeight } from '#lib/physics/leaf-turn.ts';
import type { PageSide } from '#lib/catalog/reading.ts';
import { PAGE_BLOCK_CLAY_COLOR } from '#lib/catalog/volumes.ts';

export const PAGE_STACK_SEGMENTS = 40;
export const PAGE_CLAY_ROUGHNESS = 0.94;
export const PAGE_EDGE_CLAY_ROUGHNESS = 0.95;
/** BoxGeometry places the front (+Z) face in material group slot 4. */
export const PAGE_STACK_FRONT_MATERIAL_INDEX = 4;

/** Rag paper scatters light across its fibers with very little surface reflection. */
export function createPageMaterial(map: CanvasTexture, clay: boolean, side: Side = FrontSide) {
	if (clay) return new MeshStandardMaterial({ map, side, roughness: PAGE_CLAY_ROUGHNESS });
	return new MeshPhysicalMaterial({ map, side, roughness: 0.98, specularIntensity: 0.12 });
}

export interface PageStackGeometryOptions {
	readonly width: number;
	readonly height: number;
	readonly thickness: number;
	readonly gutterDepth: number;
	readonly arch: number;
	readonly side: PageSide;
	readonly texture: CanvasTexture;
	readonly edgeFinish?: MeshStandardMaterialParameters;
	readonly clay?: boolean;
}

/** The printed Page and the cut edges share one profile, even while unfolding. */
export function createPageStackGeometry({
	width,
	height,
	thickness,
	gutterDepth,
	arch,
	side,
	texture,
	edgeFinish,
	clay = true
}: PageStackGeometryOptions) {
	const sign = side === 'left' ? -1 : 1;
	const geometry = new BoxGeometry(width, height, thickness, PAGE_STACK_SEGMENTS);
	geometry.translate((sign * width) / 2, 0, -thickness / 2);
	// On the cut edges, U crosses the stack and V follows the edge of each Leaf.
	const uv = geometry.attributes.uv;
	const base = geometry.attributes.position;
	const normal = geometry.attributes.normal;
	for (let i = 0; i < uv.count; i++) {
		if (Math.abs(normal.getZ(i)) > 0.5) continue;
		const along = normal.getX(i) ? base.getY(i) / height : base.getX(i) / width;
		uv.setXY(i, -base.getZ(i) / 0.05, along);
	}
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

	const edge = new MeshStandardMaterial(edgeFinish ?? {
		color: PAGE_BLOCK_CLAY_COLOR,
		roughness: PAGE_EDGE_CLAY_ROUGHNESS
	});
	const page = createPageMaterial(texture, clay);
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
