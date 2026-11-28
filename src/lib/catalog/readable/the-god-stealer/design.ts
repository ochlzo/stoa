import type { EndpaperPaintInfo, VolumeDesign } from '#lib/catalog/readable/types.ts';

const SOURCE_NOTE =
	'F. Sionil Jos\u00e9, \u201cThe God Stealer,\u201d in Philippine Literatures: Texts, Themes, Approaches (UST Publishing House). Reproduced from the actual source. No copyright infringement intended.';

function paintTerraceContours(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	color: string,
	alpha: number
) {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.globalAlpha = alpha;
	ctx.lineWidth = Math.max(0.8, width * 0.0022);
	for (let row = 0; row < 9; row += 1) {
		const y = height * (0.53 + row * 0.045);
		const inset = width * (0.12 + (row % 3) * 0.035);
		ctx.beginPath();
		ctx.moveTo(inset, y);
		ctx.bezierCurveTo(
			width * 0.28,
			y - height * 0.045,
			width * 0.48,
			y + height * 0.035,
			width * 0.65,
			y - height * 0.008
		);
		ctx.bezierCurveTo(
			width * 0.78,
			y - height * 0.045,
			width * 0.82,
			y + height * 0.02,
			width - inset,
			y - height * 0.012
		);
		ctx.stroke();
	}
	ctx.restore();
}

function paintEndpaper(ctx: CanvasRenderingContext2D, info: EndpaperPaintInfo) {
	info.defaultPaint();
	paintTerraceContours(ctx, info.width, info.height, '#665c43', 0.16);
	ctx.save();
	ctx.strokeStyle = '#89754e';
	ctx.globalAlpha = 0.2;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, info.height * 0.22);
	ctx.quadraticCurveTo(info.width * 0.48, info.height * 0.15, info.width, info.height * 0.24);
	ctx.stroke();
	ctx.restore();
}

export const design: VolumeDesign = {
	bindingStyle: 'linen-cloth',
	spineProfile: 'shallow',
	coverColor: 'oliveCloth',
	surfaceRoughness: 0.88,
	bumpScale: 0.00012,
	foilStyle: 'gold',
	foilColor: '#a98a4c',
	toolColor: '#756849',
	coverArtwork: {
		front: 'volumes/the-god-stealer/cordillera-range.webp',
		opacity: 0.84
	},
	coverBorder: 'single-rule',
	emblem: 'none',
	editionLine: 'STOA LIBRARY EDITION',
	endpaperStyle: 'custom',
	endpaperColors: ['oliveCloth', 'ochreLinen', 'agedVellum'],
	showBookplate: true,
	paperTint: '#f4eddf',
	inkColor: '#342c24',
	mutedInkColor: '#716654',
	accentColor: '#8a754b',
	fontFamily: 'Georgia, "Times New Roman", serif',
	sourceNote: SOURCE_NOTE,
	paintFrontCover(ctx, { width, height, blind, defaultPaint }) {
		paintTerraceContours(ctx, width, height, blind, 0.48);
		defaultPaint();
	},
	paintEndpaper
};
