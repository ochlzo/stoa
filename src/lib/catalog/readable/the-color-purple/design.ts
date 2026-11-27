import type { VolumeDesign } from '#lib/catalog/readable/types.ts';

/**
 * Pair kerning adjustments (in ems) for tight, interlocking editorial display typography.
 */
const DISPLAY_KERN_PAIRS: Record<string, number> = {
	Th: -0.055,
	he: -0.025,
	Co: -0.035,
	ol: -0.02,
	lo: -0.02,
	or: -0.025,
	Pu: -0.035,
	ur: -0.02,
	rp: -0.025,
	pl: -0.02,
	le: -0.02
};

const SERIF_FONT = 'Georgia, "Times New Roman", serif';
const SOURCE_NOTE =
	'Alice Walker, The Color Purple (Harcourt Brace Jovanovich, 1982). Pulitzer Prize for Fiction · Stoa Library Edition.';

interface DisplayWordStyle {
	size: number;
	scaleX: number;
	scaleY: number;
	ink: string;
}

interface GlyphPlacement {
	ch: string;
	x: number;
}

function layoutTightDisplayWord(
	ctx: CanvasRenderingContext2D,
	word: string,
	size: number
): { glyphs: GlyphPlacement[]; width: number } {
	const baseTrack = -0.042 * size;
	const glyphs: GlyphPlacement[] = [];
	let cursor = 0;

	for (let i = 0; i < word.length; i++) {
		const ch = word[i];
		glyphs.push({ ch, x: cursor });
		cursor += ctx.measureText(ch).width;
		if (i < word.length - 1) {
			const pair = ch + word[i + 1];
			cursor += baseTrack + (DISPLAY_KERN_PAIRS[pair] ?? 0) * size;
		}
	}

	return { glyphs, width: cursor };
}

function drawTightDisplayWordRightAligned(
	ctx: CanvasRenderingContext2D,
	word: string,
	rightX: number,
	y: number,
	style: DisplayWordStyle
): number {
	const { glyphs, width } = layoutTightDisplayWord(ctx, word, style.size);
	const startX = rightX - width * style.scaleX;

	const renderPass = (mode: 'knockout' | 'ink') => {
		ctx.save();
		ctx.translate(startX, y);
		ctx.scale(style.scaleX, style.scaleY);
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.lineJoin = 'round';

		if (mode === 'knockout') {
			ctx.strokeStyle = '#000';
			ctx.lineWidth = Math.max(3.5, style.size * 0.048);
			for (const { ch, x } of glyphs) ctx.strokeText(ch, x, 0);
		} else {
			ctx.fillStyle = style.ink;
			for (const { ch, x } of glyphs) ctx.fillText(ch, x, 0);
		}
		ctx.restore();
	};

	renderPass('knockout');
	renderPass('ink');
	return startX;
}

export const design: VolumeDesign = {
	// --- Binding & 3D Surface Material ---
	bindingStyle: 'linen-cloth',
	spineProfile: 'rounded',
	// Cool dark indigo-navy board rim & edges (removes the reddish tint of plumLeather on the
	// inner endpaper frame and during open/close transitions while staying strictly in volume scope).
	coverColor: 'navyCloth',
	surfaceRoughness: 0.88,
	bumpScale: 0.00024,
	// Use 'blind' channel (metalness = 0) so all bright lavender typography & spine foot mark
	// stay crisp and luminous across cover, spine, and back.
	foilStyle: 'blind',
	toolColor: '#f4e8ff',
	headbandColor: '#c9a6e6',
	// Front: tone-on-tone floral field + gold STOA EXCLUSIVE EDITION seal; Back: seamless floral
	// field; Spine: solid slightly-darker purple cloth (#4a3563). Full opacity preserves exact purple.
	coverArtwork: {
		front: 'volumes/the-color-purple/front-field.webp',
		back: 'volumes/the-color-purple/back-field.webp',
		spine: 'volumes/the-color-purple/spine-solid.webp',
		opacity: 1
	},

	// --- Cover & Spine Stamping ---
	sourceNote: SOURCE_NOTE,
	coverBorder: 'none',
	emblem: 'none',

	/**
	 * Front Cover: Right-aligned interlocking bright lavender title lockup ("The / Color / Purple")
	 * with three radiating accent strokes and spaced author line, balanced optically beside the
	 * upper-left brushed-gold STOA EDITION sticker over the quiet floral cloth.
	 */
	paintFrontCover: (ctx, info) => {
		const { width: w, height: h } = info;
		const cx = w / 2;

		ctx.save();

		const titleSize = Math.round(w * 0.21);
		const wordStyle: DisplayWordStyle = {
			size: titleSize,
			scaleX: 0.92,
			scaleY: 1.06,
			ink: info.blind
		};
		ctx.font = `700 ${titleSize}px ${SERIF_FONT}`;

		const purpleWidth = layoutTightDisplayWord(ctx, 'Purple', titleSize).width * wordStyle.scaleX;
		// Shift lockup slightly right to balance cleanly against the upper-left STOA EDITION seal.
		const lockupRightX = Math.min(w * 0.9, cx + purpleWidth * 0.54);
		const lineStep = titleSize * 0.78;
		const topY = h * 0.285;

		drawTightDisplayWordRightAligned(ctx, 'The', lockupRightX - titleSize * 0.04, topY, wordStyle);
		const colorLeftX = drawTightDisplayWordRightAligned(
			ctx,
			'Color',
			lockupRightX - titleSize * 0.02,
			topY + lineStep,
			wordStyle
		);
		drawTightDisplayWordRightAligned(ctx, 'Purple', lockupRightX, topY + lineStep * 2, wordStyle);

		// Three clean radiating accent strokes nestled upper-left of "C".
		ctx.globalAlpha = 0.86;
		ctx.lineCap = 'round';
		ctx.strokeStyle = info.blind;
		ctx.lineWidth = Math.max(2.5, w * 0.008);
		const cAnchorX = colorLeftX + titleSize * 0.02;
		const cAnchorY = topY + lineStep - titleSize * 0.12;
		const rays: readonly (readonly [number, number, number, number])[] = [
			[-titleSize * 0.48, -titleSize * 0.02, -titleSize * 0.12, titleSize * 0.03],
			[-titleSize * 0.4, -titleSize * 0.4, -titleSize * 0.08, -titleSize * 0.13],
			[-titleSize * 0.12, -titleSize * 0.62, titleSize * 0.02, -titleSize * 0.22]
		];
		for (const [x1, y1, x2, y2] of rays) {
			ctx.beginPath();
			ctx.moveTo(cAnchorX + x1, cAnchorY + y1);
			ctx.lineTo(cAnchorX + x2, cAnchorY + y2);
			ctx.stroke();
		}

		// Spaced author attribution beneath the title lockup.
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const authorSize = Math.round(w * 0.038);
		ctx.font = `600 ${authorSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
		ctx.fillStyle = info.blind;
		ctx.fillText('B Y   A L I C E   W A L K E R', cx, h * 0.68);

		ctx.restore();
	},

	/**
	 * Back Cover: Clean source attribution resting quietly over the seamless floral field.
	 */
	paintBackCover: (ctx, info) => {
		const { width: w, height: h } = info;
		const cx = w / 2;
		const [primaryLine, secondaryLine] = SOURCE_NOTE.split('. ');

		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const noteSize = Math.round(w * 0.025);
		ctx.font = `italic 500 ${noteSize}px ${SERIF_FONT}`;
		ctx.fillStyle = info.blind;

		ctx.globalAlpha = 0.86;
		ctx.fillText(primaryLine, cx, h * 0.825);
		if (secondaryLine) {
			ctx.globalAlpha = 0.72;
			ctx.fillText(secondaryLine.replace(/\.$/, ''), cx, h * 0.862);
		}
		ctx.restore();
	},

	/**
	 * Spine: First-edition single-line vertical format ("Walker" in regular serif at top,
	 * followed by bold Title Case "The Color Purple" down the center) over solid slightly-darker
	 * purple cloth, with a matching STOA foot mark and double rule at the bottom.
	 */
	paintSpine: (ctx, info) => {
		const { width: w, height: h } = info;
		const cx = w / 2;
		const panel = w * 0.68;

		const authorFont = (size: number) => `400 ${Math.round(size * 0.94)}px ${SERIF_FONT}`;
		const titleFont = (size: number) => `700 ${size}px ${SERIF_FONT}`;

		ctx.save();

		// Single centered vertical line running top-to-bottom (y = 0.075..0.805 of spine height).
		const topMargin = h * 0.075;
		const bottomLimit = h * 0.805;
		const maxSpan = bottomLimit - topMargin;
		const scaleX = 0.92;

		let fontSize = Math.round(panel * 0.42);
		let walkerW = 0;
		let titleW = 0;
		let gap = 0;

		while (fontSize > 14) {
			ctx.font = authorFont(fontSize);
			walkerW = ctx.measureText('Walker').width * scaleX;
			ctx.font = titleFont(fontSize);
			titleW = ctx.measureText('The Color Purple').width * scaleX;
			gap = fontSize * 0.88;
			if (walkerW + gap + titleW <= maxSpan) break;
			fontSize--;
		}

		const totalSpan = walkerW + gap + titleW;
		const startY = topMargin + (maxSpan - totalSpan) * 0.42;

		ctx.save();
		ctx.translate(cx, startY);
		ctx.rotate(Math.PI / 2);
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = info.blind;

		// Upper section: "Walker" (regular serif, slightly softer wisteria-lavender).
		ctx.save();
		ctx.scale(scaleX, 1.04);
		ctx.globalAlpha = 0.86;
		ctx.font = authorFont(fontSize);
		ctx.fillText('Walker', 0, 0);
		ctx.restore();

		// Main section: "The Color Purple" (bold serif, bright luminous lavender).
		ctx.save();
		ctx.translate(walkerW + gap, 0);
		ctx.scale(scaleX, 1.04);
		ctx.globalAlpha = 1;
		ctx.font = titleFont(fontSize);
		ctx.fillText('The Color Purple', 0, 0);
		ctx.restore();

		ctx.restore();

		// Self-contained STOA foot wordmark and double rule at the base of the spine.
		ctx.fillStyle = info.blind;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = 0.86;
		ctx.font = `600 ${Math.round(panel * 0.17)}px ${SERIF_FONT}`;
		ctx.fillText('S T O A', cx, h * 0.896);
		ctx.globalAlpha = 1;
		for (const y of [0.936, 0.95]) {
			ctx.fillRect(cx - w * 0.42, y * h, w * 0.84, h * 0.004);
		}

		ctx.restore();
	},

	// --- Endpapers & Bookplate ---
	endpaperStyle: 'custom',
	endpaperTextureSrc: 'volumes/the-color-purple/endpaper-field.webp',
	paintEndpaper: (ctx, info) => {
		// Solid fallback base matching the slightly darker purple endpaper while the WebP loads.
		ctx.save();
		ctx.fillStyle = '#4a3563';
		ctx.fillRect(0, 0, info.width, info.height);
		ctx.restore();
	},
	showBookplate: true,

	// --- Interior Paper & Typography ---
	paperTint: '#f4eef7',
	inkColor: '#3a264d',
	mutedInkColor: '#7b5f94',
	accentColor: '#6d4c91'
};
