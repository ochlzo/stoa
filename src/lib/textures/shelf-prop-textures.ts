import { CanvasTexture } from 'three';
import { createSeededRandom } from '#lib/catalog/lookdev.ts';
import {
	SHELF_PROP_FINISHES,
	type ShelfPropFinish,
	type ShelfPropFinishPreset
} from '#lib/catalog/shelf-prop-materials.ts';
import { configurePbrTexture, createPbrTextureCache } from '#lib/textures/pbr-texture-cache.ts';

type Point = readonly [number, number];

function polygon(ctx: CanvasRenderingContext2D, points: readonly Point[], color: string) {
	ctx.beginPath();
	points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
}

function print(ctx: CanvasRenderingContext2D, kind: 'coast' | 'temple' | 'hills') {
	ctx.fillStyle = '#dcc9a8';
	ctx.fillRect(0, 0, 512, 512);
	ctx.save();
	ctx.beginPath();
	ctx.rect(26, 27, 460, 458);
	ctx.clip();
	ctx.fillStyle = kind === 'temple' ? '#c9b695' : '#c6c4ad';
	ctx.fillRect(0, 0, 512, 512);
	const colors = kind === 'temple' ? ['#a7977b', '#928569', '#73694f'] : ['#9caaa3', '#7e9289', '#616f5d'];
	for (let k = 0; k < 3; k++) {
		const ridge: Point[] = [[0, 512]];
		for (let x = 0; x <= 512; x += 4) {
			const y = 202 + k * 68 + Math.sin(x / 63 + k * 3) * 25 + Math.cos(x / 35 + k) * 9;
			ridge.push([x, y + Math.sin(x * 1.71) * 2]);
		}
		polygon(ctx, [...ridge, [512, 512]], colors[k]);
	}
	if (kind === 'temple') {
		polygon(ctx, [[77, 215], [253, 139], [425, 209], [400, 223], [92, 229]], '#605642');
		polygon(ctx, [[100, 210], [252, 153], [399, 207]], '#b6a481');
		for (let x = 104; x <= 398; x += 54) {
			ctx.fillStyle = '#c3ae88';
			ctx.fillRect(x, 224, 22, 109);
			ctx.fillStyle = '#847258';
			ctx.fillRect(x + 14, 224, 8, 109);
		}
		ctx.fillStyle = '#a79371';
		ctx.fillRect(82, 332, 340, 12);
		ctx.fillRect(70, 346, 364, 10);
	} else if (kind === 'coast') {
		polygon(ctx, [[0, 317], [315, 297], [199, 332], [342, 350], [150, 384], [0, 459]], '#8caaa7');
		for (const [x,y,s] of [[107,348,1], [163,325,0.57]]) {
			polygon(ctx, [[x,y], [x+15*s,y-22*s], [x+15*s,y]], '#e3d6b6');
			polygon(ctx, [[x+17*s,y-17*s], [x+25*s,y], [x+17*s,y]], '#bd9a78');
			polygon(ctx, [[x-2*s,y+2*s], [x+29*s,y+2*s], [x+22*s,y+6*s], [x+4*s,y+6*s]], '#625849');
		}
		for (let i = 0; i < 28; i++) {
			const x = 280 + (i * 69) % 225;
			const y = 333 + (i * 33) % 135;
			const h = 18 + (i * 17) % 58;
			polygon(ctx, [[x - 7, y], [x, y - h], [x + 8, y]], '#4c5947');
		}
	}
	if (kind === 'hills') {
		polygon(ctx, [[0,365],[194,285],[367,304],[194,351],[0,393]], '#ad986a');
		polygon(ctx, [[108,512],[227,414],[305,375],[336,345],[358,334],[328,375],[268,425],[204,512]], '#c0ac85');
		for (let i = 0; i < 12; i++) {
			const x = 65 + i * 25;
			const y = 350 - 0.15 * x;
			ctx.fillStyle = '#586044';
			ctx.beginPath();
			ctx.ellipse(x, y, 4, 12 + (i * 7) % 13, 0.04, 0, 2 * Math.PI);
			ctx.fill();
		}
	}
	// Broken dry-brush strokes soften flat washes at the scale of the print.
	for (let i = 0; i < 3600; i++) {
		const x = (i * 179.43) % 512;
		const y = (i * 317.73 + Math.sin(i) * 51) % 512;
		ctx.fillStyle = i % 3 ? 'rgba(248,227,188,0.12)' : 'rgba(53,55,45,0.13)';
		ctx.fillRect(x, y, 2 + (i * 17) % 11, 0.8 + (i % 3));
	}
	ctx.restore();
}

function atlas(ctx: CanvasRenderingContext2D) {
	ctx.fillStyle = '#c2a77a';
	ctx.fillRect(0, 0, 512, 512);
	// Broad continental silhouettes in longitude and latitude on an equirectangular globe.
	const land: Point[][] = [
		[[-168,65],[-140,70],[-99,73],[-61,53],[-81,27],[-96,18],[-81,9],[-112,24],[-124,43]],
		[[-80,10],[-61,12],[-35,-6],[-51,-34],[-69,-55],[-78,-15]],
		[[-53,60],[-72,78],[-24,83],[-20,70]],
		[[-11,36],[-8,58],[20,71],[50,59],[94,78],[172,64],[140,42],[121,23],[103,8],[79,29],[77,9],[56,26],[43,13],[34,31],[21,40]],
		[[-17,17],[-9,35],[17,37],[36,30],[51,11],[38,-11],[26,-34],[17,-35],[9,-5],[-9,5]],
		[[113,-22],[132,-12],[153,-25],[145,-39],[115,-33]]
	];
	for (const coast of land) polygon(ctx, coast.map(([x,y]) => [(x + 180) / 360 * 512, (90-y) / 180 * 512]), '#837453');
	ctx.strokeStyle = '#9c855e';
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let i = 0; i <= 12; i++) {
		ctx.moveTo(i * 512/12, 0); ctx.lineTo(i * 512/12, 512);
		ctx.moveTo(0, i * 512/6); ctx.lineTo(512, i * 512/6);
	}
	ctx.stroke();
}

function paint(kind: ShelfPropFinish) {
	const preset: ShelfPropFinishPreset = SHELF_PROP_FINISHES[kind];
	const pattern = preset.pattern ?? 'none';
	const noise = preset.noise ?? 'none';
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 512;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#faf8f3';
	ctx.fillRect(0, 0, 512, 512);
	if (pattern === 'globe') atlas(ctx);
	else if (pattern === 'coast' || pattern === 'temple' || pattern === 'hills') print(ctx, pattern);
	else if (pattern === 'foliage') {
		const wash = ctx.createLinearGradient(0, 0, 512, 0);
		wash.addColorStop(0, '#a7af8a');
		wash.addColorStop(0.49, '#e7e8c6');
		wash.addColorStop(0.5, '#ffffdc');
		wash.addColorStop(0.52, '#d6dbb7');
		wash.addColorStop(1, '#b4bc95');
		ctx.fillStyle = wash;
		ctx.fillRect(0, 0, 512, 512);
		ctx.strokeStyle = '#e3e4c2';
		ctx.lineWidth = 3;
		for (let y = 75; y <= 500; y += 68) {
			ctx.beginPath();
			ctx.moveTo(72, y - 66);
			ctx.quadraticCurveTo(155, y - 12, 256, y);
			ctx.quadraticCurveTo(373, y - 20, 443, y - 86);
			ctx.stroke();
		}
	} else if (pattern === 'botanical') {
		ctx.strokeStyle = ctx.fillStyle = '#54634e';
		ctx.lineWidth = 3;
		for (let x = 0; x < 512; x += 128) {
			ctx.beginPath();
			ctx.moveTo(x + 18, 360);
			ctx.quadraticCurveTo(x + 62, 312, x + 78, 217);
			ctx.stroke();
			for (let i = 0; i < 7; i++) {
				const side = i % 2 ? 1 : -1;
				ctx.beginPath();
				ctx.ellipse(x + 29 + i * 8 + side * 10, 333 - i * 17, 7, 19, side * 0.7, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}
	// Fine pigment, pores, or tool marks across each continuous UV tile.
	const pixels = ctx.getImageData(0, 0, 512, 512);
	const random = createSeededRandom(721);
	for (let i = 0; i < pixels.data.length; i += 4) {
		const n = random();
		const x = (i / 4) % 512;
		const y = Math.floor(i / 2048);
		let shade = n * 0.065;
		if (noise === 'wood') shade += 0.14 * (1 + Math.sin(y * 0.31 + Math.sin(x / 80) * 2));
		else if (noise === 'veined')
			shade += 0.18 * Math.pow(0.5 + 0.5 * Math.sin((x + y * 2) / 27 + Math.sin(y / 33)), 13);
		else if (noise === 'speckled') shade += n > 0.96 ? 0.24 : 0;
		else if (noise === 'brushed') shade += 0.06 * (1 + Math.sin(y * 1.9));
		for (let c = 0; c < 3; c++) pixels.data[i + c] *= 1 - shade;
	}
	ctx.putImageData(pixels, 0, 0);
	return configurePbrTexture(new CanvasTexture(canvas), 'albedo');
}

export function createShelfPropTextures() {
	const textures = createPbrTextureCache<CanvasTexture>();
	return {
		get: (kind: ShelfPropFinish) => textures.getOrCreate(kind, () => paint(kind)),
		dispose: () => textures.dispose()
	};
}
