import { CanvasTexture, ClampToEdgeWrapping } from 'three';
import { BINDING_STYLE_PRESETS } from '#lib/catalog/layout.ts';
import type { BindingStyleId, Volume } from '#lib/catalog/types.ts';
import { configurePbrTexture, wrapCanvasLines } from '#lib/textures/pbr-texture-cache.ts';

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

/**
 * Parametric cover medallion driven by Binding Style (ADR 0006), ensuring every
 * Readable Volume receives a classical, binding-authentic ornament without bespoke
 * single-title artwork.
 */
function bindingEmblem(
	ctx: CanvasRenderingContext2D,
	style: BindingStyleId,
	x: number,
	y: number,
	scale: number
) {
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

	if (style === 'raised-band-leather') {
		// Eight-point classical compass rosette
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
	} else if (style === 'linen-cloth') {
		// Nested geometric lozenges
		ctx.rotate(Math.PI / 4);
		ctx.strokeRect(-13, -13, 26, 26);
		ctx.fillRect(-5, -5, 10, 10);
	} else if (style === 'quarter-vellum') {
		// Minimalist classical wreath arcs + central diamond
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.arc(side * 4, 0, 16, side > 0 ? -1.1 : Math.PI - 1.1, side > 0 ? 1.1 : Math.PI + 1.1);
			ctx.stroke();
		}
		diamond(ctx, 0, 0, 9);
	} else {
		// Blind-tooled calf fleuron cross
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
	}

	ctx.restore();
}

function spine(ctx: CanvasRenderingContext2D, volume: Volume, w: number, h: number) {
	const panel = w * (volume.spineProfile === 'flat' ? 0.88 : 0.66);
	const cx = w / 2;
	const bands = BINDING_STYLE_PRESETS[volume.bindingStyle].spineBandFractions;
	ctx.fillStyle = gold;
	if (volume.bindingStyle === 'blind-tooled-calf') {
		ctx.fillStyle = blind;
		ctx.strokeStyle = blind;
		ctx.lineWidth = h * 0.003;
		ctx.strokeRect(cx - panel / 2, 0.16 * h, panel, h * 0.68);
	}
	ctx.fillStyle = gold;
	for (const y of [0.05, 0.064, ...bands.map((b) => 1 - b - 0.017), 0.936, 0.95]) {
		ctx.fillRect(cx - w * 0.42, y * h, w * 0.84, h * 0.004);
	}
	const titleInk =
		volume.coverColor === 'agedVellum' || volume.coverColor === 'ochreLinen' ? blind : gold;
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
	ctx.fillStyle = gold;
	diamond(ctx, cx, 0.895 * h, panel * 0.11);
}

function board(ctx: CanvasRenderingContext2D, volume: Volume, face: StampFace, w: number, h: number) {
	const cx = w / 2;
	ctx.strokeStyle = gold;
	for (const inset of [0.055, 0.069]) {
		ctx.lineWidth = inset === 0.055 ? 3 : 1.4;
		ctx.strokeRect(w * inset, w * inset, w * (1 - 2 * inset), h - 2 * w * inset);
	}
	ctx.fillStyle = gold;
	for (const x of [0.069, 0.931]) {
		for (const y of [w * 0.069, h - w * 0.069]) diamond(ctx, w * x, y, 9);
	}
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
		bindingEmblem(ctx, volume.bindingStyle, cx, h * 0.64, w / 260);
	} else {
		ctx.strokeStyle = blind;
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.ellipse(cx, h * 0.46, w * 0.18, w * 0.22, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = gold;
		bindingEmblem(ctx, volume.bindingStyle, cx, h * 0.46, w / 330);
	}
	typeset(ctx, 'STOA  LIBRARY  EDITION', cx, h * 0.86, w * 0.67, h * 0.05, w * 0.04);
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
	if (face === 'spine') spine(ctx, volume, canvas.width, canvas.height);
	else board(ctx, volume, face, canvas.width, canvas.height);
	return configurePbrTexture(new CanvasTexture(canvas), 'metalness', {
		wrapS: ClampToEdgeWrapping,
		wrapT: ClampToEdgeWrapping
	});
}
