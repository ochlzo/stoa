import { DataTexture, LinearFilter } from 'three';
import type { BindingStyleId, Volume } from '#lib/catalog/types.ts';
import { LOOKDEV_PALETTE } from '#lib/catalog/lookdev.ts';
import { PAGE_BLOCK_CLAY_COLOR, VOLUME_CLAY_COLORS } from '#lib/catalog/volumes.ts';
import { configurePbrTexture, createPbrTextureCache } from '#lib/textures/pbr-texture-cache.ts';

type Surface = BindingStyleId | 'paper' | 'headband';
const size = 256;
const tau = 2 * Math.PI;

function hash(x: number, y: number) {
	let n = Math.imul(x + 537, 1597334677) ^ Math.imul(y + 193, 3812015801);
	n = Math.imul(n ^ (n >>> 16), 2246822519);
	return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
}

// The gap between the nearest two cell centers forms the creases in goatskin.
function pebble(u: number, v: number) {
	const cells = 32;
	const x = u * cells;
	const y = v * cells;
	let nearest = 8;
	let second = 8;
	for (let j = -1; j <= 1; j++) {
		for (let i = -1; i <= 1; i++) {
			const col = Math.floor(x) + i;
			const row = Math.floor(y) + j;
			const seedX = (col + cells) % cells;
			const seedY = (row + cells) % cells;
			const dx = col + 0.2 + 0.6 * hash(seedX, seedY) - x;
			const dy = row + 0.2 + 0.6 * hash(seedY, seedX + 79) - y;
			const d = dx * dx + dy * dy;
			if (d < nearest) {
				second = nearest;
				nearest = d;
			} else {
				second = Math.min(second, d);
			}
		}
	}
	return Math.min(1, (second - nearest) * 2.8);
}

const roughness = {
	'raised-band-leather': 0.49, 'linen-cloth': 0.97, 'quarter-vellum': 0.64,
	'blind-tooled-calf': 0.82, paper: 0.96, headband: 0.92
};

function relief(kind: Surface, u: number, v: number, fleck: number) {
	const warp = Math.cos(tau * u * 32);
	const weft = Math.cos(tau * v * 32);
	switch (kind) {
		case 'linen-cloth': {
			const over = (Math.floor(u * 32) + Math.floor(v * 32)) % 2;
			return 0.48 + (over ? warp : weft) * 0.30 + fleck * 0.12;
		}
		case 'raised-band-leather': return pebble(u, v) * 0.84 + fleck * 0.16;
		case 'quarter-vellum': return 0.5 + 0.18 * Math.sin(tau * (u * 3 + v + 0.25 * weft)) + fleck * 0.12;
		case 'blind-tooled-calf': {
			const border = Math.min(u, v, 1 - u, 1 - v);
			const rule = Math.min(Math.abs(border - 0.047), Math.abs(border - 0.064));
			return 0.42 + 0.28 * fleck + 0.12 * warp * weft - 0.4 * Math.exp(-rule * rule * 50000);
		}
		case 'paper': return 0.5 + 0.27 * Math.cos(tau * (u * 74 + 0.13 * Math.sin(tau * v))) + fleck * 0.18;
		case 'headband': return 0.5 + 0.45 * Math.cos(tau * (v * 22 + u * 2));
	}
}

function createMaps(kind: Surface) {
	const color = new Uint8Array(size * size * 4);
	const data = new Uint8Array(color.length);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const h = Math.max(0, Math.min(1, relief(kind, (x + 0.5) / size, (y + 0.5) / size, hash(x, y))));
			const contrast = kind === 'headband' ? 148 : kind === 'quarter-vellum' ? 28 : 55;
			const shade = 255 - (1 - h) * contrast;
			color.set([shade, shade, shade, 255], i);
			// Bump reads red. Roughness reads green from the same linear data map.
			data.set([255 * h, 255 - 48 * h, 0, 255], i);
		}
	}
	const map = configurePbrTexture(new DataTexture(color, size, size), 'albedo');
	const detail = configurePbrTexture(new DataTexture(data, size, size), 'bump');
	map.magFilter = detail.magFilter = LinearFilter;
	return { map, roughnessMap: detail, bumpMap: detail, dispose() { map.dispose(); detail.dispose(); } };
}

export function createVolumeFinishes() {
	const maps = createPbrTextureCache<ReturnType<typeof createMaps>>();
	function finish(kind: Surface, color: string, clay: boolean, clayColor: string, clayRoughness: number) {
		const texture = clay ? null : maps.getOrCreate(kind, () => createMaps(kind));
		return {
			color: clay ? clayColor : color,
			roughness: clay ? clayRoughness : roughness[kind],
			map: texture?.map ?? null, bumpMap: texture?.bumpMap ?? null,
			roughnessMap: texture?.roughnessMap ?? null,
			bumpScale: kind === 'quarter-vellum' ? 0.00004 : 0.00012
		};
	}
	return {
		decorativeCover(kind: BindingStyleId, color: string) {
			return finish(kind, color, false, color, roughness[kind]);
		},
		cover(volume: Volume, clay: boolean, clayRoughness = 0.9) {
			const design = volume.kind === 'readable' ? volume.design : undefined;
			const base = finish(volume.bindingStyle, LOOKDEV_PALETTE.volumes[volume.coverColor], clay,
				VOLUME_CLAY_COLORS[volume.clayTone], clayRoughness);
			if (clay || !design) return base;
			return {
				...base,
				roughness: design.surfaceRoughness ?? base.roughness,
				bumpScale: design.bumpScale ?? base.bumpScale
			};
		},
		paper(clay: boolean) {
			return finish('paper', LOOKDEV_PALETTE.paperAndInk.archivalPaper, clay, PAGE_BLOCK_CLAY_COLOR, 0.95);
		},
		headband(clay: boolean, volume?: Volume) {
			const design = volume?.kind === 'readable' ? volume.design : undefined;
			return finish('headband', design?.headbandColor ?? LOOKDEV_PALETTE.paperAndInk.goldFoil, clay, '#d8d4cc', 0.92);
		},
		dispose: () => maps.dispose()
	};
}

export type VolumeFinishes = ReturnType<typeof createVolumeFinishes>;
