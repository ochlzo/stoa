import { CanvasTexture, ClampToEdgeWrapping } from 'three';
import type { Page } from '#lib/catalog/reading.ts';
import { LOOKDEV_PALETTE, createSeededRandom } from '#lib/catalog/lookdev.ts';
import { configurePbrTexture, wrapCanvasLines } from '#lib/textures/pbr-texture-cache.ts';
import { createClayPageTexture } from '#lib/textures/page-clay-texture.ts';

const { paperAndInk: ink, volumes } = LOOKDEV_PALETTE;
const width = 768;
const height = 1120;
const serif = 'Georgia, "Times New Roman", serif';
const tau = 2 * Math.PI;

// Typesetting specimen for the existing fixed line slots, pending the literary content pass.
const specimen = ('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
	'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ' +
	'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.').split(' ');

function paperStock() {
	const tile = document.createElement('canvas');
	tile.width = tile.height = 256;
	const ctx = tile.getContext('2d')!;
	ctx.fillStyle = ink.archivalPaper;
	ctx.fillRect(0, 0, 256, 256);
	const random = createSeededRandom(227);
	const pixels = ctx.getImageData(0, 0, 256, 256);
	for (let i = 0; i < pixels.data.length; i += 4) {
		const grain = (random() - 0.63) * 13;
		for (let c = 0; c < 3; c++) pixels.data[i + c] += grain;
	}
	ctx.putImageData(pixels, 0, 0);
	ctx.lineWidth = 0.7;
	for (let i = 0; i < 1300; i++) {
		const x = random() * 256;
		const y = random() * 256;
		ctx.strokeStyle = i % 2 ? 'rgba(118,90,54,0.13)' : 'rgba(255,252,235,0.6)';
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + (random() - 0.5) * 8, y + random() * 4);
		ctx.stroke();
	}
	return tile;
}

function marble(ctx: CanvasRenderingContext2D, index: number) {
	// Pull alternating pigments through a staggered comb, then feather the narrow veins.
	const palette = [ink.endpaperBase, volumes.ochreLinen, volumes.oxblood,
		ink.endpaperBase, volumes.oliveCloth, volumes.navyCloth, ink.goldFoil];
	const stops = [0, 0.32, 0.42, 0.55, 0.62, 0.80, 0.95, 1];
	const colors = palette.map(hex => parseInt(hex.slice(1), 16));
	const field = document.createElement('canvas');
	field.width = 512;
	field.height = 746;
	const painter = field.getContext('2d')!;
	const pixels = painter.createImageData(field.width, field.height);
	for (let y = 0; y < field.height; y++) {
		const v = y / field.height;
		for (let x = 0; x < field.width; x++) {
			const u = x / field.width;
			const comb = u * 6 + 0.36 * Math.sin(tau * (v * 1.3 + index * 0.17)) + 0.14 * Math.sin(tau * (u + v * 3));
			const wave = Math.cos(tau * comb);
			const pulled = v * 10 + 1.15 * Math.sqrt(1.03 + wave) + 0.23 * Math.sin(tau * (2 * u - v));
			const phase = pulled - Math.floor(pulled);
			let band = 0;
			while (phase >= stops[band + 1]) band++;
			const rgb = colors[band];
			const i = (y * field.width + x) * 4;
			pixels.data[i] = rgb >> 16;
			pixels.data[i + 1] = (rgb >> 8) & 255;
			pixels.data[i + 2] = rgb & 255;
			pixels.data[i + 3] = 255;
		}
	}
	painter.putImageData(pixels, 0, 0);
	ctx.save();
	ctx.globalAlpha = 0.72;
	ctx.drawImage(field, 0, 0, width, height);
	ctx.restore();
}

function ornament(ctx: CanvasRenderingContext2D, x: number, y: number) {
	ctx.fillStyle = ink.inkMuted;
	ctx.fillRect(x - 54, y, 42, 1.5);
	ctx.fillRect(x + 12, y, 42, 1.5);
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(Math.PI / 4);
	ctx.fillStyle = volumes.ochreLinen;
	ctx.fillRect(-4, -4, 8, 8);
	ctx.restore();
}

function heading(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	leading: number
) {
	const wrapped = wrapCanvasLines(ctx, text, maxWidth);
	for (let i = 0; i < wrapped.length; i++) {
		ctx.fillText(wrapped[i], x, y + i * leading);
	}
	return y + Math.max(0, wrapped.length - 1) * leading;
}

function body(ctx: CanvasRenderingContext2D, page: Page, left: number, right: number, startY: number) {
	let cursor = page.index * 13;
	const leading = Math.min(34, (height - 135 - startY) / Math.max(1, page.lineCount - 1));
	ctx.textAlign = 'left';
	ctx.font = '600 28px ' + serif;
	ctx.fillStyle = ink.inkPrimary;
	for (let i = 0; i < page.lineCount; i++) {
		const x = left + (i === 0 || page.paragraphBreaks.includes(i) ? 30 : 0);
		const last = i === page.lineCount - 1 || page.paragraphBreaks.includes(i + 1);
		const limit = (right - x) * (last ? 0.68 : 1);
		let line = specimen[cursor++ % specimen.length];
		while (true) {
			const next = line + ' ' + specimen[cursor % specimen.length];
			if (ctx.measureText(next).width > limit) break;
			line = next;
			cursor++;
		}
		ctx.fillText(line, x, startY + i * leading);
	}
}

// One stock tile per open Volume. Each face owns its CanvasTexture, including a turning Leaf's reverse.
export function createReadingPagePainter() {
	let stock: HTMLCanvasElement | undefined;
	return (page: Page, chapterCount: number, clay: boolean) => {
		if (clay) return createClayPageTexture(page, chapterCount);
		const canvas = document.createElement('canvas');
		canvas.width = 1024;
		canvas.height = Math.round(canvas.width * height / width);
		const ctx = canvas.getContext('2d')!;
		ctx.scale(canvas.width / width, canvas.height / height);
		stock ??= paperStock();
		ctx.fillStyle = ctx.createPattern(stock, 'repeat')!;
		ctx.fillRect(0, 0, width, height);
		const left = page.side === 'left' ? 71 : 90;
		const right = width - (page.side === 'left' ? 90 : 71);
		const cx = (left + right) / 2;
		ctx.textAlign = 'center';
		ctx.fillStyle = ink.inkPrimary;
		if (page.kind === 'endpaper') {
			marble(ctx, page.index);
		} else if (page.kind === 'front-title' || page.kind === 'colophon') {
			const title = page.kind === 'front-title';
			ctx.font = '22px ' + serif;
			ctx.fillText('Stoa Library Edition', cx, 238);
			ornament(ctx, cx, 267);
			ctx.font = (title ? '600 64px ' : '600 48px ') + serif;
			const bottom = heading(ctx, title ? page.volumeTitle : 'Finis', cx, 460, right - left, 70);
			ctx.font = 'italic 33px ' + serif;
			ctx.fillText(title ? page.volumeAuthor : page.volumeTitle, cx, bottom + 68);
			ctx.font = '23px ' + serif;
			ctx.fillStyle = ink.inkMuted;
			ctx.fillText(title ? chapterCount + ' Chapters' : page.volumeAuthor, cx, 820);
			ornament(ctx, cx, 860);
		} else {
			const opener = page.kind === 'chapter-start';
			ctx.font = 'italic 600 25px ' + serif;
			ctx.fillStyle = ink.inkMuted;
			ctx.fillText(page.side === 'left' ? page.volumeTitle : 'Chapter ' + page.chapterRomanNumeral, cx, 64);
			let startY = 148;
			if (opener) {
				ctx.font = '600 28px ' + serif;
				ctx.fillText('CHAPTER ' + page.chapterRomanNumeral, cx, 173);
				ctx.font = '600 44px ' + serif;
				ctx.fillStyle = ink.inkPrimary;
				const bottom = heading(ctx, page.chapterTitle ?? '', cx, 242, right - left, 50);
				ornament(ctx, cx, bottom + 41);
				startY = bottom + 108;
			}
			body(ctx, page, left, right, startY);
			ctx.textAlign = 'center';
			ctx.font = '600 25px ' + serif;
			ctx.fillText(String(page.pageNumber), cx, height - 49);
			ctx.textAlign = page.side === 'left' ? 'left' : 'right';
			ctx.fillStyle = ink.inkMuted;
			ctx.font = 'italic 21px ' + serif;
			ctx.fillText('Type specimen', page.side === 'left' ? left : right, height - 49);
		}
		const gutter = page.side === 'left' ? width : 0;
		const shadow = ctx.createLinearGradient(gutter, 0, gutter + (gutter ? -80 : 80), 0);
		shadow.addColorStop(0, 'rgba(73,47,24,0.19)');
		shadow.addColorStop(0.36, 'rgba(73,47,24,0.06)');
		shadow.addColorStop(1, 'rgba(73,47,24,0)');
		ctx.fillStyle = shadow;
		ctx.fillRect(0, 0, width, height);
		return configurePbrTexture(new CanvasTexture(canvas), 'albedo', {
			wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping
		});
	};
}
