import type { VolumeDesign } from '#lib/catalog/readable/types.ts';

export const SOURCE_NOTE =
	"Charles Scribner's Sons, 1952 · Public Domain in the Philippines & Canada (Faded Page #20141070)";

const SERIF = 'Georgia, "Times New Roman", serif';

function drawNotchedFrame(ctx: CanvasRenderingContext2D, w: number, h: number, stroke: string) {
	const inset = w * 0.062;
	const notch = w * 0.036;
	const x0 = inset;
	const y0 = inset;
	const x1 = w - inset;
	const y1 = h - inset;

	ctx.save();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = Math.max(2, w * 0.0038);
	ctx.beginPath();
	ctx.moveTo(x0 + notch, y0);
	ctx.lineTo(x1 - notch, y0);
	ctx.arc(x1, y0, notch, Math.PI, Math.PI / 2, true);
	ctx.lineTo(x1, y1 - notch);
	ctx.arc(x1, y1, notch, -Math.PI / 2, Math.PI, true);
	ctx.lineTo(x0 + notch, y1);
	ctx.arc(x0, y1, notch, 0, -Math.PI / 2, true);
	ctx.lineTo(x0, y0 + notch);
	ctx.arc(x0, y0, notch, Math.PI / 2, 0, true);
	ctx.closePath();
	ctx.stroke();

	// Delicate inner hairline rule
	const inner = inset + w * 0.015;
	ctx.lineWidth = Math.max(1, w * 0.0018);
	ctx.strokeRect(inner, inner, w - inner * 2, h - inner * 2);
	ctx.restore();
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(Math.PI / 4);
	ctx.fillStyle = fill;
	ctx.fillRect(-size / 2, -size / 2, size, size);
	ctx.restore();
}

function drawTrackedCentered(
	ctx: CanvasRenderingContext2D,
	text: string,
	cx: number,
	y: number,
	tracking: number
) {
	const chars = Array.from(text);
	const widths = chars.map((ch) => ctx.measureText(ch).width);
	const total =
		widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, chars.length - 1);
	let cursor = cx - total / 2;
	ctx.textAlign = 'left';
	for (let i = 0; i < chars.length; i++) {
		ctx.fillText(chars[i], cursor, y);
		cursor += widths[i] + tracking;
	}
	ctx.textAlign = 'center';
}

function drawShipMedallion(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	scale: number,
	foil: string,
	cream: string
) {
	ctx.save();
	ctx.translate(cx, cy);
	ctx.scale(scale, scale);

	// True-circular double-ring clothbound medallion
	ctx.strokeStyle = foil;
	ctx.lineWidth = 2.0;
	ctx.beginPath();
	ctx.arc(0, 0, 34, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = cream;
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.arc(0, 0, 27, 0, Math.PI * 2);
	ctx.stroke();

	// Minimalist cardinal compass ticks
	ctx.fillStyle = foil;
	for (let i = 0; i < 4; i++) {
		ctx.save();
		ctx.rotate((i * Math.PI) / 2);
		ctx.fillRect(-1, -34, 2, 5);
		ctx.restore();
	}

	// Crisp sailboat emblem centered in medallion
	ctx.fillStyle = foil;
	ctx.beginPath();
	ctx.moveTo(-17, 7);
	ctx.quadraticCurveTo(0, 17, 17, 7);
	ctx.lineTo(13, 14);
	ctx.lineTo(-13, 14);
	ctx.closePath();
	ctx.fill();

	ctx.fillRect(-1.2, -17, 2.4, 24);
	ctx.beginPath();
	ctx.moveTo(1.2, -15);
	ctx.quadraticCurveTo(15, -6, 12, 4.5);
	ctx.lineTo(1.2, 4.5);
	ctx.closePath();
	ctx.fill();

	// Subtle wave line under hull
	ctx.strokeStyle = cream;
	ctx.lineWidth = 1.4;
	ctx.beginPath();
	ctx.moveTo(-16, 18.5);
	ctx.quadraticCurveTo(-8, 16, 0, 18.5);
	ctx.quadraticCurveTo(8, 21, 16, 18.5);
	ctx.stroke();
	ctx.restore();
}

export const design: VolumeDesign = {
	sourceNote: SOURCE_NOTE,
	bindingStyle: 'linen-cloth',
	spineProfile: 'shallow',
	coverColor: 'slateBlue',
	surfaceRoughness: 0.9,
	bumpScale: 0.00018,
	foilStyle: 'gold',
	// Two-channel collector's stamping: burnished metallic gold foil + crisp matte cream ink
	foilColor: '#d9b56c',
	toolColor: '#efe4cc',
	headbandColor: '#ddd2bc',
	coverArtwork: {
		front: 'volumes/the-old-man-and-the-sea/front-cover.webp',
		back: 'volumes/the-old-man-and-the-sea/back-cover.webp',
		spine: 'volumes/the-old-man-and-the-sea/spine-cover.webp',
		opacity: 0.98
	},
	coverBorder: 'single-rule',
	emblem: 'ship',
	titlePageIcon: 'sailboat',
	editionLine: 'FIRST EDITION · MCMLII',
	paintFrontCover(ctx, { width: w, height: h, foil, blind }) {
		const cx = w / 2;
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		drawNotchedFrame(ctx, w, h, foil);

		// Author header in crisp matte cream with spaced small-caps poise
		ctx.fillStyle = blind;
		ctx.font = `600 ${Math.round(w * 0.036)}px ${SERIF}`;
		drawTrackedCentered(ctx, 'ERNEST HEMINGWAY', cx, h * 0.145, w * 0.011);

		// Subtle gold hairline + article "THE"
		const articleY = h * 0.228;
		ctx.strokeStyle = foil;
		ctx.lineWidth = Math.max(1.2, w * 0.0022);
		ctx.beginPath();
		ctx.moveTo(cx - w * 0.2, articleY);
		ctx.lineTo(cx - w * 0.068, articleY);
		ctx.moveTo(cx + w * 0.068, articleY);
		ctx.lineTo(cx + w * 0.2, articleY);
		ctx.stroke();

		ctx.fillStyle = foil;
		ctx.font = `600 ${Math.round(w * 0.04)}px ${SERIF}`;
		drawTrackedCentered(ctx, 'THE', cx, articleY, w * 0.012);

		// Commanding burnished-gold display title lockup
		ctx.fillStyle = foil;
		ctx.font = `700 ${Math.round(w * 0.118)}px ${SERIF}`;
		drawTrackedCentered(ctx, 'OLD MAN', cx, h * 0.312, w * 0.008);

		ctx.font = `700 ${Math.round(w * 0.088)}px ${SERIF}`;
		drawTrackedCentered(ctx, 'AND THE SEA', cx, h * 0.402, w * 0.009);

		// Delicate gold & cream divider cleanly above the cloth-stamped leaping marlin
		const divY = h * 0.474;
		ctx.strokeStyle = blind;
		ctx.lineWidth = Math.max(1.1, w * 0.002);
		ctx.beginPath();
		ctx.moveTo(cx - w * 0.18, divY);
		ctx.lineTo(cx - w * 0.025, divY);
		ctx.moveTo(cx + w * 0.025, divY);
		ctx.lineTo(cx + w * 0.18, divY);
		ctx.stroke();
		drawDiamond(ctx, cx, divY, w * 0.016, foil);

		// Crisp cream edition imprint sitting cleanly over the deep indigo waves at the foot
		ctx.fillStyle = blind;
		ctx.font = `600 ${Math.round(w * 0.028)}px ${SERIF}`;
		drawTrackedCentered(ctx, 'FIRST EDITION · MCMLII', cx, h * 0.908, w * 0.009);

		ctx.restore();
	},
	paintBackCover(ctx, { width: w, height: h, foil, blind }) {
		const cx = w / 2;
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		drawNotchedFrame(ctx, w, h, foil);

		// True-circular ship & compass medallion in the upper half
		drawShipMedallion(ctx, cx, h * 0.31, w / 255, foil, blind);

		// Iconic Hemingway epigraph in warm matte cream
		ctx.fillStyle = blind;
		ctx.font = `italic ${Math.round(w * 0.044)}px ${SERIF}`;
		ctx.fillText('“A man can be destroyed', cx, h * 0.515);
		ctx.fillText('but not defeated.”', cx, h * 0.562);

		drawDiamond(ctx, cx, h * 0.62, w * 0.014, foil);

		// Source attribution neatly set across two lines over the deep indigo sea band
		ctx.fillStyle = blind;
		ctx.font = `italic ${Math.round(w * 0.026)}px ${SERIF}`;
		ctx.fillText("Charles Scribner's Sons, New York · 1952", cx, h * 0.855);
		ctx.fillText('Public Domain (PH / CA) · Faded Page #20141070', cx, h * 0.892);

		ctx.restore();
	},
	endpaperStyle: 'marbled',
	endpaperColors: ['slateBlue', 'agedVellum', 'navyCloth'],
	paperTint: '#f4ecdc',
	inkColor: '#29231d',
	mutedInkColor: '#5e564d',
	accentColor: '#485b6b'
};
