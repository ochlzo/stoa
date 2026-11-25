import { getBookcaseStructure, type ShelfSpec } from './bookcase.ts';
import { CATALOG } from './volumes.ts';
import type {
	PlacedVolume,
	SpineProfile,
	VolumeDimensions,
	VolumeEntry,
	VolumeGeometryParts
} from './types.ts';

/**
 * Shared physical tolerances for deterministic Shelf packing and parametric Volume construction (meters).
 */
export const VOLUME_LAYOUT_CONSTANTS = {
	/** Horizontal clearance from the Bookcase side panels on each end of a Shelf. */
	shelfEndMargin: 0.024,
	/** Minimum horizontal gap between adjacent upright Volumes so covers never clip or Z-fight. */
	minGap: 0.004,
	/** Additional deterministic micro-gap variation between adjacent upright Volumes. */
	maxExtraGap: 0.004,
	/** Tiny contact clearance where a leaning Volume meets its upright neighbor. */
	leanContactGap: 0.0025,
	/** Base recess behind the front edge of the Shelf (z = 0) so spines sit naturally on the Shelf. */
	baseSpineRecess: 0.028,
	/** Maximum deterministic forward/back stagger for organic spine alignment. */
	maxSpineStagger: 0.022,
	/** Hardcover board thickness. */
	boardThickness: 0.0032,
	/** Vertical overhang of cover boards above and below the page block. */
	pageBlockVerticalInset: 0.0045,
	/** Horizontal recess of the page block behind the fore-edge of the covers. */
	pageBlockForeEdgeInset: 0.005,
	/** Tiny clearance between the page block and inner board/spine faces to prevent Z-fighting. */
	innerClearance: 0.0004
} as const;

/**
 * Deterministic string hash -> float in [0, 1).
 * Keeps Shelf gaps and spine recess stagger repeatable across renders without Math.random().
 */
function deterministicUnit(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i += 1) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) / 4294967296;
}

/**
 * How far each spine profile protrudes in front of the cover boards (meters).
 */
function getSpineDepth(profile: SpineProfile, thickness: number): number {
	switch (profile) {
		case 'flat':
			return 0.004;
		case 'shallow':
			return Math.min(0.005, thickness * 0.14);
		case 'rounded':
			return Math.min(0.012, thickness * 0.28);
	}
}

/**
 * Computes non-overlapping local geometry specs for a parametric clay Volume silhouette:
 * front board, back board, spine (rounded, shallow, or flat), and slightly recessed page block.
 *
 * Local pivot convention:
 * - x = 0: horizontal center of the Volume
 * - y = 0: flush at the bottom of the cover boards
 * - z = 0: outermost front edge of the spine (Volume extends into -Z)
 */
export function getVolumeGeometryParts(
	dimensions: VolumeDimensions,
	spineProfile: SpineProfile = 'rounded'
): VolumeGeometryParts {
	const { height, depth, thickness } = dimensions;
	const c = VOLUME_LAYOUT_CONSTANTS;

	const spineRadius = thickness / 2;
	const spineDepth = getSpineDepth(spineProfile, thickness);
	const boardDepth = Math.max(0.02, depth - spineDepth);
	const boardCenterZ = -(spineDepth + boardDepth / 2);
	const boardOffsetX = thickness / 2 - c.boardThickness / 2;

	const pageWidth = Math.max(0.004, thickness - c.boardThickness * 2 - c.innerClearance * 2);
	const pageHeight = Math.max(0.02, height - c.pageBlockVerticalInset * 2);
	const pageDepth = Math.max(
		0.015,
		depth - spineDepth - c.pageBlockForeEdgeInset - c.innerClearance
	);
	const pageCenterZ = -(spineDepth + c.innerClearance + pageDepth / 2);

	const isFlat = spineProfile === 'flat';

	return {
		spine: {
			shape: isFlat ? 'flat' : 'rounded',
			radius: spineRadius,
			depth: spineDepth,
			height,
			position: isFlat ? [0, height / 2, -spineDepth / 2] : [0, height / 2, -spineDepth],
			scaleZ: spineDepth / spineRadius,
			size: [thickness, height, spineDepth]
		},
		frontBoard: {
			size: [c.boardThickness, height, boardDepth],
			position: [-boardOffsetX, height / 2, boardCenterZ]
		},
		backBoard: {
			size: [c.boardThickness, height, boardDepth],
			position: [boardOffsetX, height / 2, boardCenterZ]
		},
		pageBlock: {
			size: [pageWidth, pageHeight, pageDepth],
			position: [0, height / 2, pageCenterZ]
		}
	};
}

interface PackContext {
	readonly shelf: ShelfSpec;
	readonly placed: PlacedVolume[];
	slotCounter: number;
}

function spineZFor(volume: VolumeEntry): number {
	const c = VOLUME_LAYOUT_CONSTANTS;
	return -(c.baseSpineRecess + deterministicUnit(`${volume.id}:recess`) * c.maxSpineStagger);
}

function gapFor(volume: VolumeEntry): number {
	const c = VOLUME_LAYOUT_CONSTANTS;
	return c.minGap + deterministicUnit(`${volume.id}:gap`) * c.maxExtraGap;
}

/**
 * Packs a cluster from `startX` toward +X (visual left-to-right).
 * A positively leaning Volume tilts its top toward -X and rests on the previous neighbor.
 */
function packTowardRight(ctx: PackContext, volumes: readonly VolumeEntry[], startX: number): void {
	const c = VOLUME_LAYOUT_CONSTANTS;
	let cursorX = startX;

	for (const volume of volumes) {
		const { thickness, height } = volume.dimensions;
		const lean = volume.placement.leanRadians ?? 0;
		const spineZ = spineZFor(volume);

		if (lean > 0) {
			const pivotY = ctx.shelf.surfaceY + (thickness / 2) * Math.sin(lean);
			const pivotX =
				cursorX + c.leanContactGap + (thickness / 2) * Math.cos(lean) + height * Math.sin(lean);

			ctx.placed.push({
				volume,
				shelfIndex: ctx.shelf.index,
				slotIndex: ctx.slotCounter++,
				position: [pivotX, pivotY, spineZ],
				rotationZ: lean
			});
			cursorX = pivotX + (thickness / 2) * Math.cos(lean);
		} else {
			ctx.placed.push({
				volume,
				shelfIndex: ctx.shelf.index,
				slotIndex: ctx.slotCounter++,
				position: [cursorX + thickness / 2, ctx.shelf.surfaceY, spineZ],
				rotationZ: 0
			});
			cursorX += thickness + gapFor(volume);
		}
	}
}

/**
 * Packs a cluster from `startX` toward -X. `volumes` are listed visually left-to-right,
 * so the loop walks them from the outer (right) end inward. A negatively leaning Volume
 * tilts its top toward +X and rests on the neighbor on its right.
 */
function packTowardLeft(ctx: PackContext, volumes: readonly VolumeEntry[], startX: number): void {
	const c = VOLUME_LAYOUT_CONSTANTS;
	let cursorX = startX;

	for (let i = volumes.length - 1; i >= 0; i -= 1) {
		const volume = volumes[i];
		const { thickness, height } = volume.dimensions;
		const lean = volume.placement.leanRadians ?? 0;
		const spineZ = spineZFor(volume);

		if (lean < 0) {
			const alpha = Math.abs(lean);
			const pivotY = ctx.shelf.surfaceY + (thickness / 2) * Math.sin(alpha);
			const pivotX =
				cursorX - c.leanContactGap - (thickness / 2) * Math.cos(alpha) - height * Math.sin(alpha);

			ctx.placed.push({
				volume,
				shelfIndex: ctx.shelf.index,
				slotIndex: ctx.slotCounter++,
				position: [pivotX, pivotY, spineZ],
				rotationZ: lean
			});
			cursorX = pivotX - (thickness / 2) * Math.cos(alpha);
		} else {
			ctx.placed.push({
				volume,
				shelfIndex: ctx.shelf.index,
				slotIndex: ctx.slotCounter++,
				position: [cursorX - thickness / 2, ctx.shelf.surfaceY, spineZ],
				rotationZ: 0
			});
			cursorX -= thickness + gapFor(volume);
		}
	}
}

/**
 * Deterministically places all Catalog Volumes onto their assigned Bookcase Shelves in
 * asymmetric left, inset, and right clusters with exact trigonometry for leaning end Volumes.
 */
export function layoutCatalogOnBookcase(
	catalog: readonly VolumeEntry[] = CATALOG
): readonly PlacedVolume[] {
	const bookcase = getBookcaseStructure();
	const c = VOLUME_LAYOUT_CONSTANTS;
	const placed: PlacedVolume[] = [];

	for (const shelf of bookcase.shelves) {
		const shelfVolumes = catalog.filter((entry) => entry.shelfIndex === shelf.index);
		if (shelfVolumes.length === 0) continue;

		const ctx: PackContext = { shelf, placed, slotCounter: 0 };

		const leftCluster = shelfVolumes.filter((v) => v.placement.anchor === 'left');
		packTowardRight(ctx, leftCluster, -shelf.innerWidth / 2 + c.shelfEndMargin);

		// Inset clusters are grouped by their declared start X (one run per distinct start).
		const insetVolumes = shelfVolumes.filter((v) => v.placement.anchor === 'inset');
		const insetStarts = [...new Set(insetVolumes.map((v) => v.placement.startX ?? 0))];
		for (const startX of insetStarts) {
			const run = insetVolumes.filter((v) => (v.placement.startX ?? 0) === startX);
			packTowardRight(ctx, run, startX);
		}

		const rightCluster = shelfVolumes.filter((v) => v.placement.anchor === 'right');
		packTowardLeft(ctx, rightCluster, shelf.innerWidth / 2 - c.shelfEndMargin);
	}

	return placed;
}
