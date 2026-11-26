import { CanvasTexture, ClampToEdgeWrapping } from 'three';
import { BINDING_STYLE_PRESETS } from '#lib/catalog/layout.ts';
import type {
	CoverBorderStyle,
	CoverEmblemPreset,
	CoverEmblemSpec,
	StampPaintInfo,
	VolumeDesign
} from '#lib/catalog/readable/types.ts';
import type { BindingStyleId, Volume } from '#lib/catalog/types.ts';
import { configurePbrTexture, wrapCanvasLines } from '#lib/textures/pbr-texture-cache.ts';
import { drawStoaCombinationMark } from '#lib/textures/brand-mark.ts';

export type StampFace = 'front' | 'back' | 'spine';

// Linear channels: red selects blind tooling, green holds roughness, blue selects metal.
// Black leaves the original binding grain and finish intact.
const gold = 'rgb(0,70,255)';
const blind = 'rgb(255,181,0)';
const serif = 'Georgia, "Times New Roman", serif';

function typeset(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	width: number,
	height: number,
	maxSize: number,
	italic = false
) {
	let size = maxSize;
	let rows: string[];
	do {
		ctx.font = (italic ? 'italic ' : '600 ') + size + 'px ' + serif;
		rows = wrapCanvasLines(ctx, text, width);
		if (rows.length * size * 1.12 <= height && rows.every((row) => ctx.measureText(row).width <= width)) {
			break;
		}
		size--;
	} while (size > 1);
	rows.forEach((row, i) => ctx.fillText(row, x, y + (i - (rows.length - 1) / 2) * size * 1.12));
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(Math.PI / 4);
	ctx.fillRect(-size / 2, -size / 2, size, size);
	ctx.restore();
}

function defaultEmblemForBinding(style: BindingStyleId): CoverEmblemPreset {
	if (style === 'raised-band-leather') return 'compass';
	if (style === 'linen-cloth') return 'lozenge';
	if (style === 'quarter-vellum') return 'wreath';
	return 'fleuron';
}

function drawPresetMotif(ctx: CanvasRenderingContext2D, preset: Exclude<CoverEmblemPreset, 'none'>) {
	if (preset === 'compass') {
		for (let i = 0; i < 8; i++) {
			ctx.save();
			ctx.rotate((i * Math.PI) / 4);
			const len = i % 2 === 0 ? 19 : 12;
			ctx.beginPath();
			ctx.moveTo(0, -len);
			ctx.lineTo(3.2, -3.2);
			ctx.lineTo(0, 0);
			ctx.lineTo(-3.2, -3.2);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
	} else if (preset === 'lozenge') {
		ctx.rotate(Math.PI / 4);
		ctx.strokeRect(-13, -13, 26, 26);
		ctx.fillRect(-5, -5, 10, 10);
	} else if (preset === 'wreath') {
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.arc(side * 4, 0, 16, side > 0 ? -1.1 : Math.PI - 1.1, side > 0 ? 1.1 : Math.PI + 1.1);
			ctx.stroke();
		}
		diamond(ctx, 0, 0, 9);
	} else if (preset === 'fleuron') {
		for (let i = 0; i < 4; i++) {
			ctx.save();
			ctx.rotate((i * Math.PI) / 2);
			ctx.beginPath();
			ctx.moveTo(0, -18);
			ctx.quadraticCurveTo(6, -9, 0, -2);
			ctx.quadraticCurveTo(-6, -9, 0, -18);
			ctx.fill();
			ctx.restore();
		}
	} else if (preset === 'urn') {
		ctx.beginPath();
		ctx.moveTo(-7, -16);
		ctx.lineTo(7, -16);
		ctx.lineTo(5, -11);
		ctx.quadraticCurveTo(13, -5, 9, 6);
		ctx.quadraticCurveTo(6, 12, 4, 14);
		ctx.lineTo(8, 17);
		ctx.lineTo(-8, 17);
		ctx.lineTo(-4, 14);
		ctx.quadraticCurveTo(-6, 12, -9, 6);
		ctx.quadraticCurveTo(-13, -5, -5, -11);
		ctx.closePath();
		ctx.fill();
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.arc(side * 11, -5, 4.5, side > 0 ? -1.4 : Math.PI - 1.4, side > 0 ? 1.4 : Math.PI + 1.4);
			ctx.stroke();
		}
	} else if (preset === 'knot') {
		ctx.lineWidth = 2.2;
		ctx.strokeRect(-11, -11, 22, 22);
		ctx.rotate(Math.PI / 4);
		ctx.strokeRect(-11, -11, 22, 22);
		ctx.beginPath();
		ctx.arc(0, 0, 5, 0, Math.PI * 2);
		ctx.fill();
	} else if (preset === 'crown') {
		ctx.beginPath();
		ctx.moveTo(-15, 10);
		ctx.lineTo(-17, -6);
		ctx.lineTo(-7, 2);
		ctx.lineTo(0, -13);
		ctx.lineTo(7, 2);
		ctx.lineTo(17, -6);
		ctx.lineTo(15, 10);
		ctx.closePath();
		ctx.fill();
		ctx.fillRect(-15, 12, 30, 3);
	} else if (preset === 'ship') {
		ctx.beginPath();
		ctx.moveTo(-16, 6);
		ctx.quadraticCurveTo(0, 16, 16, 6);
		ctx.lineTo(12, 13);
		ctx.lineTo(-12, 13);
		ctx.closePath();
		ctx.fill();
		ctx.fillRect(-1.2, -16, 2.4, 23);
		ctx.beginPath();
		ctx.moveTo(1, -14);
		ctx.quadraticCurveTo(14, -6, 11, 4);
		ctx.lineTo(1, 4);
		ctx.closePath();
		ctx.fill();
	} else if (preset === 'quill') {
		ctx.rotate(-Math.PI / 5);
		ctx.beginPath();
		ctx.moveTo(0, -18);
		ctx.quadraticCurveTo(10, -4, 3, 10);
		ctx.lineTo(0, 18);
		ctx.lineTo(-2, 10);
		ctx.quadraticCurveTo(-8, -2, 0, -18);
		ctx.closePath();
		ctx.fill();
	} else {
		// Classical twin laurel branches
		ctx.lineWidth = 1.4;
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.arc(side * 5, 2, 15, side > 0 ? -1.3 : Math.PI - 1.1, side > 0 ? 1.1 : Math.PI + 1.3);
			ctx.stroke();
			for (let i = 0; i < 4; i++) {
				const a = -0.85 + i * 0.55;
				const lx = side * (5 + Math.cos(a) * 14);
				const ly = 2 + Math.sin(a) * 14;
				ctx.beginPath();
				ctx.ellipse(lx, ly, 4.2, 2, side * (a + 0.5), 0, Math.PI * 2);
				ctx.fill();
			}
		}
		diamond(ctx, 0, -13, 6);
	}
}

/**
 * Parametric cover medallion driven by Binding Style or Readable Volume design (ADR 0006).
 * Supports curated classical presets or a custom single-color SVG path (`svgPath`).
 */
function bindingEmblem(
	ctx: CanvasRenderingContext2D,
	style: BindingStyleId,
	emblem: CoverEmblemSpec | undefined,
	x: number,
	y: number,
	scale: number
) {
	const spec = emblem ?? defaultEmblemForBinding(style);
	if (spec === 'none') return;

	ctx.save();
	ctx.translate(x, y);
	ctx.scale(scale, scale);
	ctx.lineWidth = 1.6;

	// Outer double-ring classical medallion
	ctx.beginPath();
	ctx.arc(0, 0, 28, 0, Math.PI * 2);
	ctx.stroke();
	ctx.lineWidth = 0.9;
	ctx.beginPath();
	ctx.arc(0, 0, 22, 0, Math.PI * 2);
	ctx.stroke();

	if (typeof spec === 'string') {
		drawPresetMotif(ctx, spec);
	} else if (typeof Path2D !== 'undefined' && spec.svgPath.trim().length > 0) {
		const box = Math.max(1, spec.viewBoxSize ?? 100);
		const fit = 36 / box;
		ctx.save();
		ctx.scale(fit, fit);
		ctx.translate(-box / 2, -box / 2);
		ctx.fill(new Path2D(spec.svgPath));
		ctx.restore();
	}

	ctx.restore();
}

function resolveDesign(volume: Volume): VolumeDesign | undefined {
	return volume.kind === 'readable' ? volume.design : undefined;
}

function spine(ctx: CanvasRenderingContext2D, volume: Volume, w: number, h: number) {
	const design = resolveDesign(volume);
	const foil = design?.foilStyle === 'blind' ? blind : gold;
	const panel = w * (volume.spineProfile === 'flat' ? 0.88 : 0.66);
	const cx = w / 2;
	const bands = BINDING_STYLE_PRESETS[volume.bindingStyle].spineBandFractions;
	ctx.fillStyle = foil;
	if (volume.bindingStyle === 'blind-tooled-calf') {
		ctx.fillStyle = blind;
		ctx.strokeStyle = blind;
		ctx.lineWidth = h * 0.003;
		ctx.strokeRect(cx - panel / 2, 0.16 * h, panel, h * 0.68);
	}
	ctx.fillStyle = foil;
	for (const y of [0.05, 0.064, ...bands.map((b) => 1 - b - 0.017), 0.936, 0.95]) {
		ctx.fillRect(cx - w * 0.42, y * h, w * 0.84, h * 0.004);
	}
	const titleInk =
		design?.foilStyle === 'blind' ||
		volume.coverColor === 'agedVellum' ||
		volume.coverColor === 'ochreLinen'
			? blind
			: gold;
	ctx.fillStyle = titleInk;
	if (volume.bindingStyle === 'raised-band-leather') {
		// Three uninterrupted compartments between the five physical bands.
		const words = volume.title.toUpperCase().split(' ');
		const groups = Math.min(3, words.length);
		for (let i = 0; i < groups; i++) {
			const start = Math.round((i * words.length) / groups);
			const end = Math.round(((i + 1) * words.length) / groups);
			const label = words.slice(start, end).join(' ');
			const capSize = /^(THE|A|AN)$/.test(label) ? panel * 0.15 : panel * 0.32;
			typeset(
				ctx,
				label,
				cx,
				(0.415 + (i - (groups === 1 ? 0 : 1)) * 0.17) * h,
				panel,
				0.126 * h,
				capSize
			);
		}
		typeset(ctx, volume.author, cx, 0.755 * h, panel, 0.122 * h, panel * 0.22, true);
	} else {
		ctx.save();
		ctx.translate(cx, h * 0.5);
		ctx.rotate(Math.PI / 2);
		typeset(ctx, volume.title, 0, -panel * 0.18, h * 0.63, panel * 0.53, panel * 0.44);
		typeset(ctx, volume.author, 0, panel * 0.25, h * 0.62, panel * 0.29, panel * 0.24, true);
		ctx.restore();
	}
	ctx.fillStyle = foil;
	drawStoaCombinationMark(ctx, cx, 0.896 * h, panel * 0.84, h * 0.052);
}

function drawBoardBorder(
	ctx: CanvasRenderingContext2D,
	style: CoverBorderStyle,
	foil: string,
	w: number,
	h: number
) {
	if (style === 'none') return;
	ctx.strokeStyle = foil;
	ctx.fillStyle = foil;
	if (style === 'single-rule') {
		ctx.lineWidth = 2.4;
		ctx.strokeRect(w * 0.06, w * 0.06, w * 0.88, h - 2 * w * 0.06);
		return;
	}
	if (style === 'corner-ornaments') {
		const inset = w * 0.065;
		const arm = w * 0.08;
		ctx.lineWidth = 2.4;
		for (const [cx, dx] of [
			[inset, 1],
			[w - inset, -1]
		] as const) {
			for (const [cy, dy] of [
				[inset, 1],
				[h - inset, -1]
			] as const) {
				ctx.beginPath();
				ctx.moveTo(cx + dx * arm, cy);
				ctx.lineTo(cx, cy);
				ctx.lineTo(cx, cy + dy * arm);
				ctx.stroke();
				diamond(ctx, cx + dx * 12, cy + dy * 12, 8);
			}
		}
		return;
	}
	for (const inset of [0.055, 0.069]) {
		ctx.lineWidth = inset === 0.055 ? 3 : 1.4;
		ctx.strokeRect(w * inset, w * inset, w * (1 - 2 * inset), h - 2 * w * inset);
	}
	for (const x of [0.069, 0.931]) {
		for (const y of [w * 0.069, h - w * 0.069]) diamond(ctx, w * x, y, 9);
	}
}

function board(ctx: CanvasRenderingContext2D, volume: Volume, face: StampFace, w: number, h: number) {
	const design = resolveDesign(volume);
	const foil = design?.foilStyle === 'blind' ? blind : gold;
	const cx = w / 2;
	drawBoardBorder(ctx, design?.coverBorder ?? 'double-rule', foil, w, h);
	ctx.strokeStyle = foil;
	ctx.fillStyle = foil;
	if (face === 'front') {
		typeset(ctx, volume.author, cx, h * 0.19, w * 0.73, h * 0.08, w * 0.057, true);
		const title = volume.title.toUpperCase();
		const article = title.match(/^(THE|AN|A)\s+/);
		if (article) typeset(ctx, article[1], cx, h * 0.268, w * 0.7, h * 0.04, w * 0.04);
		typeset(
			ctx,
			title.slice(article?.[0].length ?? 0),
			cx,
			h * 0.375,
			w * 0.79,
			h * 0.155,
			w * 0.116
		);
		bindingEmblem(ctx, volume.bindingStyle, design?.emblem, cx, h * 0.64, w / 260);
	} else {
		ctx.strokeStyle = blind;
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.ellipse(cx, h * 0.46, w * 0.18, w * 0.22, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = foil;
		bindingEmblem(ctx, volume.bindingStyle, design?.emblem, cx, h * 0.46, w / 330);
	}
	if (face === 'front') {
		const edition = (design?.editionLine ?? 'STOA  LIBRARY  EDITION').toUpperCase();
		typeset(ctx, edition, cx, h * 0.86, w * 0.67, h * 0.05, w * 0.04);
	} else {
		const backSource = volume.kind === 'readable' ? volume.sourceNote?.trim() : undefined;
		if (backSource) {
			typeset(ctx, backSource, cx, h * 0.84, w * 0.72, h * 0.1, w * 0.036, true);
		} else {
			const edition = (design?.editionLine ?? 'STOA  LIBRARY  EDITION').toUpperCase();
			typeset(ctx, edition, cx, h * 0.86, w * 0.67, h * 0.05, w * 0.04);
		}
	}
}

export function createVolumeStamp(volume: Volume, face: StampFace) {
	const canvas = document.createElement('canvas');
	const { thickness, depth, height } = volume.dimensions;
	canvas.height = face === 'spine' ? 640 : 1024;
	const physicalWidth =
		face === 'spine' ? thickness * (volume.spineProfile === 'flat' ? 1 : 1.4) : depth;
	canvas.width = Math.round((canvas.height * physicalWidth) / height);
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const design = resolveDesign(volume);
	const defaultPaint = () => {
		if (face === 'spine') spine(ctx, volume, canvas.width, canvas.height);
		else board(ctx, volume, face, canvas.width, canvas.height);
	};
	const customPainter =
		face === 'front'
			? design?.paintFrontCover
			: face === 'back'
				? design?.paintBackCover
				: design?.paintSpine;

	if (customPainter) {
		const info: StampPaintInfo = {
			width: canvas.width,
			height: canvas.height,
			title: volume.title,
			author: volume.author,
			foil: design?.foilStyle === 'blind' ? blind : gold,
			blind,
			defaultPaint
		};
		customPainter(ctx, info);
	} else {
		defaultPaint();
	}

	return configurePbrTexture(new CanvasTexture(canvas), 'metalness', {
		wrapS: ClampToEdgeWrapping,
		wrapT: ClampToEdgeWrapping
	});
}
