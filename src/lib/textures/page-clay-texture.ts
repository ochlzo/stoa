import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import type { Page } from '#lib/catalog/reading.ts';

const PAGE_CANVAS_WIDTH = 768;
const PAGE_CANVAS_HEIGHT = 1120;

const CLAY_PAPER_BASE = '#eeebe3';
const CLAY_INK_PRIMARY = '#4a4640';
const CLAY_INK_MUTED = '#7b756c';
const CLAY_BLOCK_DARK = '#b8b2a7';
const CLAY_RULE_LINE = '#cfc9be';

function drawWrappedCenteredText(
	ctx: CanvasRenderingContext2D,
	text: string,
	centerX: number,
	startY: number,
	maxWidth: number,
	lineHeight: number
): number {
	const words = text.split(/\s+/);
	let line = '';
	let y = startY;

	for (const word of words) {
		const candidate = line ? `${line} ${word}` : word;
		if (ctx.measureText(candidate).width > maxWidth && line) {
			ctx.fillText(line, centerX, y);
			line = word;
			y += lineHeight;
		} else {
			line = candidate;
		}
	}
	if (line) {
		ctx.fillText(line, centerX, y);
		y += lineHeight;
	}
	return y;
}

function drawGutterShading(ctx: CanvasRenderingContext2D, side: Page['side']): void {
	const w = PAGE_CANVAS_WIDTH;
	const h = PAGE_CANVAS_HEIGHT;
	const gradientWidth = w * 0.16;

	// Inner spine crease sits on the right edge of a left Page and the left edge of a right Page.
	const grad =
		side === 'left'
			? ctx.createLinearGradient(w - gradientWidth, 0, w, 0)
			: ctx.createLinearGradient(gradientWidth, 0, 0, 0);

	grad.addColorStop(0, 'rgba(72, 66, 58, 0)');
	grad.addColorStop(0.65, 'rgba(72, 66, 58, 0.045)');
	grad.addColorStop(1, 'rgba(60, 54, 46, 0.14)');

	ctx.fillStyle = grad;
	if (side === 'left') {
		ctx.fillRect(w - gradientWidth, 0, gradientWidth, h);
	} else {
		ctx.fillRect(0, 0, gradientWidth, h);
	}
}

function drawPageChrome(ctx: CanvasRenderingContext2D, page: Page): void {
	const w = PAGE_CANVAS_WIDTH;
	const h = PAGE_CANVAS_HEIGHT;

	// Asymmetric book margins: slightly wider inner gutter margin.
	const marginOuter = 74;
	const marginInner = 96;
	const leftX = page.side === 'left' ? marginOuter : marginInner;
	const rightX = page.side === 'left' ? w - marginInner : w - marginOuter;
	ctx.textBaseline = 'middle';

	// Running header on body/chapter pages.
	if (page.kind === 'body' || page.kind === 'chapter-start') {
		ctx.font = 'italic 20px Georgia, "Times New Roman", serif';
		ctx.fillStyle = CLAY_INK_MUTED;
		ctx.textAlign = 'center';
		const headerText =
			page.side === 'left'
				? page.volumeTitle.toUpperCase()
				: page.chapterRomanNumeral
					? `CHAPTER ${page.chapterRomanNumeral}`
					: page.volumeTitle.toUpperCase();
		ctx.fillText(headerText, (leftX + rightX) / 2, 52);
	}

	// Crisp folio page number at the bottom margin.
	if (page.pageNumber !== null) {
		ctx.font = '600 24px Georgia, "Times New Roman", serif';
		ctx.fillStyle = CLAY_INK_PRIMARY;
		ctx.textAlign = 'center';
		ctx.fillText(String(page.pageNumber), (leftX + rightX) / 2, h - 48);
	}
}

function drawFrontTitlePage(ctx: CanvasRenderingContext2D, page: Page, chapterCount: number): void {
	const w = PAGE_CANVAS_WIDTH;
	const cx = w * 0.52;

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	// Top clay ornament rule
	ctx.fillStyle = CLAY_BLOCK_DARK;
	ctx.fillRect(cx - 110, 240, 220, 4);

	ctx.font = '600 20px Georgia, "Times New Roman", serif';
	ctx.fillStyle = CLAY_INK_MUTED;
	ctx.fillText('STOA LIBRARY EDITION', cx, 290);

	// Title
	ctx.font = '700 54px Georgia, "Times New Roman", serif';
	ctx.fillStyle = CLAY_INK_PRIMARY;
	const afterTitleY = drawWrappedCenteredText(ctx, page.volumeTitle, cx, 420, 440, 64);

	// Decorative rule
	ctx.fillStyle = CLAY_BLOCK_DARK;
	ctx.fillRect(cx - 70, afterTitleY + 26, 140, 3);

	// Author
	ctx.font = 'italic 32px Georgia, "Times New Roman", serif';
	ctx.fillStyle = CLAY_INK_PRIMARY;
	ctx.fillText(page.volumeAuthor, cx, afterTitleY + 86);

	// Chapter summary block
	ctx.fillStyle = CLAY_RULE_LINE;
	ctx.fillRect(cx - 120, 760, 240, 2);
	ctx.font = '600 18px Georgia, "Times New Roman", serif';
	ctx.fillStyle = CLAY_INK_MUTED;
	ctx.fillText(`${chapterCount} CHAPTERS`, cx, 810);
}

function drawColophonPage(ctx: CanvasRenderingContext2D, page: Page): void {
	const w = PAGE_CANVAS_WIDTH;
	const h = PAGE_CANVAS_HEIGHT;
	const cx = w * 0.52;

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	ctx.fillStyle = CLAY_BLOCK_DARK;
	ctx.fillRect(cx - 80, h * 0.41, 160, 3);

	ctx.font = '700 34px Georgia, "Times New Roman", serif';
	ctx.fillStyle = CLAY_INK_PRIMARY;
	ctx.fillText('FINIS', cx, h * 0.47);

	ctx.font = 'italic 22px Georgia, "Times New Roman", serif';
	ctx.fillStyle = CLAY_INK_MUTED;
	ctx.fillText(page.volumeTitle, cx, h * 0.53);
	ctx.fillText(page.volumeAuthor, cx, h * 0.568);

	ctx.fillStyle = CLAY_BLOCK_DARK;
	ctx.fillRect(cx - 80, h * 0.615, 160, 3);
}

function drawRuledLines(
	ctx: CanvasRenderingContext2D,
	page: Page,
	startY: number,
	endY: number
): void {
	const w = PAGE_CANVAS_WIDTH;
	const leftX = (page.side === 'left' ? 74 : 96) + 28;
	const rightX = (page.side === 'left' ? w - 96 : w - 74) - 28;
	const fullW = rightX - leftX;
	const count = Math.max(1, page.lineCount);
	const spacing = Math.min(31, (endY - startY) / count);
	const breaks = new Set(page.paragraphBreaks);

	for (let i = 0; i < count; i += 1) {
		const y = startY + i * spacing;
		const isParaStart = i === 0 || breaks.has(i);
		const isParaEnd = i === count - 1 || breaks.has(i + 1);

		const indent = isParaStart ? 26 : 0;
		const trimRight = isParaEnd ? fullW * (0.18 + ((page.index * 7 + i * 13) % 24) / 100) : ((i * 17 + page.index * 5) % 18);
		const lineW = Math.max(fullW * 0.35, fullW - indent - trimRight);

		ctx.fillStyle = CLAY_RULE_LINE;
		ctx.fillRect(leftX + indent, y, lineW, 9);
	}
}

function drawChapterStart(ctx: CanvasRenderingContext2D, page: Page): void {
	const w = PAGE_CANVAS_WIDTH;
	const leftX = page.side === 'left' ? 74 : 96;
	const rightX = page.side === 'left' ? w - 96 : w - 74;
	const cx = (leftX + rightX) / 2;

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	// Chapter header block
	ctx.fillStyle = 'rgba(184, 178, 167, 0.25)';
	ctx.fillRect(leftX + 26, 134, rightX - leftX - 52, 168);

	ctx.font = '700 22px Georgia, "Times New Roman", serif';
	ctx.fillStyle = CLAY_INK_MUTED;
	ctx.fillText(`CHAPTER ${page.chapterRomanNumeral ?? ''}`, cx, 176);

	ctx.fillStyle = CLAY_BLOCK_DARK;
	ctx.fillRect(cx - 56, 202, 112, 3);

	ctx.font = '700 26px Georgia, "Times New Roman", serif';
	ctx.fillStyle = CLAY_INK_PRIMARY;
	drawWrappedCenteredText(ctx, page.chapterTitle ?? '', cx, 240, rightX - leftX - 96, 32);

	drawRuledLines(ctx, page, 356, PAGE_CANVAS_HEIGHT - 134);
}

/**
 * Generates a neutral Clay-pass procedural CanvasTexture for a single Page of an
 * open Spread (ADR 0002 & ADR 0005). Callers must call `texture.dispose()` on
 * Spread change or unmount to avoid WebGL texture leaks.
 */
export function createClayPageTexture(
	page: Page,
	chapterCount: number
): CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = PAGE_CANVAS_WIDTH;
	canvas.height = PAGE_CANVAS_HEIGHT;

	const ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.fillStyle = CLAY_PAPER_BASE;
		ctx.fillRect(0, 0, PAGE_CANVAS_WIDTH, PAGE_CANVAS_HEIGHT);

		drawPageChrome(ctx, page);

		switch (page.kind) {
			case 'endpaper':
				// The unprinted endpaper lines the inside cover.
				break;
			case 'front-title':
				drawFrontTitlePage(ctx, page, chapterCount);
				break;
			case 'chapter-opener': {
				ctx.fillStyle = 'rgba(184, 178, 167, 0.45)';
				ctx.fillRect(40, 64, PAGE_CANVAS_WIDTH - 80, PAGE_CANVAS_HEIGHT - 148);
				ctx.textAlign = 'center';
				ctx.fillStyle = CLAY_INK_PRIMARY;
				ctx.font = '700 26px Georgia, "Times New Roman", serif';
				ctx.fillText(`CHAPTER ${page.chapterRomanNumeral ?? ''}`, PAGE_CANVAS_WIDTH / 2, 180);
				ctx.font = '700 38px Georgia, "Times New Roman", serif';
				drawWrappedCenteredText(ctx, page.chapterTitle ?? '', PAGE_CANVAS_WIDTH / 2, 440, 540, 48);
				break;
			}
			case 'chapter-start':
				drawChapterStart(ctx, page);
				break;
			case 'body':
				drawRuledLines(ctx, page, 138, PAGE_CANVAS_HEIGHT - 134);
				break;
			case 'illustration': {
				const leftX = (page.side === 'left' ? 74 : 96) + 28;
				const rightX = (page.side === 'left' ? PAGE_CANVAS_WIDTH - 96 : PAGE_CANVAS_WIDTH - 74) - 28;
				ctx.strokeStyle = CLAY_BLOCK_DARK;
				ctx.lineWidth = 4;
				ctx.strokeRect(leftX, 170, rightX - leftX, 680);
				if (page.illustrationCaption) {
					ctx.font = 'italic 22px Georgia, "Times New Roman", serif';
					ctx.fillStyle = CLAY_INK_MUTED;
					ctx.textAlign = 'center';
					drawWrappedCenteredText(ctx, page.illustrationCaption, (leftX + rightX) / 2, 896, rightX - leftX, 28);
				}
				break;
			}
			case 'colophon':
				drawColophonPage(ctx, page);
				break;
		}

		drawGutterShading(ctx, page.side);
	}

	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	texture.minFilter = LinearMipmapLinearFilter;
	texture.generateMipmaps = true;
	texture.anisotropy = 4;
	texture.needsUpdate = true;
	return texture;
}
