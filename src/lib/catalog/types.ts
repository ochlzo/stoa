export type BindingStyleId =
	| 'raised-band-leather'
	| 'linen-cloth'
	| 'quarter-vellum'
	| 'blind-tooled-calf';

export type VolumeClayTone =
	| 'bone'
	| 'alabaster'
	| 'stone'
	| 'warmClay'
	| 'ash'
	| 'slateClay'
	| 'charcoal';

/**
 * Spine silhouette of a Volume (geometry only; Binding Style trim is a later pass):
 * - "rounded": full half-cylinder spine (classic hardcover)
 * - "shallow": barely domed spine (thin volumes, vellum)
 * - "flat": squared-off box spine (cloth-bound reference volumes)
 */
export type SpineProfile = 'rounded' | 'shallow' | 'flat';

/**
 * Physical dimensions of a Volume in real-world meters (1 unit = 1 meter).
 */
export interface VolumeDimensions {
	/** Vertical height of the cover boards along Y (meters). */
	readonly height: number;
	/** Distance from outer spine edge to fore-edge along -Z (meters). */
	readonly depth: number;
	/** Spine width across X (meters). */
	readonly thickness: number;
}

/**
 * Placement cluster and tilt directive for asymmetric, editorial Shelf arrangements.
 */
export interface VolumePlacementRule {
	readonly anchor: 'left' | 'right';
	/**
	 * Optional tilt angle in radians around the Z-axis.
	 * Positive leans the top toward -X (resting against the neighbor on its left).
	 * Negative leans the top toward +X (resting against the neighbor on its right).
	 */
	readonly leanRadians?: number;
}

interface VolumeBase {
	readonly id: string;
	readonly title: string;
	readonly author: string;
	/** Zero-based Shelf index from bottom (0) to top (4). */
	readonly shelfIndex: number;
	readonly dimensions: VolumeDimensions;
	readonly bindingStyle: BindingStyleId;
	readonly clayTone: VolumeClayTone;
	readonly spineProfile: SpineProfile;
	readonly placement: VolumePlacementRule;
}

export interface ReadableVolume extends VolumeBase {
	readonly kind: 'readable';
}

export interface PlaceholderVolume extends VolumeBase {
	readonly kind: 'placeholder';
}

export type Volume = ReadableVolume | PlaceholderVolume;

export interface PlacedVolume {
	readonly volume: Volume;
	readonly shelfIndex: number;
	readonly slotIndex: number;
	/**
	 * World position of the Volume's local pivot (meters):
	 * - x: horizontal center of the Volume
	 * - y: flush on the top surface of its Shelf (adjusted automatically when leaning)
	 * - z: aligned to the outermost edge of the spine
	 */
	readonly position: readonly [x: number, y: number, z: number];
	/** Z-axis tilt in radians (0 for upright Volumes). */
	readonly rotationZ: number;
}

export interface VolumeGeometryParts {
	readonly spine: {
		readonly shape: 'rounded' | 'flat';
		/** Half-cylinder radius (rounded/shallow spines). */
		readonly radius: number;
		/** How far the spine protrudes in front of the boards along +Z (meters). */
		readonly depth: number;
		readonly height: number;
		readonly position: readonly [x: number, y: number, z: number];
		/** Z squash applied to the half-cylinder so it protrudes exactly `depth`. */
		readonly scaleZ: number;
		/** Box size for flat spines [width, height, depth]. */
		readonly size: readonly [width: number, height: number, depth: number];
	};
	readonly frontBoard: {
		readonly size: readonly [width: number, height: number, depth: number];
		readonly position: readonly [x: number, y: number, z: number];
	};
	readonly backBoard: {
		readonly size: readonly [width: number, height: number, depth: number];
		readonly position: readonly [x: number, y: number, z: number];
	};
	readonly pageBlock: {
		readonly size: readonly [width: number, height: number, depth: number];
		readonly position: readonly [x: number, y: number, z: number];
	};
}
