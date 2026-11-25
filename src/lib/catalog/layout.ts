import { getBookcaseStructure } from './bookcase.ts';
import { CATALOG } from './volumes.ts';
import type { PlacedVolume, VolumeDimensions, VolumeEntry, VolumeGeometryParts } from './types.ts';

/**
 * Shared physical tolerances for deterministic Shelf packing and parametric Volume construction (meters).
 */
export const VOLUME_LAYOUT_CONSTANTS = {
	/** Horizontal clearance from the Bookcase side panels on each end of a Shelf. */
	shelfEndMargin: 0.024,
	/** Minimum horizontal gap between adjacent upright Volumes so covers never clip or Z-fight. */
	minGap: 0.004,
	/** Additional deterministic micro-gap variation between adjacent upright Volumes. */
	maxExtraGap: 0.003,
	/** Tiny contact clearance where a leaning Volume meets its upright neighbor. */
	leanContactGap: 0.0025,
	/** Base recess behind the front edge of the Shelf (z = 0) so spines sit naturally on the Shelf. */
	baseSpineRecess: 0.03,
	/** Maximum deterministic forward/back stagger for organic spine alignment. */
	maxSpineStagger: 0.012,
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
 * Computes non-overlapping local geometry specs for a parametric clay Volume silhouette:
 * front board, back board, rounded spine, and slightly recessed page block.
 *
 * Local pivot convention:
 * - x = 0: horizontal center of the Volume
 * - y = 0: flush at the bottom of the cover boards
 * - z = 0: outermost front edge of the rounded spine (Volume extends into -Z)
 */
export function getVolumeGeometryParts(dimensions: VolumeDimensions): VolumeGeometryParts {
	const { height, depth, thickness } = dimensions;
	const c = VOLUME_LAYOUT_CONSTANTS;

	const spineRadius = thickness / 2;
	const spineDepth = Math.min(0.012, thickness * 0.28);
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

	return {
		spine: {
			radius: spineRadius,
			depth: spineDepth,
			height,
			position: [0, height / 2, -spineDepth],
			scaleZ: spineDepth / spineRadius
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

/**
 * Deterministically places all Catalog Volumes onto their assigned Bookcase Shelves
 * in asymmetric left/right clusters with exact trigonometry for leaning end Volumes.
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

		let slotCounter = 0;

		// Left-anchored cluster: pack from left side panel toward center (+X)
		const leftCluster = shelfVolumes.filter((v) => v.placement.anchor === 'left');
		let leftCursorX = -shelf.innerWidth / 2 + c.shelfEndMargin;

		for (const volume of leftCluster) {
			const { thickness, height } = volume.dimensions;
			const lean = volume.placement.leanRadians ?? 0;
			const stagger = deterministicUnit(`${volume.id}:recess`) * c.maxSpineStagger;
			const spineZ = -(c.baseSpineRecess + stagger);

			if (lean > 0) {
				// Top tilts left (-X) to kiss the previous Volume's right face at leftCursorX
				const pivotY = shelf.surfaceY + (thickness / 2) * Math.sin(lean);
				const pivotX =
					leftCursorX + c.leanContactGap + (thickness / 2) * Math.cos(lean) + height * Math.sin(lean);

				placed.push({
					volume,
					shelfIndex: shelf.index,
					slotIndex: slotCounter++,
					position: [pivotX, pivotY, spineZ],
					rotationZ: lean
				});

				leftCursorX = pivotX + (thickness / 2) * Math.cos(lean);
			} else {
				const centerX = leftCursorX + thickness / 2;
				placed.push({
					volume,
					shelfIndex: shelf.index,
					slotIndex: slotCounter++,
					position: [centerX, shelf.surfaceY, spineZ],
					rotationZ: 0
				});

				const gap = c.minGap + deterministicUnit(`${volume.id}:gap`) * c.maxExtraGap;
				leftCursorX += thickness + gap;
			}
		}

		// Right-anchored cluster: pack from right side panel toward center (-X)
		const rightCluster = shelfVolumes.filter((v) => v.placement.anchor === 'right');
		let rightCursorX = shelf.innerWidth / 2 - c.shelfEndMargin;

		// Place from rightmost to leftmost so a leaning Volume at the inner edge rests against its right neighbor
		for (let i = rightCluster.length - 1; i >= 0; i -= 1) {
			const volume = rightCluster[i];
			const { thickness, height } = volume.dimensions;
			const lean = volume.placement.leanRadians ?? 0;
			const stagger = deterministicUnit(`${volume.id}:recess`) * c.maxSpineStagger;
			const spineZ = -(c.baseSpineRecess + stagger);

			if (lean < 0) {
				// Top tilts right (+X) to kiss the neighbor on its right at rightCursorX
				const alpha = Math.abs(lean);
				const pivotY = shelf.surfaceY + (thickness / 2) * Math.sin(alpha);
				const pivotX =
					rightCursorX -
					c.leanContactGap -
					(thickness / 2) * Math.cos(alpha) -
					height * Math.sin(alpha);

				placed.push({
					volume,
					shelfIndex: shelf.index,
					slotIndex: slotCounter++,
					position: [pivotX, pivotY, spineZ],
					rotationZ: lean
				});

				rightCursorX = pivotX - (thickness / 2) * Math.cos(alpha);
			} else {
				const centerX = rightCursorX - thickness / 2;
				placed.push({
					volume,
					shelfIndex: shelf.index,
					slotIndex: slotCounter++,
					position: [centerX, shelf.surfaceY, spineZ],
					rotationZ: 0
				});

				const gap = c.minGap + deterministicUnit(`${volume.id}:gap`) * c.maxExtraGap;
				rightCursorX -= thickness + gap;
			}
		}
	}

	return placed;
}
