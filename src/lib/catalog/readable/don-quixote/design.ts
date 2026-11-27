import type { VolumeDesign } from '#lib/catalog/readable/types.ts';

const WINDMILL_EMBLEM_SVG_PATH =
	'M 48 34 L 73 9 L 79 15 L 55 38 L 76 59 L 70 65 L 50 42 L 28 64 L 22 58 L 45 38 L 21 14 L 27 8 Z ' +
	'M 50 18 L 62 31 L 38 31 Z ' +
	'M 38 34 L 44 34 L 39 85 L 35 85 Z ' +
	'M 56 34 L 62 34 L 66 85 L 61 85 Z ' +
	'M 22 85 L 78 85 L 78 91 L 22 91 Z ' +
	'M 44 85 L 44 76 A 6 6 0 0 1 56 76 L 56 85 Z ' +
	'M 44 31 A 6 6 0 1 0 56 31 A 6 6 0 1 0 44 31 Z';

const SERIF_FONT = 'Georgia, "Times New Roman", serif';

function paintWindmillAccents(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number
) {
	const ringRadius = width * 0.14;
	const sailRoot = width * 0.145;
	const sailTip = width * 0.19;
	const sailWidth = width * 0.025;

	ctx.save();
	ctx.strokeStyle = ctx.fillStyle;
	ctx.lineWidth = width * 0.006;
	ctx.beginPath();
	ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
	ctx.stroke();

	for (let index = 0; index < 4; index++) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate((index * Math.PI) / 2 + Math.PI / 4);
		ctx.beginPath();
		ctx.moveTo(0, -sailRoot);
		ctx.lineTo(sailWidth * 0.78, -sailTip);
		ctx.lineTo(sailWidth * 0.28, -sailTip * 0.9);
		ctx.lineTo(0, -sailRoot * 0.96);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	ctx.restore();
}

function paintBoldBlindAuthor(ctx: CanvasRenderingContext2D, info: { width: number; height: number; author: string; blind: string }) {
	const { width, height } = info;
	const centerX = width / 2;
	const authorY = height * 0.19;
	const authorWidth = width * 0.73;

	// Clear the default italic gold author stamp before replacing it in blind tooling.
	ctx.fillStyle = '#000';
	ctx.fillRect(width * 0.12, height * 0.14, width * 0.76, height * 0.1);
	ctx.fillStyle = info.blind;
	ctx.font = `700 ${Math.round(width * 0.052)}px ${SERIF_FONT}`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(info.author, centerX, authorY, authorWidth);
}

function paintSpineWindmill(ctx: CanvasRenderingContext2D, width: number, height: number, blind: string) {
	const centerX = width / 2;
	const centerY = height * 0.585;
	const radius = width * 0.1;
	const bladeWidth = width * 0.035;

	ctx.save();
	ctx.fillStyle = blind;
	ctx.translate(centerX, centerY);
	for (let index = 0; index < 4; index++) {
		ctx.save();
		ctx.rotate((index * Math.PI) / 2);
		ctx.beginPath();
		ctx.moveTo(-bladeWidth * 0.18, -radius * 0.18);
		ctx.lineTo(bladeWidth * 0.45, -radius);
		ctx.lineTo(bladeWidth * 0.9, -radius * 0.82);
		ctx.lineTo(bladeWidth * 0.18, -radius * 0.08);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	ctx.beginPath();
	ctx.arc(0, 0, bladeWidth * 0.6, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function paintEndpaperWindmill(ctx: CanvasRenderingContext2D, x: number, y: number) {
	const hubY = y - 10;
	const sailLength = 21;

	ctx.save();
	ctx.translate(x, hubY);
	for (let index = 0; index < 4; index++) {
		ctx.save();
		ctx.rotate((index * Math.PI) / 2 + Math.PI / 4);
		ctx.beginPath();
		ctx.moveTo(-2, -3);
		ctx.lineTo(-3, -sailLength);
		ctx.lineTo(4, -sailLength + 4);
		ctx.lineTo(2, -2);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	ctx.beginPath();
	ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	ctx.save();
	ctx.beginPath();
	ctx.moveTo(x, hubY + 5);
	ctx.lineTo(x - 8, y + 25);
	ctx.lineTo(x + 8, y + 25);
	ctx.closePath();
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x - 15, y + 27);
	ctx.lineTo(x + 15, y + 27);
	ctx.stroke();
	ctx.restore();
}

function paintWindmillEndpaperPattern(ctx: CanvasRenderingContext2D, width: number, height: number) {
	ctx.save();
	ctx.strokeStyle = '#563c2c';
	ctx.fillStyle = '#563c2c';
	ctx.globalAlpha = 0.24;
	ctx.lineWidth = 1.5;

	const rowStep = 190;
	const columnStep = 190;
	for (let row = 0, y = 78; y < height - 45; row++, y += rowStep) {
		const offset = row % 2 === 0 ? 0 : columnStep / 2;
		for (let x = 96 + offset; x < width - 45; x += columnStep) {
			paintEndpaperWindmill(ctx, x, y);
		}
	}
	ctx.restore();
}

export const design: VolumeDesign = {
	bindingStyle: 'raised-band-leather',
	spineProfile: 'rounded',
	coverColor: 'ochreLinen',
	foilStyle: 'gold',
	toolColor: '#54301f',
	coverBorder: 'double-rule',
	endpaperStyle: 'marbled',
	endpaperColors: ['ochreLinen', 'agedVellum', 'umberCalf'],
	emblem: {
		svgPath: WINDMILL_EMBLEM_SVG_PATH,
		viewBoxSize: 100
	},
	paintFrontCover(ctx, info) {
		info.defaultPaint();
		paintBoldBlindAuthor(ctx, info);
		ctx.fillStyle = info.blind;
		paintWindmillAccents(ctx, info.width / 2, info.height * 0.64, info.width);
	},
	paintSpine(ctx, info) {
		info.defaultPaint();
		paintSpineWindmill(ctx, info.width, info.height, info.blind);
	},
	paintEndpaper(ctx, info) {
		info.defaultPaint();
		paintWindmillEndpaperPattern(ctx, info.width, info.height);
	}
};
