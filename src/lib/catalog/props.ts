import { getShelfSurfaceY } from '#lib/catalog/bookcase.ts';
import type { VolumeClayTone } from '#lib/catalog/types.ts';

export type VaseProfile = 'amphora' | 'belly' | 'bowl';

export interface VasePropSpec {
	readonly kind: 'vase';
	readonly id: string;
	readonly shelfIndex: number;
	readonly profile: VaseProfile;
	readonly position: readonly [x: number, y: number, z: number];
	readonly scale: number;
	readonly clayTone: VolumeClayTone;
}

export interface FramePropSpec {
	readonly kind: 'frame';
	readonly print: 'coast' | 'temple' | 'hills';
	readonly id: string;
	readonly shelfIndex: number;
	readonly width: number;
	readonly height: number;
	readonly thickness: number;
	readonly position: readonly [x: number, y: number, z: number];
	/** Backward tilt in radians (negative tilts the top back toward -Z). */
	readonly tiltX: number;
	readonly clayTone: VolumeClayTone;
}

export interface PlanterPropSpec {
	readonly kind: 'planter';
	readonly id: string;
	readonly shelfIndex: number;
	readonly potRadius: number;
	readonly potHeight: number;
	readonly leafCount: number;
	readonly leafStyle: 'rosette' | 'tall';
	readonly position: readonly [x: number, y: number, z: number];
	readonly clayTone: VolumeClayTone;
}

export interface BookendPropSpec {
	readonly kind: 'bookend';
	readonly id: string;
	readonly shelfIndex: number;
	readonly width: number;
	readonly height: number;
	readonly depth: number;
	readonly position: readonly [x: number, y: number, z: number];
	readonly clayTone: VolumeClayTone;
}

export interface SculpturePropSpec {
	readonly kind: 'sculpture';
	readonly id: string;
	readonly shelfIndex: number;
	readonly radius: number;
	readonly position: readonly [x: number, y: number, z: number];
	readonly clayTone: VolumeClayTone;
}

export interface GlobePropSpec {
	readonly kind: 'globe';
	readonly id: string;
	readonly shelfIndex: number;
	readonly radius: number;
	readonly position: readonly [x: number, y: number, z: number];
	readonly clayTone: VolumeClayTone;
}

export interface CandlestickPropSpec {
	readonly kind: 'candlestick';
	readonly id: string;
	readonly shelfIndex: number;
	readonly height: number;
	readonly baseRadius: number;
	readonly position: readonly [x: number, y: number, z: number];
	readonly clayTone: VolumeClayTone;
}

export interface KeepsakeBoxPropSpec {
	readonly kind: 'keepsake-box';
	readonly id: string;
	readonly shelfIndex: number;
	readonly width: number;
	readonly height: number;
	readonly depth: number;
	readonly yaw: number;
	readonly position: readonly [x: number, y: number, z: number];
	readonly clayTone: VolumeClayTone;
}

export interface StackedBookSpec {
	readonly width: number;
	readonly depth: number;
	readonly thickness: number;
	readonly yaw: number;
	readonly offsetX: number;
	readonly clayTone: VolumeClayTone;
}

export interface BookStackPropSpec {
	readonly kind: 'book-stack';
	readonly id: string;
	readonly shelfIndex: number;
	readonly position: readonly [x: number, y: number, z: number];
	readonly books: readonly StackedBookSpec[];
	readonly topper?: {
		readonly profile: 'bowl' | 'hourglass' | 'sculpture';
		readonly scale: number;
		readonly clayTone: VolumeClayTone;
	};
}

export type ShelfPropSpec =
	| VasePropSpec
	| FramePropSpec
	| PlanterPropSpec
	| BookendPropSpec
	| SculpturePropSpec
	| GlobePropSpec
	| CandlestickPropSpec
	| KeepsakeBoxPropSpec
	| BookStackPropSpec;

/**
 * Returns deterministic, non-overlapping Shelf Prop placements across all 5 Shelves (meters).
 * Keeps ceramic vases restrained (2 total across the Bookcase) and mixes in classical study
 * props: tabletop globe, hourglass, taper candlesticks, keepsake boxes, frames, planters,
 * bookends, geometric sculptures, and horizontal book stacks.
 */
export function getShelfProps(): readonly ShelfPropSpec[] {
	const y0 = getShelfSurfaceY(0);
	const y1 = getShelfSurfaceY(1);
	const y2 = getShelfSurfaceY(2);
	const y3 = getShelfSurfaceY(3);
	const y4 = getShelfSurfaceY(4);

	return [
		// --- Shelf 0 (bottom): Arch bookend supporting left run, folio stack + stoneware bowl, belly vase ---
		{
			kind: 'bookend',
			id: 'shelf0-arch-bookend',
			shelfIndex: 0,
			width: 0.048,
			height: 0.145,
			depth: 0.11,
			position: [-0.457, y0, -0.11],
			clayTone: 'slateClay'
		},
		{
			kind: 'book-stack',
			id: 'shelf0-folio-stack',
			shelfIndex: 0,
			position: [-0.21, y0, -0.14],
			books: [
				{ width: 0.28, depth: 0.2, thickness: 0.032, yaw: 0.02, offsetX: 0, clayTone: 'stone' },
				{ width: 0.265, depth: 0.19, thickness: 0.028, yaw: -0.03, offsetX: 0.005, clayTone: 'alabaster' },
				{ width: 0.25, depth: 0.18, thickness: 0.026, yaw: 0.04, offsetX: -0.004, clayTone: 'warmClay' },
				{ width: 0.23, depth: 0.17, thickness: 0.024, yaw: -0.015, offsetX: 0.003, clayTone: 'ash' }
			],
			topper: { profile: 'bowl', scale: 0.96, clayTone: 'alabaster' }
		},
		{
			kind: 'vase',
			id: 'shelf0-belly-vase',
			shelfIndex: 0,
			profile: 'belly',
			position: [0.07, y0, -0.15],
			scale: 0.98,
			clayTone: 'warmClay'
		},

		// --- Shelf 1 (lower-middle): Tall planter, geometric sculpture, horizontal stack topped with hourglass ---
		{
			kind: 'planter',
			id: 'shelf1-tall-planter',
			shelfIndex: 1,
			potRadius: 0.064,
			potHeight: 0.105,
			leafCount: 11,
			leafStyle: 'tall',
			position: [-0.245, y1, -0.14],
			clayTone: 'alabaster'
		},
		{
			kind: 'sculpture',
			id: 'shelf1-polyhedron',
			shelfIndex: 1,
			radius: 0.056,
			position: [-0.075, y1, -0.13],
			clayTone: 'slateClay'
		},
		{
			kind: 'book-stack',
			id: 'shelf1-low-stack',
			shelfIndex: 1,
			position: [0.15, y1, -0.14],
			books: [
				{ width: 0.23, depth: 0.175, thickness: 0.03, yaw: -0.02, offsetX: 0, clayTone: 'ash' },
				{ width: 0.21, depth: 0.165, thickness: 0.026, yaw: 0.035, offsetX: 0.004, clayTone: 'alabaster' }
			],
			topper: { profile: 'hourglass', scale: 1.0, clayTone: 'warmClay' }
		},

		// --- Shelf 2 (eye-level default view): Hero leaning frame, single ceramic amphora, keepsake box, arch bookend ---
		{
			kind: 'frame',
			id: 'shelf2-hero-frame',
			print: 'coast',
			shelfIndex: 2,
			width: 0.23,
			height: 0.27,
			thickness: 0.018,
			position: [-0.14, y2, -0.255],
			tiltX: -0.11,
			clayTone: 'alabaster'
		},
		{
			kind: 'vase',
			id: 'shelf2-amphora',
			shelfIndex: 2,
			profile: 'amphora',
			position: [0.065, y2, -0.14],
			scale: 0.96,
			clayTone: 'stone'
		},
		{
			kind: 'keepsake-box',
			id: 'shelf2-keepsake-box',
			shelfIndex: 2,
			width: 0.115,
			height: 0.058,
			depth: 0.095,
			yaw: -0.08,
			position: [0.21, y2, -0.13],
			clayTone: 'charcoal'
		},
		{
			kind: 'bookend',
			id: 'shelf2-arch-bookend',
			shelfIndex: 2,
			width: 0.046,
			height: 0.135,
			depth: 0.105,
			position: [0.34, y2, -0.11],
			clayTone: 'warmClay'
		},

		// --- Shelf 3 (upper-middle): Tabletop globe + taper candlestick, right horizontal stack + shallow bowl ---
		{
			kind: 'globe',
			id: 'shelf3-tabletop-globe',
			shelfIndex: 3,
			radius: 0.072,
			position: [-0.12, y3, -0.15],
			clayTone: 'alabaster'
		},
		{
			kind: 'candlestick',
			id: 'shelf3-candlestick',
			shelfIndex: 3,
			height: 0.175,
			baseRadius: 0.032,
			position: [0.025, y3, -0.125],
			clayTone: 'slateClay'
		},
		{
			kind: 'book-stack',
			id: 'shelf3-right-stack',
			shelfIndex: 3,
			position: [0.23, y3, -0.14],
			books: [
				{ width: 0.255, depth: 0.185, thickness: 0.03, yaw: 0.015, offsetX: 0, clayTone: 'stone' },
				{ width: 0.24, depth: 0.18, thickness: 0.028, yaw: -0.025, offsetX: -0.004, clayTone: 'warmClay' },
				{ width: 0.22, depth: 0.17, thickness: 0.024, yaw: 0.03, offsetX: 0.003, clayTone: 'alabaster' }
			],
			topper: { profile: 'bowl', scale: 0.9, clayTone: 'ash' }
		},

		// --- Shelf 4 (top): Overlapping leaning art frames on left, succulent planter, candlestick + keepsake box ---
		{
			kind: 'frame',
			id: 'shelf4-frame-large',
			print: 'temple',
			shelfIndex: 4,
			width: 0.22,
			height: 0.25,
			thickness: 0.016,
			position: [-0.48, y4, -0.255],
			tiltX: -0.1,
			clayTone: 'stone'
		},
		{
			kind: 'frame',
			id: 'shelf4-frame-small',
			print: 'hills',
			shelfIndex: 4,
			width: 0.16,
			height: 0.19,
			thickness: 0.015,
			position: [-0.32, y4, -0.215],
			tiltX: -0.11,
			clayTone: 'alabaster'
		},
		{
			kind: 'planter',
			id: 'shelf4-succulent-planter',
			shelfIndex: 4,
			potRadius: 0.056,
			potHeight: 0.085,
			leafCount: 14,
			leafStyle: 'rosette',
			position: [-0.145, y4, -0.13],
			clayTone: 'warmClay'
		},
		{
			kind: 'candlestick',
			id: 'shelf4-candlestick',
			shelfIndex: 4,
			height: 0.19,
			baseRadius: 0.034,
			position: [0.005, y4, -0.145],
			clayTone: 'ash'
		},
		{
			kind: 'keepsake-box',
			id: 'shelf4-keepsake-box',
			shelfIndex: 4,
			width: 0.12,
			height: 0.054,
			depth: 0.095,
			yaw: 0.06,
			position: [0.135, y4, -0.14],
			clayTone: 'charcoal'
		}
	];
}
