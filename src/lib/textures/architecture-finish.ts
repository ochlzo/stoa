import { DataTexture, RGBAFormat } from 'three';
import { configurePbrTexture } from '#lib/textures/pbr-texture-cache.ts';

type Finish = 'wood' | 'floor' | 'plaster';

// Periodic value noise keeps opposite edges of the wood tile continuous.
function hash(x: number, y: number): number {
	let n = Math.imul(x + 373, 374761393) + Math.imul(y + 71, 668265263);
	n = Math.imul(n ^ (n >>> 13), 1274126177);
	return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function noise(u: number, v: number, cols: number, rows: number): number {
	const x = (u - Math.floor(u)) * cols;
	const y = (v - Math.floor(v)) * rows;
	const i = Math.floor(x);
	const j = Math.floor(y);
	const dx = x - i;
	const dy = y - j;
	const a = dx * dx * (3 - 2 * dx);
	const b = dy * dy * (3 - 2 * dy);
	const nextX = (i + 1) % cols;
	const nextY = (j + 1) % rows;
	const bottom = hash(i, j) * (1 - a) + hash(nextX, j) * a;
	const top = hash(i, nextY) * (1 - a) + hash(nextX, nextY) * a;
	return bottom * (1 - b) + top * b;
}

function grain(u: number, v: number): number {
	const warp = v + 0.045 * noise(u, v, 3, 5) + 0.012 * noise(u, v, 7, 11);
	return 0.36 * noise(u, warp, 3, 19) + 0.44 * noise(u, warp, 6, 83)
		+ 0.20 * noise(u, warp, 21, 189);
}

function relief(finish: Finish, u: number, v: number): number {
	if (finish === 'plaster') {
		return 0.6 * noise(u, v, 12, 8) + 0.25 * noise(u, v, 73, 49)
			+ 0.15 * noise(u, v, 273, 179);
	}
	if (finish === 'wood') return grain(u, v);

	// Lay staggered hardwood courses across the entire 6 m x 4 m floor map.
	const course = v * 24;
	const row = Math.floor(course);
	const length = u * 4 + hash(row, 0);
	const board = Math.floor(length);
	const offset = hash(board, row);
	const edge = Math.min((course % 1) * 0.167, (length % 1) * 1.5);
	const seam = 0.25 * Math.max(0, 1 - edge / 0.009);
	return 0.72 * grain(length + offset, course * 0.28 + offset) + 0.28 * offset - seam;
}

export function createFinishMaps(finish: Finish, color: string) {
	const width = finish === 'floor' ? 1024 : 512;
	const height = 512;
	const albedo = new Uint8Array(width * height * 4);
	// Three reads roughness from green and bump from red, so both share a data map.
	const surface = new Uint8Array(albedo.length);
	const rgb = Number.parseInt(color.slice(1), 16);
	const contrast = finish === 'plaster' ? 0.075 : 0.36;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const h = relief(finish, (x + 0.5) / width, (y + 0.5) / height);
			const value = 1 + (h - 0.5) * contrast;
			const i = (y * width + x) * 4;
			albedo[i] = Math.min(255, (rgb >> 16) * value);
			albedo[i + 1] = Math.min(255, ((rgb >> 8) & 255) * value);
			albedo[i + 2] = Math.min(255, (rgb & 255) * value);
			albedo[i + 3] = 255;
			surface[i] = Math.max(0, Math.min(255, h * 255));
			surface[i + 1] = 235 - 48 * h;
			surface[i + 3] = 255;
		}
	}
	const map = configurePbrTexture(new DataTexture(albedo, width, height, RGBAFormat), 'albedo');
	const detail = configurePbrTexture(new DataTexture(surface, width, height, RGBAFormat), 'bump');
	return { map, detail, dispose() { map.dispose(); detail.dispose(); } };
}
