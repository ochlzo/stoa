import { getShelfSurfaceY } from './bookcase.ts';
import type { VolumeClayTone } from './types.ts';

export type VaseProfile = 'amphora' | 'belly' | 'tall' | 'bud' | 'bowl';

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
		readonly profile: 'bowl' | 'bud' | 'sculpture';
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
	| BookStackPropSpec;

/**
 * Returns deterministic, non-overlapping Shelf Prop placements across all 5 Shelves (meters).
 * Every prop rests flush on its Shelf surface (or atop a decorative horizontal book stack)
 * and leaves generous breathing room around Catalog Volumes.
 */
export function getShelfProps(): readonly ShelfPropSpec[] {
	const y0 = getShelfSurfaceY(0);
	const y1 = getShelfSurfaceY(1);
	const y2 = getShelfSurfaceY(2);
	const y3 = getShelfSurfaceY(3);
	const y4 = getShelfSurfaceY(4);

	return [
		// --- Shelf 0 (bottom): Left folio stack + bowl, center belly vase, arch bookend supporting right Volumes ---
		{
			kind: 'book-stack',
			id: 'shelf0-folio-stack',
			shelfIndex: 0,
			position: [-0.36, y0, -0.14],
			books: [
				{ width: 0.29, depth: 0.21, thickness: 0.032, yaw: 0.02, offsetX: 0, clayTone: 'stone' },
				{ width: 0.275, depth: 0.2, thickness: 0.028, yaw: -0.03, offsetX: 0.005, clayTone: 'alabaster' },
				{ width: 0.26, depth: 0.19, thickness: 0.026, yaw: 0.04, offsetX: -0.004, clayTone: 'warmClay' },
				{ width: 0.24, depth: 0.18, thickness: 0.024, yaw: -0.015, offsetX: 0.003, clayTone: 'ash' }
			],
			topper: { profile: 'bowl', scale: 1.0, clayTone: 'alabaster' }
		},
		{
			kind: 'vase',
			id: 'shelf0-belly-vase',
			shelfIndex: 0,
			profile: 'belly',
			position: [0.1, y0, -0.15],
			scale: 1.1,
			clayTone: 'warmClay'
		},
		{
			kind: 'bookend',
			id: 'shelf0-arch-bookend',
			shelfIndex: 0,
			width: 0.052,
			height: 0.145,
			depth: 0.11,
			position: [0.46, y0, -0.11],
			clayTone: 'slateClay'
		},

		// --- Shelf 1 (lower-middle): Left tall planter, geometric sculpture, center-left low stack + bud vase ---
		{
			kind: 'planter',
			id: 'shelf1-tall-planter',
			shelfIndex: 1,
			potRadius: 0.068,
			potHeight: 0.11,
			leafCount: 11,
			leafStyle: 'tall',
			position: [-0.45, y1, -0.14],
			clayTone: 'alabaster'
		},
		{
			kind: 'sculpture',
			id: 'shelf1-polyhedron',
			shelfIndex: 1,
			radius: 0.064,
			position: [-0.21, y1, -0.13],
			clayTone: 'slateClay'
		},
		{
			kind: 'book-stack',
			id: 'shelf1-low-stack',
			shelfIndex: 1,
			position: [0.07, y1, -0.14],
			books: [
				{ width: 0.25, depth: 0.18, thickness: 0.03, yaw: -0.02, offsetX: 0, clayTone: 'ash' },
				{ width: 0.23, depth: 0.17, thickness: 0.026, yaw: 0.035, offsetX: 0.004, clayTone: 'alabaster' }
			],
			topper: { profile: 'bud', scale: 0.9, clayTone: 'stone' }
		},

		// --- Shelf 2 (eye-level default view): Hero leaning frame + ceramic amphora + arch bookend for Stoic cluster ---
		{
			kind: 'frame',
			id: 'shelf2-hero-frame',
			shelfIndex: 2,
			width: 0.24,
			height: 0.28,
			thickness: 0.018,
			position: [0.06, y2, -0.255],
			tiltX: -0.11,
			clayTone: 'alabaster'
		},
		{
			kind: 'vase',
			id: 'shelf2-amphora',
			shelfIndex: 2,
			profile: 'amphora',
			position: [0.27, y2, -0.13],
			scale: 1.0,
			clayTone: 'stone'
		},
		{
			kind: 'bookend',
			id: 'shelf2-arch-bookend',
			shelfIndex: 2,
			width: 0.048,
			height: 0.135,
			depth: 0.105,
			position: [0.49, y2, -0.11],
			clayTone: 'warmClay'
		},

		// --- Shelf 3 (upper-middle): Center tall vase + low vessel, right horizontal stack + wide stoneware bowl ---
		{
			kind: 'vase',
			id: 'shelf3-tall-vase',
			shelfIndex: 3,
			profile: 'tall',
			position: [-0.08, y3, -0.15],
			scale: 1.0,
			clayTone: 'alabaster'
		},
		{
			kind: 'vase',
			id: 'shelf3-bud-vase',
			shelfIndex: 3,
			profile: 'bud',
			position: [0.06, y3, -0.12],
			scale: 0.95,
			clayTone: 'slateClay'
		},
		{
			kind: 'book-stack',
			id: 'shelf3-right-stack',
			shelfIndex: 3,
			position: [0.36, y3, -0.14],
			books: [
				{ width: 0.27, depth: 0.19, thickness: 0.03, yaw: 0.015, offsetX: 0, clayTone: 'stone' },
				{ width: 0.255, depth: 0.185, thickness: 0.028, yaw: -0.025, offsetX: -0.004, clayTone: 'warmClay' },
				{ width: 0.235, depth: 0.175, thickness: 0.024, yaw: 0.03, offsetX: 0.003, clayTone: 'alabaster' }
			],
			topper: { profile: 'bowl', scale: 0.92, clayTone: 'ash' }
		},

		// --- Shelf 4 (top): Overlapping leaning art frames on left, succulent planter + small sculpture in center ---
		{
			kind: 'frame',
			id: 'shelf4-frame-large',
			shelfIndex: 4,
			width: 0.22,
			height: 0.25,
			thickness: 0.016,
			position: [-0.41, y4, -0.255],
			tiltX: -0.1,
			clayTone: 'stone'
		},
		{
			kind: 'frame',
			id: 'shelf4-frame-small',
			shelfIndex: 4,
			width: 0.16,
			height: 0.19,
			thickness: 0.015,
			position: [-0.26, y4, -0.215],
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
			position: [-0.04, y4, -0.13],
			clayTone: 'warmClay'
		},
		{
			kind: 'vase',
			id: 'shelf4-belly-mini',
			shelfIndex: 4,
			profile: 'belly',
			position: [0.15, y4, -0.15],
			scale: 0.72,
			clayTone: 'ash'
		}
	];
}
