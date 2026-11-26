import { CanvasTexture, ClampToEdgeWrapping } from 'three';
import type { Page } from '#lib/catalog/reading.ts';
import type { EndpaperPaintInfo, VolumeDesign } from '#lib/catalog/readable/types.ts';
import { LOOKDEV_PALETTE, createSeededRandom } from '#lib/catalog/lookdev.ts';
import { drawStoaCombinationMark } from '#lib/textures/brand-mark.ts';
import { configurePbrTexture, wrapCanvasLines } from '#lib/textures/pbr-texture-cache.ts';
import { createClayPageTexture } from '#lib/textures/page-clay-texture.ts';

const { paperAndInk: defaultInk, volumes } = LOOKDEV_PALETTE;
const width = 768;
const height = 1120;
const defaultSerif = 'Georgia, "Times New Roman", serif';
const tau = 2 * Math.PI;
const BOOKPLATE_PAPER = '#E7E1D2';
const BOOKPLATE_INK = '#473929';

interface PageTheme {
	paperTint: string;
	inkPrimary: string;
	inkMuted: string;
	accent: string;
	font: string;
}

function resolvePageTheme(design?: VolumeDesign): PageTheme {
	return {
		paperTint: design?.paperTint ?? defaultInk.archivalPaper,
		inkPrimary: design?.inkColor ?? defaultInk.inkPrimary,
		inkMuted: design?.mutedInkColor ?? defaultInk.inkMuted,
		accent: design?.accentColor ?? volumes.ochreLinen,
		font: design?.fontFamily ?? defaultSerif
	};
}

// Typesetting specimen for the existing fixed line slots, pending the literary content pass.
const specimen = (
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
	'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ' +
	'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
).split(' ');

function paperStock(tint: string) {
	const tile = document.createElement('canvas');
	tile.width = tile.height = 256;
	const ctx = tile.getContext('2d')!;
	ctx.fillStyle = tint;
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

function marble(
	ctx: CanvasRenderingContext2D,
	index: number,
	endpaperColors?: VolumeDesign['endpaperColors']
) {
	// Pull alternating pigments through a staggered comb, then feather the narrow veins.
	const [c1, c2, c3] = endpaperColors
		? [volumes[endpaperColors[0]], volumes[endpaperColors[1]], volumes[endpaperColors[2]]]
		: [volumes.ochreLinen, volumes.oxblood, volumes.oliveCloth];
	const palette = [defaultInk.endpaperBase, c1, c2, defaultInk.endpaperBase, c3, volumes.navyCloth, defaultInk.goldFoil];
	const stops = [0, 0.32, 0.42, 0.55, 0.62, 0.80, 0.95, 1];
	const colors = palette.map((hex) => parseInt(hex.slice(1), 16));
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

function drawEndpaperPattern(
	ctx: CanvasRenderingContext2D,
	index: number,
	design?: VolumeDesign
) {
	const style = design?.endpaperStyle ?? 'marbled';
	const [c1, c2, c3] = design?.endpaperColors
		? [volumes[design.endpaperColors[0]], volumes[design.endpaperColors[1]], volumes[design.endpaperColors[2]]]
		: [volumes.ochreLinen, volumes.oxblood, volumes.oliveCloth];

	if (style === 'marbled') {
		marble(ctx, index, design?.endpaperColors);
		return;
	}

	if (style === 'plain') {
		ctx.save();
		ctx.fillStyle = c1;
		ctx.globalAlpha = 0.28;
		ctx.fillRect(0, 0, width, height);
		ctx.restore();
		return;
	}

	if (style === 'ruled') {
		ctx.save();
		ctx.fillStyle = c1;
		ctx.globalAlpha = 0.14;
		ctx.fillRect(0, 0, width, height);
		ctx.globalAlpha = 0.38;
		ctx.strokeStyle = c2;
		ctx.lineWidth = 1;
		for (let x = 28; x < width; x += 36) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
			ctx.stroke();
		}
		ctx.strokeStyle = c3;
		ctx.globalAlpha = 0.24;
		for (let y = 28; y < height; y += 36) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}
		ctx.restore();
		return;
	}

	if (style === 'botanical') {
		ctx.save();
		ctx.fillStyle = c1;
		ctx.globalAlpha = 0.16;
		ctx.fillRect(0, 0, width, height);
		const stepX = 96;
		const stepY = 112;
		for (let row = -1; row <= Math.ceil(height / stepY) + 1; row++) {
			const offsetX = row % 2 === 0 ? 0 : stepX / 2;
			for (let col = -1; col <= Math.ceil(width / stepX) + 1; col++) {
				const cx = col * stepX + offsetX;
				const cy = row * stepY;
				ctx.save();
				ctx.translate(cx, cy);
				ctx.strokeStyle = c3;
				ctx.globalAlpha = 0.42;
				ctx.lineWidth = 1.4;
				ctx.beginPath();
				ctx.moveTo(0, -28);
				ctx.lineTo(0, 28);
				ctx.stroke();
				ctx.fillStyle = c2;
				ctx.globalAlpha = 0.36;
				for (const side of [-1, 1]) {
					for (const ly of [-12, 8]) {
						ctx.beginPath();
						ctx.ellipse(side * 12, ly, 12, 4.8, side * -0.5, 0, tau);
						ctx.fill();
					}
				}
				ctx.restore();
			}
		}
		ctx.restore();
	}
}

/**
 * Pasted-in archival Ex Libris Bookplate centered on the front endpaper (Spread 0 left).
 */
function drawExLibrisBookplate(
	ctx: CanvasRenderingContext2D,
	cx: number,
	stockTile: HTMLCanvasElement,
	design?: VolumeDesign
) {
	const cardW = 376;
	const cardH = 276;
	const cardX = cx - cardW / 2;
	const cardY = 500 - cardH / 2;

	ctx.save();
	ctx.shadowColor = 'rgba(30, 18, 8, 0.28)';
	ctx.shadowBlur = 18;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 5;
	ctx.fillStyle = BOOKPLATE_PAPER;
	ctx.fillRect(cardX, cardY, cardW, cardH);
	ctx.restore();

	ctx.save();
	ctx.globalAlpha = 0.28;
	ctx.fillStyle = ctx.createPattern(stockTile, 'repeat')!;
	ctx.fillRect(cardX, cardY, cardW, cardH);
	ctx.restore();

	// Fine double-ruled bookplate frame
	ctx.save();
	ctx.strokeStyle = BOOKPLATE_INK;
	ctx.lineWidth = 1.6;
	ctx.strokeRect(cardX + 12, cardY + 12, cardW - 24, cardH - 24);
	ctx.lineWidth = 0.75;
	ctx.globalAlpha = 0.72;
	ctx.strokeRect(cardX + 19, cardY + 19, cardW - 38, cardH - 38);

	// Corner diamonds
	ctx.fillStyle = BOOKPLATE_INK;
	for (const x of [cardX + 19, cardX + cardW - 19]) {
		for (const y of [cardY + 19, cardY + cardH - 19]) {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(Math.PI / 4);
			ctx.fillRect(-3, -3, 6, 6);
			ctx.restore();
		}
	}

	// Header: EX LIBRIS
	ctx.globalAlpha = 0.82;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = '600 15px ' + defaultSerif;
	ctx.fillText('E X   L I B R I S', cx, cardY + 52);

	ctx.globalAlpha = 0.45;
	ctx.fillRect(cx - 82, cardY + 72, 164, 1);

	// Stoa Bookplate combination mark
	ctx.globalAlpha = 1;
	ctx.fillStyle = BOOKPLATE_INK;
	drawStoaCombinationMark(ctx, cx, cardY + 144, 240, 74);

	// Footer rule & imprint
	ctx.globalAlpha = 0.45;
	ctx.fillRect(cx - 82, cardY + 206, 164, 1);

	ctx.globalAlpha = 0.75;
	ctx.font = 'italic 16px ' + defaultSerif;
	ctx.fillText(design?.editionLine ?? 'Stoa Library Edition', cx, cardY + 230);
	ctx.restore();
}

function ornament(ctx: CanvasRenderingContext2D, x: number, y: number, theme: PageTheme) {
	ctx.fillStyle = theme.inkMuted;
	ctx.fillRect(x - 54, y, 42, 1.5);
	ctx.fillRect(x + 12, y, 42, 1.5);
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(Math.PI / 4);
	ctx.fillStyle = theme.accent;
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

function specimenBody(
	ctx: CanvasRenderingContext2D,
	page: Page,
	left: number,
	right: number,
	startY: number,
	theme: PageTheme
) {
	let cursor = page.index * 13;
	const leading = Math.min(34, (height - 135 - startY) / Math.max(1, page.lineCount - 1));
	ctx.textAlign = 'left';
	ctx.font = '600 28px ' + theme.font;
	ctx.fillStyle = theme.inkPrimary;
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

function literaryBody(
	ctx: CanvasRenderingContext2D,
	page: Page,
	left: number,
	right: number,
	startY: number,
	theme: PageTheme
) {
	const lines = page.lines;
	if (!lines || lines.length === 0) return;
	const isVerse = page.contentMode === 'verse';
	const maxWidth = right - left;
	let y = startY;

	if (page.epigraph) {
		ctx.textAlign = 'center';
		ctx.font = 'italic 22px ' + theme.font;
		ctx.fillStyle = theme.inkMuted;
		y = heading(ctx, page.epigraph, (left + right) / 2, y, maxWidth - 36, 28) + 42;
	}

	const gapCount = lines.filter((line) => line.stanzaGapBefore).length;
	const totalUnits = Math.max(1, lines.length - 1 + gapCount * 0.65);
	const leading = Math.min(35, (height - 128 - y) / totalUnits);

	ctx.textAlign = 'left';
	ctx.font = (isVerse ? '26px ' : '27px ') + theme.font;
	ctx.fillStyle = theme.inkPrimary;

	for (const line of lines) {
		if (line.stanzaGapBefore) y += leading * 0.65;
		const indent = line.indent ? (isVerse ? 22 : 28) : 0;
		const available = Math.max(120, maxWidth - indent);
		ctx.fillText(line.text, left + indent, y, available);
		y += leading;
	}
}

function drawGutterShadow(ctx: CanvasRenderingContext2D, side: Page['side']) {
	const gutter = side === 'left' ? width : 0;
	const shadow = ctx.createLinearGradient(gutter, 0, gutter + (gutter ? -80 : 80), 0);
	shadow.addColorStop(0, 'rgba(73,47,24,0.19)');
	shadow.addColorStop(0.36, 'rgba(73,47,24,0.06)');
	shadow.addColorStop(1, 'rgba(73,47,24,0)');
	ctx.fillStyle = shadow;
	ctx.fillRect(0, 0, width, height);
}

function drawStanza(
	ctx: CanvasRenderingContext2D,
	page: Page,
	left: number,
	right: number,
	theme: PageTheme
) {
	const lines = page.lines ?? [];
	const cx = (left + right) / 2;
	const maxWidth = right - left;
	const leading = Math.min(48, 640 / Math.max(1, lines.length));
	const startY = 565 - (lines.length - 1) * leading / 2;

	ctx.font = '600 28px ' + theme.font;
	ctx.fillStyle = theme.inkMuted;
	ctx.fillText('Stanza ' + page.stanzaNumber, cx, 164);
	ornament(ctx, cx, 195, theme);

	ctx.font = '34px ' + theme.font;
	const widest = Math.max(1, ...lines.map(({ text }) => ctx.measureText(text).width));
	const fontSize = Math.min(34, 34 * maxWidth / widest, leading * 0.78);
	ctx.font = fontSize + 'px ' + theme.font;
	const textWidth = Math.max(0, ...lines.map(({ text }) => ctx.measureText(text).width));
	ctx.fillStyle = theme.inkPrimary;
	ctx.textAlign = 'left';
	for (const [index, line] of lines.entries()) {
		ctx.fillText(line.text, cx - textWidth / 2, startY + index * leading);
	}

	ctx.textAlign = 'center';
	ctx.font = '600 25px ' + theme.font;
	ctx.fillText(String(page.pageNumber), cx, height - 49);
}

function drawIllustrationPlate(
	ctx: CanvasRenderingContext2D,
	page: Page,
	left: number,
	right: number,
	cx: number,
	texture: CanvasTexture,
	theme: PageTheme
) {
	const fullPage = page.stanzaNumber !== undefined;
	const frameX = fullPage ? 0 : left + 14;
	const frameY = fullPage ? 0 : 148;
	const frameW = fullPage ? width : right - left - 28;
	const frameH = fullPage ? height : 710;

	if (!fullPage) {
		// Outer & inner archival plate border
		ctx.strokeStyle = theme.inkMuted;
		ctx.lineWidth = 1.6;
		ctx.strokeRect(frameX, frameY, frameW, frameH);
		ctx.lineWidth = 0.8;
		ctx.strokeRect(frameX + 8, frameY + 8, frameW - 16, frameH - 16);
	}

	if (page.illustrationCaption) {
		ctx.textAlign = 'center';
		ctx.font = 'italic 23px ' + theme.font;
		ctx.fillStyle = theme.inkMuted;
		heading(ctx, page.illustrationCaption, cx, frameY + frameH + 46, frameW, 30);
	}

	if (!fullPage && page.pageNumber !== null) {
		ctx.textAlign = 'center';
		ctx.font = '600 25px ' + theme.font;
		ctx.fillStyle = theme.inkPrimary;
		ctx.fillText(String(page.pageNumber), cx, height - 49);
	}

	if (!page.illustrationSrc || typeof Image === 'undefined') return;
	const resolvedSrc = new URL(page.illustrationSrc.replace(/^\/+/, ''), document.baseURI).href;
	const img = new Image();
	img.crossOrigin = 'anonymous';
	img.onload = () => {
		const pad = fullPage ? 0 : 20;
		const scaleImage = fullPage ? Math.max : Math.min;
		const scale = scaleImage(
			(frameW - pad * 2) / img.naturalWidth,
			(frameH - pad * 2) / img.naturalHeight
		);
		const drawW = img.naturalWidth * scale;
		const drawH = img.naturalHeight * scale;
		const drawX = frameX + (frameW - drawW) / 2;
		const drawY = frameY + (frameH - drawH) / 2;

		ctx.save();
		if (!fullPage) {
			ctx.globalCompositeOperation = 'multiply';
			ctx.globalAlpha = 0.92;
		}
		ctx.drawImage(img, drawX, drawY, drawW, drawH);
		ctx.restore();

		drawGutterShadow(ctx, page.side);
		texture.needsUpdate = true;
	};
	img.src = resolvedSrc;
}

// One stock tile per tint per open Volume. Each face owns its CanvasTexture, including a turning Leaf's reverse.
export function createReadingPagePainter() {
	const stockByTint = new Map<string, HTMLCanvasElement>();
	function getStock(tint: string) {
		let tile = stockByTint.get(tint);
		if (!tile) {
			tile = paperStock(tint);
			stockByTint.set(tint, tile);
		}
		return tile;
	}

	return (page: Page, chapterCount: number, clay: boolean, design?: VolumeDesign) => {
		if (clay) return createClayPageTexture(page, chapterCount);
		const theme = resolvePageTheme(design);
		const canvas = document.createElement('canvas');
		canvas.width = 1024;
		canvas.height = Math.round((canvas.width * height) / width);
		const ctx = canvas.getContext('2d')!;
		ctx.scale(canvas.width / width, canvas.height / height);
		const stockTile = getStock(theme.paperTint);
		ctx.fillStyle = ctx.createPattern(stockTile, 'repeat')!;
		ctx.fillRect(0, 0, width, height);
		const left = page.side === 'left' ? 71 : 90;
		const right = width - (page.side === 'left' ? 90 : 71);
		const cx = (left + right) / 2;
		ctx.textAlign = 'center';
		ctx.fillStyle = theme.inkPrimary;

		const texture = configurePbrTexture(new CanvasTexture(canvas), 'albedo', {
			wrapS: ClampToEdgeWrapping,
			wrapT: ClampToEdgeWrapping
		});

		if (page.kind === 'endpaper') {
			const showBookplate = page.index === 0 && design?.showBookplate !== false;
			const defaultEndpaper = () => drawEndpaperPattern(ctx, page.index, design);

			if (design?.paintEndpaper) {
				const info: EndpaperPaintInfo = {
					width,
					height,
					pageIndex: page.index,
					side: page.side,
					defaultPaint: defaultEndpaper
				};
				design.paintEndpaper(ctx, info);
			} else {
				defaultEndpaper();
			}

			if (showBookplate) {
				drawExLibrisBookplate(ctx, cx, stockTile, design);
			}

			if (design?.endpaperTextureSrc && typeof Image !== 'undefined') {
				const resolvedSrc = new URL(design.endpaperTextureSrc.replace(/^\/+/, ''), document.baseURI).href;
				const img = new Image();
				img.crossOrigin = 'anonymous';
				img.onload = () => {
					const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
					const drawW = img.naturalWidth * scale;
					const drawH = img.naturalHeight * scale;
					ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
					if (showBookplate) {
						drawExLibrisBookplate(ctx, cx, stockTile, design);
					}
					drawGutterShadow(ctx, page.side);
					texture.needsUpdate = true;
				};
				img.src = resolvedSrc;
			}
		} else if (page.kind === 'front-title' || page.kind === 'colophon') {
			const title = page.kind === 'front-title';
			ctx.font = '22px ' + theme.font;
			ctx.fillText(design?.editionLine ?? 'Stoa Library Edition', cx, 238);
			ornament(ctx, cx, 267, theme);
			ctx.font = (title ? '600 64px ' : '600 48px ') + theme.font;
			const bottom = heading(ctx, title ? page.volumeTitle : 'Finis', cx, 460, right - left, 70);
			ctx.font = 'italic 33px ' + theme.font;
			ctx.fillText(title ? page.volumeAuthor : page.volumeTitle, cx, bottom + 68);
			if (title && page.volumeSubtitle) {
				ctx.font = 'italic 24px ' + theme.font;
				ctx.fillStyle = theme.inkMuted;
				heading(ctx, page.volumeSubtitle, cx, bottom + 124, right - left - 30, 30);
			}
			if (title && page.volumeTranslator) {
				ctx.font = '22px ' + theme.font;
				ctx.fillStyle = theme.inkMuted;
				ctx.fillText('Translated by ' + page.volumeTranslator, cx, 756);
			}
			ctx.font = '23px ' + theme.font;
			ctx.fillStyle = theme.inkMuted;
			if (title) {
				if (chapterCount > 0) {
					const unit = chapterCount === 1 ? 'Section' : 'Chapters';
					ctx.fillText(chapterCount + ' ' + unit, cx, 820);
				}
			} else if (page.colophonNote) {
				heading(ctx, page.colophonNote, cx, 780, right - left - 40, 28);
			} else {
				ctx.fillText(page.volumeAuthor, cx, 820);
			}
			ornament(ctx, cx, 872, theme);
			if (title && page.sourceNote) {
				ctx.font = 'italic 19px ' + theme.font;
				ctx.fillStyle = theme.inkMuted;
				heading(ctx, page.sourceNote, cx, 932, right - left - 44, 26);
			}
		} else if (page.kind === 'illustration') {
			if (page.stanzaNumber === undefined) {
				ctx.font = 'italic 600 25px ' + theme.font;
				ctx.fillStyle = theme.inkMuted;
				ctx.fillText(page.chapterTitle ?? page.volumeTitle, cx, 64);
			}
			drawIllustrationPlate(ctx, page, left, right, cx, texture, theme);
		} else if (page.stanzaNumber !== undefined) {
			drawStanza(ctx, page, left, right, theme);
		} else {
			const opener = page.kind === 'chapter-start';
			ctx.font = 'italic 600 25px ' + theme.font;
			ctx.fillStyle = theme.inkMuted;
			ctx.fillText(
				page.side === 'left' ? page.volumeTitle : 'Chapter ' + page.chapterRomanNumeral,
				cx,
				64
			);
			let startY = 148;
			if (opener) {
				ctx.font = '600 28px ' + theme.font;
				ctx.fillText('CHAPTER ' + page.chapterRomanNumeral, cx, 173);
				ctx.font = '600 44px ' + theme.font;
				ctx.fillStyle = theme.inkPrimary;
				const bottom = heading(ctx, page.chapterTitle ?? '', cx, 242, right - left, 50);
				ornament(ctx, cx, bottom + 41, theme);
				startY = bottom + 108;
			}
			const isLiterary = page.contentMode === 'prose' || page.contentMode === 'verse';
			if (isLiterary) {
				literaryBody(ctx, page, left, right, startY, theme);
			} else {
				specimenBody(ctx, page, left, right, startY, theme);
			}
			ctx.textAlign = 'center';
			ctx.font = '600 25px ' + theme.font;
			ctx.fillStyle = theme.inkPrimary;
			ctx.fillText(String(page.pageNumber), cx, height - 49);
			if (!isLiterary) {
				ctx.textAlign = page.side === 'left' ? 'left' : 'right';
				ctx.fillStyle = theme.inkMuted;
				ctx.font = 'italic 21px ' + theme.font;
				ctx.fillText('Type specimen', page.side === 'left' ? left : right, height - 49);
			}
		}

		drawGutterShadow(ctx, page.side);
		texture.needsUpdate = true;
		return texture;
	};
}
