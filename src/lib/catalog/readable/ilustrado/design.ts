import type { VolumeDesign } from '#lib/catalog/readable/types.ts';

/**
 * Linear PBR stamp channels in Stoa's volume shader:
 * - Red channel (`toolColor` = #1e1915, metalness = 0): crisp espresso-black ink on warm
 *   cream parchment so the spine and back cover match the ink-and-gold nib front cover.
 */
const INK_PRIMARY = 'rgb(255, 145, 0)'; // Crisp deep black-ink lettering (#1e1915)
const INK_SECONDARY = 'rgb(198, 162, 0)'; // Muted charcoal-sepia ink for secondary lines

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
	foilColor: '#d99a16',
	headbandColor: '#e2a218',
	// UV-exact 1024x1024 fountain-pen nib front cover + matching warm cream cloth on spine/back.
	coverArtwork: {
		front: 'volumes/ilustrado/front-cover.webp',
		back: 'volumes/ilustrado/cream-cloth.webp',
		spine: 'volumes/ilustrado/cream-cloth.webp',
		opacity: 1
	},

	// --- Cover & Spine Stamping ---
	sourceNote:
		'Miguel Syjuco, Ilustrado (2008). Winner of the Man Asian Literary Prize · Stoa Library Edition.',
	coverBorder: 'none',
	emblem: 'none',

	// Front cover artwork already carries the golden fountain-pen nib, title, and author.
	paintFrontCover: () => {},

	/**
	 * Back Cover: Clean warm cream parchment with subtle dark-ink fountain-pen nib emblem
	 * and edition attribution.
	 */
	paintBackCover: (ctx, info) => {
		const { width: w, height: h } = info;
		const cx = w / 2;

		ctx.save();

		// Minimalist ink fountain-pen nib silhouette at optical center.
		const ny = h * 0.44;
		const s = w * 0.0014;
		ctx.save();
		ctx.translate(cx, ny);
		ctx.scale(s, s);
		ctx.strokeStyle = INK_SECONDARY;
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

		ctx.fillStyle = INK_SECONDARY;
		ctx.beginPath();
		ctx.arc(0, -6, 6.5, 0, Math.PI * 2);
		ctx.fill();

		// Base collar.
		ctx.fillRect(-30, 84, 60, 14);
		ctx.restore();

		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const noteSize = Math.round(w * 0.027);
		ctx.font = `italic 500 ${noteSize}px Georgia, "Times New Roman", serif`;
		ctx.fillStyle = INK_PRIMARY;
		ctx.fillText('Miguel Syjuco, Ilustrado (2008)', cx, h * 0.818);
		ctx.fillStyle = INK_SECONDARY;
		ctx.fillText('Winner of the Man Asian Literary Prize · Stoa Library Edition', cx, h * 0.856);

		ctx.restore();
	},

	/**
	 * Spine: Crisp black-ink single-line vertical serif ("Syjuco" + "Ilustrado") on warm cream
	 * parchment, preserving Stoa's foot combination mark and double bottom rule.
	 */
	paintSpine: (ctx, info) => {
		const { width: w, height: h } = info;
		const cx = w / 2;
		const panel = w * 0.68;

		ctx.save();

		const topMargin = h * 0.085;
		const bottomLimit = h * 0.805;
		const maxSpan = bottomLimit - topMargin;
		const scaleX = 0.94;

		let fontSize = Math.round(panel * 0.44);
		let authorW = 0;
		let titleW = 0;
		let gap = 0;

		while (fontSize > 14) {
			ctx.font = `400 ${Math.round(fontSize * 0.9)}px Georgia, "Times New Roman", serif`;
			authorW = ctx.measureText('Syjuco').width * scaleX;
			ctx.font = `italic 700 ${fontSize}px Georgia, "Times New Roman", serif`;
			titleW = ctx.measureText('Ilustrado').width * scaleX;
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
		ctx.font = `400 ${Math.round(fontSize * 0.9)}px Georgia, "Times New Roman", serif`;
		ctx.fillStyle = INK_SECONDARY;
		ctx.fillText('Syjuco', 0, 0);
		ctx.restore();

		ctx.save();
		ctx.translate(authorW + gap, 0);
		ctx.scale(scaleX, 1.04);
		ctx.font = `italic 700 ${fontSize}px Georgia, "Times New Roman", serif`;
		ctx.fillStyle = INK_PRIMARY;
		ctx.fillText('Ilustrado', 0, 0);
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
