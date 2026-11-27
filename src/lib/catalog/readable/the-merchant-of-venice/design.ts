import type { VolumeDesign } from '#lib/catalog/readable/types.ts';

export const SOURCE_NOTE = '1887 Victoria edition · Standard Ebooks';

export const design: VolumeDesign = {
	bindingStyle: 'blind-tooled-calf',
	coverColor: 'slateBlue',
	foilColor: '#b89558',
	headbandColor: '#a17d48',
	sourceNote: SOURCE_NOTE,
	coverBorder: 'single-rule',
	emblem: {
		// Balance beam, upright, and two suspended pans in a 100-unit square.
		svgPath: [
			'M46 19a4 4 0 1 1 8 0v58h12v6H34v-6h12Z',
			'M16 29q17-8 34-2q17-6 34 2v5q-17-8-34-2q-17-6-34 2Z',
			'M17 32h4L11 56H7Zm4 0 11 24h-4L17 32Z',
			'M79 32h4L73 56h-4Zm4 0 11 24h-4L79 32Z',
			'M3 55h34q-3 12-17 12T3 55Zm61 0h34q-3 12-17 12T64 55Z'
		].join(' ')
	},
	paintFrontCover(ctx, { width, height, blind, defaultPaint }) {
		defaultPaint();

		// A blind-tooled Venetian ogee arch frames the foil medallion.
		const center = width / 2;
		const halfSpan = width * 0.19;
		const springline = height * 0.635;
		const foot = height * 0.765;
		const crown = height * 0.515;
		ctx.save();
		ctx.strokeStyle = blind;
		ctx.lineWidth = width * 0.005;
		ctx.beginPath();
		ctx.moveTo(center - halfSpan, foot);
		ctx.lineTo(center - halfSpan, springline);
		ctx.bezierCurveTo(
			center - halfSpan, height * 0.57,
			center - halfSpan * 0.22, height * 0.58,
			center, crown
		);
		ctx.bezierCurveTo(
			center + halfSpan * 0.22, height * 0.58,
			center + halfSpan, height * 0.57,
			center + halfSpan, springline
		);
		ctx.lineTo(center + halfSpan, foot);
		ctx.closePath();
		ctx.stroke();
		ctx.restore();
	}
};
