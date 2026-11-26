import type { EndpaperPaintInfo, VolumeDesign } from '#lib/catalog/readable/types.ts';

/**
 * Custom gold-foil emblem: The Green Knight's bearded Danish broad-axe
 * centered inside a medieval heater-shield outline (100x100 viewBox).
 * (You can also swap `emblem` below to presets like `'crown'`, `'knot'`, `'wreath'`, or `'fleuron'`.)
 */
const GREEN_AXE_CREST_SVG_PATH =
	// Outer shield ring (clockwise) + inner shield cutout (counter-clockwise)
	'M 50 6 L 86 18 L 84 54 C 82 74 68 88 50 95 C 32 88 18 74 16 54 L 14 18 Z ' +
	'M 50 13 L 21 23 L 23 53 C 25 70 36 82 50 88 C 64 82 75 70 77 53 L 79 23 Z ' +
	// Central axe haft + top spike + bearded broad-axe blade
	'M 46.5 21 L 50 15 L 53.5 21 L 52.5 80 L 47.5 80 Z ' +
	'M 52 27 C 64 24 73 30 74 43 C 73 55 64 62 52 57 L 52 49 C 59 51 64 48 64 42 C 64 36 59 33 52 35 Z ' +
	'M 48 31 L 36 36 L 48 41 Z';

/**
 * Hand-decorated medieval endsheet painter layered over marbled paper:
 * adds a fine gilded lattice, double-ruled frame, and corner holly-leaf diamonds
 * on both the front endpaper (under the Ex Libris bookplate) and rear endsheet.
 */
function paintIlluminatedEndsheet(ctx: CanvasRenderingContext2D, info: EndpaperPaintInfo): void {
	info.defaultPaint();

	const { width, height } = info;
	ctx.save();

	// Subtle diagonal chivalric lozenge lattice across the endsheet
	ctx.strokeStyle = 'rgba(207, 166, 84, 0.22)';
	ctx.lineWidth = 1;
	const spacing = 64;
	for (let offset = -height; offset < width + height; offset += spacing) {
		ctx.beginPath();
		ctx.moveTo(offset, 0);
		ctx.lineTo(offset + height, height);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(offset, height);
		ctx.lineTo(offset + height, 0);
		ctx.stroke();
	}

	// Archival double-ruled endsheet border
	const outer = 34;
	const inner = 44;
	ctx.strokeStyle = 'rgba(44, 70, 55, 0.55)';
	ctx.lineWidth = 2.2;
	ctx.strokeRect(outer, outer, width - outer * 2, height - outer * 2);

	ctx.strokeStyle = 'rgba(168, 125, 67, 0.65)';
	ctx.lineWidth = 1.1;
	ctx.strokeRect(inner, inner, width - inner * 2, height - inner * 2);

	// Corner diamond flourishes at the four endsheet corners
	ctx.fillStyle = 'rgba(82, 49, 64, 0.72)';
	for (const x of [inner, width - inner]) {
		for (const y of [inner, height - inner]) {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(Math.PI / 4);
			ctx.fillRect(-5, -5, 10, 10);
			ctx.restore();
		}
	}

	ctx.restore();
}

/**
 * Blind-tooled royal plum calfskin binding with antique gold foil, forest-green
 * silk headband, custom Green Axe crest, and hand-ruled marbled endsheets.
 *
 * Shelf 2 neighbors: Gilgamesh (`agedVellum`) on left, The Iliad (`oxblood`) on right.
 */
export const design: VolumeDesign = {
	// --- Binding, Color & 3D Texture ---
	bindingStyle: 'blind-tooled-calf',
	spineProfile: 'shallow',
	coverColor: 'plumLeather',
	surfaceRoughness: 0.84,
	bumpScale: 0.0002,
	foilStyle: 'gold',
	foilColor: '#f4d584',
	toolColor: '#2a1620',
	headbandColor: '#2c4637',

	// --- Cover & Spine Stamping ---
	coverBorder: 'double-rule',
	emblem: {
		svgPath: GREEN_AXE_CREST_SVG_PATH,
		viewBoxSize: 100
	},
	// 👇 PUT YOUR NAME HERE to display it at the top of the Front Title Page,
	//    on the 3D Front Cover foot, and on the Front Endpaper Ex Libris Bookplate:
	//    e.g. editionLine: 'CURATED BY JORGE LICUP · 1912 EDITION',
	editionLine: 'CAMELOT ILLUMINATED EDITION · 1912',

	// --- Endpapers & Endsheets ---
	endpaperStyle: 'marbled',
	endpaperColors: ['plumLeather', 'oliveCloth', 'ochreLinen'],
	paintEndpaper: paintIlluminatedEndsheet,
	showBookplate: true,

	// --- Interior Paper & Typography (high-contrast AAA legibility) ---
	paperTint: '#fbf7ec',
	inkColor: '#120e0b',
	mutedInkColor: '#2d241c',
	accentColor: '#523140',
	fontFamily: 'Georgia, "Book Antiqua", Palatino, "Times New Roman", serif'
};
