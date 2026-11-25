import { getBookcaseStructure, type ShelfSpec } from '#lib/catalog/bookcase.ts';
import { CATALOG } from '#lib/catalog/volumes.ts';
import type {
	PlacedVolume,
	SpineProfile,
	VolumeDimensions,
	Volume,
	VolumeGeometryParts
} from '#lib/catalog/types.ts';

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

function spineZFor(volume: Volume): number {
	const c = VOLUME_LAYOUT_CONSTANTS;
	return -(c.baseSpineRecess + deterministicUnit(`${volume.id}:recess`) * c.maxSpineStagger);
}

function gapFor(volume: Volume): number {
	const c = VOLUME_LAYOUT_CONSTANTS;
	return c.minGap + deterministicUnit(`${volume.id}:gap`) * c.maxExtraGap;
}

/** Place Volumes from the side panel inward. The cursor tracks the last cover edge. */
function packCluster(ctx: PackContext, volumes: readonly Volume[], direction: 1 | -1): void {
	let edge = -direction * (ctx.shelf.innerWidth / 2 - VOLUME_LAYOUT_CONSTANTS.shelfEndMargin);
	let uprightGap = 0;
	let supportHeight = 0;

	for (const volume of volumes) {
		const { height, thickness } = volume.dimensions;
		const lean = volume.placement.leanRadians ?? 0;
		const angle = Math.abs(lean);
		const halfWidth = (thickness / 2) * Math.cos(angle);
		const lift = (thickness / 2) * Math.sin(angle);
		// A shorter support meets the leaning cover below its top corner.
		const reach = Math.min(height * Math.sin(angle), supportHeight * Math.tan(angle));
		const pivotX = edge + direction * (halfWidth + (lean === 0 ? uprightGap : reach));

		ctx.placed.push({
			volume,
			shelfIndex: ctx.shelf.index,
			slotIndex: ctx.slotCounter++,
			position: [pivotX, ctx.shelf.surfaceY + lift, spineZFor(volume)],
			rotationZ: lean
		});
		edge = pivotX + direction * halfWidth;
		uprightGap = gapFor(volume);
		supportHeight = height;
	}
}

export function layoutCatalogOnBookcase(catalog: readonly Volume[] = CATALOG): readonly PlacedVolume[] {
	const placed: PlacedVolume[] = [];
	for (const shelf of getBookcaseStructure().shelves) {
		const volumes = catalog.filter((volume) => volume.shelfIndex === shelf.index);
		const ctx = { shelf, placed, slotCounter: 0 };
		packCluster(ctx, volumes.filter((v) => v.placement.anchor === 'left'), 1);
		packCluster(ctx, volumes.filter((v) => v.placement.anchor === 'right').reverse(), -1);
	}
	return placed;
}
