import type { FramePropSpec, StackedBookSpec } from '#lib/catalog/props.ts';

export function getFramePivotY(frame: FramePropSpec): number {
	return frame.position[1] + (frame.thickness / 2) * Math.abs(Math.sin(frame.tiltX));
}

// The bottom face joins (+/-1, -phi, 0) to (0, -1, phi) before normalization.
const phi = (1 + Math.sqrt(5)) / 2;
export const sculptureTilt = Math.atan((phi - 1) / phi);

export function getSculptureCenterY(surfaceY: number, radius: number): number {
	return surfaceY + radius * phi * Math.cos(sculptureTilt) / Math.hypot(1, phi);
}

export function layoutBookStack(books: readonly StackedBookSpec[]) {
	let topY = 0;
	const layers = books.map((book) => {
		const centerY = topY + book.thickness / 2;
		topY += book.thickness;
		return { book, centerY };
	});
	return { layers, topY };
}

export const STACK_COVER_THICKNESS = 0.003;
export const STACK_SPINE_DEPTH = 0.008;

export function getHourglassRods(radius: number, height: number) {
	return Array.from({ length: 3 }, (_, index): [number, number, number] => {
		const angle = index * 2 * Math.PI / 3;
		return [Math.cos(angle) * radius * 0.84, height / 2, Math.sin(angle) * radius * 0.84];
	});
}

export function rosettePetals(count: number, potRadius: number) {
	const goldenAngle = 2.399963229728653;
	return Array.from({ length: count }, (_, i) => {
		const t = i / Math.max(1, count - 1);
		const angle = i * goldenAngle;
		const radialOffset = potRadius * (0.08 + t * 0.44);
		const pitch = 0.28 + t * 0.92;
		const scale = 0.62 + t * 0.52;
		return { i, angle, radialOffset, pitch, scale };
	});
}
