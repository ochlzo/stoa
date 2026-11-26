import { getBookcaseStructure, type ShelfSpec } from '#lib/catalog/bookcase.ts';
import { CATALOG } from '#lib/catalog/volumes.ts';
import type {
	BindingStyleId,
	BindingStylePreset,
	BookmarkRibbonSpec,
	HeadbandSpec,
	PlacedVolume,
	SpineBandSpec,
	SpineProfile,
	VolumeDimensions,
	Volume,
	VolumeGeometryParts
} from '#lib/catalog/types.ts';

/**
 * Shared physical tolerances for deterministic Shelf packing and parametric Volume construction (meters).
 */
export const VOLUME_LAYOUT_CONSTANTS = {
	/** Hairline horizontal clearance from the Bookcase side panels on each end of a Shelf. */
	shelfEndMargin: 0.002,
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
	pageBlockForeEdgeInset: 0.005
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
 * Reusable Binding Style structural presets driven purely from Catalog data (ADR 0006).
 * Every Volume uses these shared presets for board overhang, raised spine bands, and headbands.
 */
export const BINDING_STYLE_PRESETS: Record<BindingStyleId, BindingStylePreset> = {
	'raised-band-leather': {
		id: 'raised-band-leather',
		boardThickness: 0.0036,
		pageBlockVerticalInset: 0.0055,
		pageBlockForeEdgeInset: 0.006,
		spineBandFractions: [0.16, 0.33, 0.5, 0.67, 0.84],
		spineBandHeight: 0.0038,
		spineBandProtrusion: 0.0018,
		hasHeadbands: true
	},
	'blind-tooled-calf': {
		id: 'blind-tooled-calf',
		boardThickness: 0.0033,
		pageBlockVerticalInset: 0.0048,
		pageBlockForeEdgeInset: 0.0052,
		spineBandFractions: [0.14, 0.86],
		spineBandHeight: 0.0026,
		spineBandProtrusion: 0.0012,
		hasHeadbands: true
	},
	'quarter-vellum': {
		id: 'quarter-vellum',
		boardThickness: 0.0028,
		pageBlockVerticalInset: 0.0042,
		pageBlockForeEdgeInset: 0.0046,
		spineBandFractions: [],
		spineBandHeight: 0,
		spineBandProtrusion: 0,
		hasHeadbands: true
	},
	'linen-cloth': {
		id: 'linen-cloth',
		boardThickness: 0.003,
		pageBlockVerticalInset: 0.0036,
		pageBlockForeEdgeInset: 0.0042,
		spineBandFractions: [],
		spineBandHeight: 0,
		spineBandProtrusion: 0,
		hasHeadbands: false
	}
};

/**
 * Computes non-overlapping local geometry specs for a parametric clay Volume silhouette:
 * front board, back board, spine (rounded, shallow, or flat), recessed page block,
 * Binding Style raised spine bands and headbands, and procedural Bookmark Ribbon path.
 *
 * Local pivot convention:
 * - x = 0: horizontal center of the Volume
 * - y = 0: flush at the bottom of the cover boards
 * - z = 0: outermost front edge of the spine (Volume extends into -Z)
 */
export function getVolumeGeometryParts(
	dimensions: VolumeDimensions,
	spineProfile: SpineProfile = 'rounded',
	bindingStyle: BindingStyleId = 'linen-cloth'
): VolumeGeometryParts {
	const { height, depth, thickness } = dimensions;
	const preset = BINDING_STYLE_PRESETS[bindingStyle];

	const spineRadius = thickness / 2;
	const spineDepth = getSpineDepth(spineProfile, thickness);
	const boardDepth = Math.max(0.02, depth - spineDepth);
	const boardCenterZ = -(spineDepth + boardDepth / 2);
	const boardOffsetX = thickness / 2 - preset.boardThickness / 2;

	const pageWidth = Math.max(0.004, thickness - preset.boardThickness * 2);
	const pageHeight = Math.max(0.02, height - preset.pageBlockVerticalInset * 2);
	const pageDepth = Math.max(
		0.015,
		depth - spineDepth - preset.pageBlockForeEdgeInset
	);
	const pageCenterZ = -(spineDepth + pageDepth / 2);

	const isFlat = spineProfile === 'flat';

	// Raised horizontal bands wrapping cleanly over the spine without widening X beyond thickness.
	const spineBands: SpineBandSpec[] = preset.spineBandFractions.map((fraction, idx) => {
		const y = height * fraction;
		const bandDepth = spineDepth + preset.spineBandProtrusion;
		return {
			id: `spine-band-${idx}`,
			shape: isFlat ? 'flat' : 'rounded',
			radius: spineRadius,
			height: preset.spineBandHeight,
			position: isFlat ? [0, y, -(spineDepth - preset.spineBandProtrusion) / 2] : [0, y, -spineDepth],
			scaleZ: bandDepth / spineRadius,
			size: [thickness, preset.spineBandHeight, bandDepth]
		};
	});

	// Woven headbands tucked neatly at the top and bottom of the page block behind the spine.
	const headbands: HeadbandSpec[] = [];
	if (preset.hasHeadbands) {
		const headbandRadius = Math.min(0.0022, preset.pageBlockVerticalInset * 0.45);
		const headbandWidth = Math.max(0.003, pageWidth * 0.96);
		const headbandZ = -(spineDepth + headbandRadius);
		const pageTopY = height / 2 + pageHeight / 2;
		const pageBottomY = height / 2 - pageHeight / 2;
		headbands.push(
			{
				id: 'headband-top',
				radius: headbandRadius,
				width: headbandWidth,
				position: [0, pageTopY + headbandRadius * 0.65, headbandZ]
			},
			{
				id: 'headband-bottom',
				radius: headbandRadius,
				width: headbandWidth,
				position: [0, pageBottomY - headbandRadius * 0.65, headbandZ]
			}
		);
	}

	// Procedural Bookmark Ribbon tail emerging from the bottom edge of the page block
	// and resting gently on the Shelf surface in front of the spine.
	const pageBottomY = height / 2 - pageHeight / 2;
	const ribbonWidth = Math.min(0.0075, Math.max(0.005, pageWidth * 0.28));
	const ribbonThickness = 0.0008;
	const ribbonFloorY = ribbonThickness / 2 + 0.0004;
	const bookmarkRibbon: BookmarkRibbonSpec = {
		width: ribbonWidth,
		thickness: ribbonThickness,
		notchDepth: 0.0045,
		points: [
			[0, pageBottomY + 0.002, -(spineDepth + 0.012)],
			[0.0004, Math.max(ribbonFloorY + 0.001, pageBottomY * 0.55), -(spineDepth * 0.35)],
			[0.0012, ribbonFloorY + 0.0008, 0.008],
			[0.0018, ribbonFloorY + 0.0003, 0.018],
			[0.0012, ribbonFloorY, 0.027]
		]
	};

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
			size: [preset.boardThickness, height, boardDepth],
			position: [-boardOffsetX, height / 2, boardCenterZ]
		},
		backBoard: {
			size: [preset.boardThickness, height, boardDepth],
			position: [boardOffsetX, height / 2, boardCenterZ]
		},
		pageBlock: {
			size: [pageWidth, pageHeight, pageDepth],
			position: [0, height / 2, pageCenterZ]
		},
		spineBands,
		headbands,
		bookmarkRibbon
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
