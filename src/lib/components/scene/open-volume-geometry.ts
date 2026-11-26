import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { PageSide } from '#lib/catalog/reading.ts';

export interface OpenPageSurfaceBundle {
	readonly geometry: BufferGeometry;
	dispose(): void;
}

/**
 * Builds a subdivided 3D Page surface for an open Spread with a gentle organic
 * upward arch near the spine gutter that flattens cleanly toward the fore-edge.
 *
 * Local coordinate convention (inside the left or right hinged half):
 * - For `side === 'left'`: x spans `[-width, 0]` (spine gutter at `x = 0`, fore-edge at `x = -width`).
 * - For `side === 'right'`: x spans `[0, +width]` (spine gutter at `x = 0`, fore-edge at `x = +width`).
 * - y spans `[-height / 2, +height / 2]`.
 * - z lifts slightly in `+Z` near the spine gutter (`archHeight`) and sits at `z = 0` at spine and fore-edge.
 * - UVs map cleanly `[0..1]` left-to-right and bottom-to-top facing `+Z`.
 */
export function createOpenPageSurfaceGeometry(
	width: number,
	height: number,
	side: PageSide,
	archHeight: number,
	segmentsX = 20
): OpenPageSurfaceBundle {
	const cols = Math.max(4, segmentsX);
	const halfH = height / 2;
	const positions: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	for (let i = 0; i <= cols; i += 1) {
		// u goes 0 -> 1 from left edge to right edge of this Page as seen by the reader.
		const u = i / cols;
		// Distance fraction from spine gutter (0 = spine, 1 = fore-edge).
		const fromSpine = side === 'left' ? 1 - u : u;
		const x = side === 'left' ? -fromSpine * width : fromSpine * width;

		// Smooth asymmetric paper arch: rises gently out of the crease and settles flat toward fore-edge.
		const z = archHeight * Math.sin(Math.PI * Math.pow(fromSpine, 0.72)) * (1 - fromSpine * 0.35);

		// Bottom vertex (v = 0) and top vertex (v = 1)
		positions.push(x, -halfH, z);
		uvs.push(u, 0);

		positions.push(x, halfH, z);
		uvs.push(u, 1);
	}

	for (let i = 0; i < cols; i += 1) {
		const a = i * 2;
		const b = a + 1;
		const c = a + 2;
		const d = a + 3;
		// Counter-clockwise winding facing +Z (toward the reader)
		indices.push(a, c, b);
		indices.push(b, c, d);
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();

	return {
		geometry,
		dispose() {
			geometry.dispose();
		}
	};
}
