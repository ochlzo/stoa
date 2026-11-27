import type { VolumeDesign } from '#lib/catalog/readable/types.ts';

const SERIF_FONT = 'Georgia, "Times New Roman", serif';
const SECONDARY_INK_ALPHA = 0.78;
const BACK_NOTE_PRIMARY = 'Miguel Syjuco, Ilustrado (2008)';
const BACK_NOTE_SECONDARY = 'Winner of the Man Asian Literary Prize · Stoa Library Edition';

export const design: VolumeDesign = {
	// --- Binding & 3D Surface Material ---
	// Warm agedVellum contrasts cleanly between Anabasis (ochreLinen) and The Gallic War
	// (slateBlue) on Shelf 0 Right, and matches the cream parchment front cover naturally.
	bindingStyle: 'linen-cloth',
	spineProfile: 'rounded',
	coverColor: 'agedVellum',
	surfaceRoughness: 0.86,
	bumpScale: 0.00014,
	// Use 'blind' channel (metalness = 0) so dark ink lettering & Stoa's foot mark read crisply
	// on the warm cream spine and back cover.
	foilStyle: 'blind',
	toolColor: '#1e1915',
	headbandColor: '#e2a218',
	// UV-exact 1024x1024 fountain-pen nib front cover + matching warm cream cloth on spine/back.
	coverArtwork: {
		front: 'volumes/ilustrado/front-cover.webp',
		back: 'volumes/ilustrado/cream-cloth.webp',
		spine: 'volumes/ilustrado/cream-cloth.webp',
		opacity: 1
	},

	// --- Cover & Spine Stamping ---
	sourceNote: `${BACK_NOTE_PRIMARY}. ${BACK_NOTE_SECONDARY}.`,
	coverBorder: 'none',
	emblem: 'none',

	// Front cover artwork already carries the golden fountain-pen nib, title, and author.
	paintFrontCover: () => {},

	/**
	 * Back Cover: Clean warm cream parchment with subtle dark-ink fountain-pen nib emblem
	 * and edition attribution.
	 */
	paintBackCover: (ctx, info) => {
		const { width: w, height: h, blind } = info;
		const cx = w / 2;

		ctx.save();

		// Minimalist ink fountain-pen nib silhouette at optical center.
		const ny = h * 0.44;
		const s = w * 0.0014;
		ctx.save();
		ctx.translate(cx, ny);
		ctx.scale(s, s);
		ctx.globalAlpha = SECONDARY_INK_ALPHA;
		ctx.strokeStyle = blind;
		ctx.lineWidth = 4.5;
		ctx.lineJoin = 'round';
		ctx.beginPath();
		ctx.moveTo(0, -92);
		ctx.bezierCurveTo(18, -50, 48, -14, 42, 22);
		ctx.lineTo(26, 76);
		ctx.lineTo(-26, 76);
		ctx.lineTo(-42, 22);
		ctx.bezierCurveTo(-48, -14, -18, -50, 0, -92);
		ctx.closePath();
		ctx.stroke();

		// Nib slit and breather hole.
		ctx.beginPath();
		ctx.moveTo(0, -88);
		ctx.lineTo(0, -10);
		ctx.stroke();

		ctx.fillStyle = blind;
		ctx.beginPath();
		ctx.arc(0, -6, 6.5, 0, Math.PI * 2);
		ctx.fill();

		// Base collar.
		ctx.fillRect(-30, 84, 60, 14);
		ctx.restore();

		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const noteSize = Math.round(w * 0.027);
		ctx.font = `italic 500 ${noteSize}px ${SERIF_FONT}`;
		ctx.fillStyle = blind;
		ctx.fillText(BACK_NOTE_PRIMARY, cx, h * 0.818);
		ctx.globalAlpha = SECONDARY_INK_ALPHA;
		ctx.fillText(BACK_NOTE_SECONDARY, cx, h * 0.856);

		ctx.restore();
	},

	/**
	 * Spine: Crisp black-ink single-line vertical serif ("Syjuco" + "Ilustrado") on warm cream
	 * parchment, preserving Stoa's foot combination mark and double bottom rule.
	 */
	paintSpine: (ctx, info) => {
		const { width: w, height: h, blind } = info;
		const cx = w / 2;
		const panel = w * 0.68;
		const authorLabel = info.author.split(/\s+/).at(-1) ?? info.author;
		const titleLabel = info.title;

		ctx.save();

		const topMargin = h * 0.085;
		const bottomLimit = h * 0.805;
		const maxSpan = bottomLimit - topMargin;
		const scaleX = 0.94;

		let fontSize = Math.round(panel * 0.44);
		let authorW = 0;
		let titleW = 0;
		let gap = 0;

		const authorFont = (size: number) => `400 ${Math.round(size * 0.9)}px ${SERIF_FONT}`;
		const titleFont = (size: number) => `italic 700 ${size}px ${SERIF_FONT}`;

		while (fontSize > 14) {
			ctx.font = authorFont(fontSize);
			authorW = ctx.measureText(authorLabel).width * scaleX;
			ctx.font = titleFont(fontSize);
			titleW = ctx.measureText(titleLabel).width * scaleX;
			gap = fontSize * 1.1;
			if (authorW + gap + titleW <= maxSpan) break;
			fontSize--;
		}

		const totalSpan = authorW + gap + titleW;
		const startY = topMargin + (maxSpan - totalSpan) * 0.42;

		ctx.save();
		ctx.translate(cx, startY);
		ctx.rotate(Math.PI / 2);
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';

		ctx.save();
		ctx.scale(scaleX, 1.04);
		ctx.font = authorFont(fontSize);
		ctx.globalAlpha = SECONDARY_INK_ALPHA;
		ctx.fillStyle = blind;
		ctx.fillText(authorLabel, 0, 0);
		ctx.restore();

		ctx.save();
		ctx.translate(authorW + gap, 0);
		ctx.scale(scaleX, 1.04);
		ctx.font = titleFont(fontSize);
		ctx.fillStyle = blind;
		ctx.fillText(titleLabel, 0, 0);
		ctx.restore();

		ctx.restore();

		// Preserve Stoa's canonical combination mark and double bottom rule at the foot.
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, h * 0.85, w, h * 0.15);
		ctx.clip();
		info.defaultPaint();
		ctx.restore();

		ctx.restore();
	},

	// --- Endpapers & Bookplate ---
	endpaperStyle: 'marbled',
	endpaperColors: ['ochreLinen', 'agedVellum', 'umberCalf'],
	showBookplate: true,

	// --- Interior Paper & Typography ---
	paperTint: '#f8f2e4',
	inkColor: '#241c16',
	mutedInkColor: '#6d5b49',
	accentColor: '#c48612'
};
