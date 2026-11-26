import type { VolumeDesign } from '#lib/catalog/readable/types.ts';

/**
 * Linear PBR stamp channels in Stoa's volume shader (`toolColor` = #f4e8ff, metalness = 0):
 * Keeps the title lockup, author line, and spine text brightly lit and unmistakable over
 * the quiet tone-on-tone floral cover cloth and slightly darker solid purple spine.
 */
const INK_PRIMARY = 'rgb(255, 124, 0)'; // Title & spine title: bright luminous lavender
const INK_SECONDARY = 'rgb(220, 140, 0)'; // Author & accent rays: soft wisteria
const INK_TERTIARY = 'rgb(184, 156, 0)'; // Back cover secondary attribution

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

function measureTightDisplayWord(
	ctx: CanvasRenderingContext2D,
	word: string,
	size: number,
	scaleX: number
): number {
	const baseTrack = -0.042 * size;
	let total = 0;
	for (let i = 0; i < word.length; i++) {
		total += ctx.measureText(word[i]).width;
		if (i < word.length - 1) {
			const pair = word[i] + word[i + 1];
			total += baseTrack + (DISPLAY_KERN_PAIRS[pair] ?? 0) * size;
		}
	}
	return total * scaleX;
}

function drawTightDisplayWordRightAligned(
	ctx: CanvasRenderingContext2D,
	word: string,
	rightX: number,
	y: number,
	size: number,
	scaleX: number,
	scaleY: number,
	ink: string
): number {
	const baseTrack = -0.042 * size;
	const unscaledWidth = measureTightDisplayWord(ctx, word, size, 1);
	const startX = rightX - unscaledWidth * scaleX;

	const renderPass = (mode: 'knockout' | 'ink') => {
		ctx.save();
		ctx.translate(startX, y);
		ctx.scale(scaleX, scaleY);
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.lineJoin = 'round';

		let cursor = 0;
		for (let i = 0; i < word.length; i++) {
			const ch = word[i];
			if (mode === 'knockout') {
				ctx.strokeStyle = 'rgb(0, 0, 0)';
				ctx.lineWidth = Math.max(3.5, size * 0.048);
				ctx.strokeText(ch, cursor, 0);
			} else {
				ctx.fillStyle = ink;
				ctx.fillText(ch, cursor, 0);
			}

			cursor += ctx.measureText(ch).width;
			if (i < word.length - 1) {
				const pair = ch + word[i + 1];
				cursor += baseTrack + (DISPLAY_KERN_PAIRS[pair] ?? 0) * size;
			}
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
	// Use 'blind' channel (metalness = 0) so all bright lavender typography & Stoa's foot mark
	// stay crisp and luminous across cover, spine, and back.
	foilStyle: 'blind',
	toolColor: '#f4e8ff',
	foilColor: '#2c1942',
	headbandColor: '#c9a6e6',
	// Front: tone-on-tone floral field + gold STOA EXCLUSIVE EDITION seal; Back: seamless floral
	// field; Spine: solid slightly-darker purple cloth (#4a3563). Full opacity preserves exact purple.
	coverArtwork: {
		front: 'volumes/the-color-purple/front-field.webp',
		back: 'volumes/the-color-purple/cover-field.webp',
		spine: 'volumes/the-color-purple/spine-solid.webp',
		opacity: 1
	},

	// --- Cover & Spine Stamping ---
	sourceNote:
		'Alice Walker, The Color Purple (1982). Pulitzer Prize for Fiction · Stoa Library Edition.',
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
		const scaleX = 0.92;
		const scaleY = 1.06;
		ctx.font = `700 ${titleSize}px Georgia, "Times New Roman", serif`;

		const purpleWidth = measureTightDisplayWord(ctx, 'Purple', titleSize, scaleX);
		// Shift lockup slightly right to balance cleanly against the upper-left STOA EDITION seal.
		const lockupRightX = Math.min(w * 0.9, cx + purpleWidth * 0.54);
		const lineStep = titleSize * 0.78;
		const topY = h * 0.285;

		drawTightDisplayWordRightAligned(
			ctx,
			'The',
			lockupRightX - titleSize * 0.04,
			topY,
			titleSize,
			scaleX,
			scaleY,
			INK_PRIMARY
		);
		const colorLeftX = drawTightDisplayWordRightAligned(
			ctx,
			'Color',
			lockupRightX - titleSize * 0.02,
			topY + lineStep,
			titleSize,
			scaleX,
			scaleY,
			INK_PRIMARY
		);
		drawTightDisplayWordRightAligned(
			ctx,
			'Purple',
			lockupRightX,
			topY + lineStep * 2,
			titleSize,
			scaleX,
			scaleY,
			INK_PRIMARY
		);

		// Three clean radiating accent strokes nestled upper-left of "C".
		ctx.lineCap = 'round';
		ctx.strokeStyle = INK_SECONDARY;
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
		ctx.fillStyle = INK_SECONDARY;
		ctx.fillText('B Y   A L I C E   W A L K E R', cx, h * 0.68);

		ctx.restore();
	},

	/**
	 * Back Cover: Clean source attribution resting quietly over the seamless floral field.
	 */
	paintBackCover: (ctx, info) => {
		const { width: w, height: h } = info;
		const cx = w / 2;

		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const noteSize = Math.round(w * 0.027);
		ctx.font = `italic 500 ${noteSize}px Georgia, "Times New Roman", serif`;

		ctx.fillStyle = INK_SECONDARY;
		ctx.fillText('Alice Walker, The Color Purple (1982)', cx, h * 0.825);
		ctx.fillStyle = INK_TERTIARY;
		ctx.fillText('Pulitzer Prize for Fiction · Stoa Library Edition', cx, h * 0.862);
		ctx.restore();
	},

	/**
	 * Spine: First-edition single-line vertical format ("Walker" in regular serif at top,
	 * followed by bold Title Case "The Color Purple" down the center) over solid slightly-darker
	 * purple cloth, keeping Stoa's foot combination mark and double rule at the bottom.
	 */
	paintSpine: (ctx, info) => {
		const { width: w, height: h } = info;
		const cx = w / 2;
		const panel = w * 0.68;

		ctx.save();

		// Single centered vertical line running top-to-bottom (y = 0.075..0.80 of spine height).
		const topMargin = h * 0.075;
		const bottomLimit = h * 0.805;
		const maxSpan = bottomLimit - topMargin;
		const scaleX = 0.92;

		let fontSize = Math.round(panel * 0.42);
		let walkerW = 0;
		let titleW = 0;
		let gap = 0;

		while (fontSize > 14) {
			ctx.font = `400 ${Math.round(fontSize * 0.94)}px Georgia, "Times New Roman", serif`;
			walkerW = ctx.measureText('Walker').width * scaleX;
			ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
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

		// Upper section: "Walker" (regular serif, slightly softer wisteria-lavender).
		ctx.save();
		ctx.scale(scaleX, 1.04);
		ctx.font = `400 ${Math.round(fontSize * 0.94)}px Georgia, "Times New Roman", serif`;
		ctx.fillStyle = INK_SECONDARY;
		ctx.fillText('Walker', 0, 0);
		ctx.restore();

		// Main section: "The Color Purple" (bold serif, bright luminous lavender).
		ctx.save();
		ctx.translate(walkerW + gap, 0);
		ctx.scale(scaleX, 1.04);
		ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
		ctx.fillStyle = INK_PRIMARY;
		ctx.fillText('The Color Purple', 0, 0);
		ctx.restore();

		ctx.restore();

		// Preserve Stoa's canonical combination mark and double bottom rule at the foot of the spine.
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, h * 0.85, w, h * 0.15);
		ctx.clip();
		info.defaultPaint();
		ctx.restore();

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
