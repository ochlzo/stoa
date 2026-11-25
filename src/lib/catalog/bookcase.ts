export interface BoxSpec {
	readonly id: string;
	readonly size: readonly [width: number, height: number, depth: number];
	readonly position: readonly [x: number, y: number, z: number];
	readonly tone: 'structure' | 'back' | 'trim';
}

export interface ShelfSpec {
	/** Zero-based shelf index from bottom (0) to top (shelfCount - 1). */
	readonly index: number;
	/** World Y coordinate of the top surface where Volumes rest (meters). */
	readonly surfaceY: number;
	/** Clear vertical height above this Shelf before the underside of the board above (meters). */
	readonly clearance: number;
	/** Usable interior width between side panels (meters). */
	readonly innerWidth: number;
	/** Usable interior depth from front face (z = 0) to back panel front face (meters). */
	readonly innerDepth: number;
	/** Structural mesh placement for the horizontal Shelf board. */
	readonly board: BoxSpec;
}

export interface BookcaseStructure {
	readonly plinth: BoxSpec;
	readonly backPanel: BoxSpec;
	readonly leftSide: BoxSpec;
	readonly rightSide: BoxSpec;
	readonly shelves: readonly ShelfSpec[];
	readonly topBoard: BoxSpec;
	readonly crown: BoxSpec;
	/** Architectural trim moldings (stepped crown, plinth cap, shelf front lips, side stiles). */
	readonly trimParts: readonly BoxSpec[];
	readonly bounds: {
		readonly minX: number;
		readonly maxX: number;
		readonly minY: number;
		readonly maxY: number;
		readonly minZ: number;
		readonly maxZ: number;
		readonly innerMinX: number;
		readonly innerMaxX: number;
		readonly interiorDepth: number;
	};
}

/**
 * Physical dimensions of the Bookcase in real-world meters (1 unit = 1 meter, per ADR 0005).
 *
 * Coordinate & pivot convention:
 * - x = 0: horizontal center of the Bookcase
 * - y = 0: floor / underside of the plinth
 * - z = 0: front plane of the Shelves and side panels (Bookcase extends into -Z)
 */
export const BOOKCASE_DIMENSIONS = {
	innerWidth: 1.25,
	sidePanelThickness: 0.04,
	depth: 0.34,
	backPanelThickness: 0.018,
	plinthHeight: 0.14,
	plinthOverhang: 0.016,
	shelfCount: 5,
	shelfThickness: 0.032,
	shelfClearance: 0.34,
	crownHeight: 0.1,
	crownOverhang: 0.024
} as const;

/**
 * Neutral matte clay palette for the geometry blockout pass (ADR 0005).
 * Subtle value shifts keep structural joints legible without lookdev styling.
 */
export const CLAY_COLORS = {
	background: '#eae8e3',
	wall: '#e6e4df',
	floor: '#d8d5ce',
	baseboard: '#efede8',
	structure: '#d4d1cc',
	back: '#bcb9b3',
	trim: '#c8c5bf'
} as const;

/**
 * Neutral clay room backdrop dimensions framing the Bookcase (meters).
 */
export const ROOM_BACKDROP_DIMENSIONS = {
	wallWidth: 6.0,
	wallHeight: 4.0,
	wallOffsetBehindBookcase: 0.004,
	floorDepth: 4.0,
	baseboardHeight: 0.11,
	baseboardDepth: 0.018
} as const;

/**
 * Default Shelf Mode camera settings in meters and degrees (Option B: framed Bookcase with room wall margin).
 */
export const SHELF_CAMERA_DEFAULTS = {
	fov: 38,
	near: 0.05,
	far: 10,
	distance: 1.52,
	initialShelfIndex: 2
} as const;

/**
 * Returns the world Y coordinate of the top resting surface for a given Shelf index.
 */
export function getShelfSurfaceY(shelfIndex: number): number {
	const { plinthHeight, shelfThickness, shelfClearance } = BOOKCASE_DIMENSIONS;
	return plinthHeight + shelfIndex * (shelfThickness + shelfClearance) + shelfThickness;
}

/**
 * Builds the deterministic, non-overlapping structural layout of the Bookcase in meters.
 */
export function getBookcaseStructure(): BookcaseStructure {
	const d = BOOKCASE_DIMENSIONS;
	const outerWidth = d.innerWidth + d.sidePanelThickness * 2;
	const interiorDepth = d.depth - d.backPanelThickness;
	const shelfPitch = d.shelfThickness + d.shelfClearance;

	// Shelves 0..shelfCount-1 plus a closing top board immediately beneath the crown
	const bodyInteriorHeight = d.shelfCount * shelfPitch + d.shelfThickness;
	const bodyTopY = d.plinthHeight + bodyInteriorHeight;
	const totalHeight = bodyTopY + d.crownHeight;

	const plinthBodyHeight = d.plinthHeight - 0.022;
	const plinthBodyOverhang = d.plinthOverhang * 0.5;
	const plinthBodyDepth = d.depth + plinthBodyOverhang;
	const plinth: BoxSpec = {
		id: 'plinth',
		size: [outerWidth + plinthBodyOverhang * 2, plinthBodyHeight, plinthBodyDepth],
		position: [0, plinthBodyHeight / 2, plinthBodyOverhang - plinthBodyDepth / 2],
		tone: 'trim'
	};

	const plinthShoeHeight = 0.016;
	const plinthShoeProtrusion = d.plinthOverhang * 0.35;
	const plinthShoe: BoxSpec = {
		id: 'plinth-shoe',
		size: [outerWidth + plinthBodyOverhang * 2, plinthShoeHeight, plinthShoeProtrusion],
		position: [0, plinthShoeHeight / 2, plinthBodyOverhang + plinthShoeProtrusion / 2],
		tone: 'trim'
	};

	const plinthCapHeight = 0.022;
	const plinthCapDepth = d.depth + d.plinthOverhang;
	const plinthCap: BoxSpec = {
		id: 'plinth-cap',
		size: [outerWidth + d.plinthOverhang * 2, plinthCapHeight, plinthCapDepth],
		position: [0, plinthBodyHeight + plinthCapHeight / 2, d.plinthOverhang - plinthCapDepth / 2],
		tone: 'trim'
	};

	const backPanel: BoxSpec = {
		id: 'back-panel',
		size: [outerWidth, bodyInteriorHeight, d.backPanelThickness],
		position: [0, d.plinthHeight + bodyInteriorHeight / 2, -(interiorDepth + d.backPanelThickness / 2)],
		tone: 'back'
	};

	const sideCenterX = d.innerWidth / 2 + d.sidePanelThickness / 2;
	const sideCenterY = d.plinthHeight + bodyInteriorHeight / 2;
	const sideCenterZ = -interiorDepth / 2;

	const leftSide: BoxSpec = {
		id: 'left-side',
		size: [d.sidePanelThickness, bodyInteriorHeight, interiorDepth],
		position: [-sideCenterX, sideCenterY, sideCenterZ],
		tone: 'structure'
	};

	const rightSide: BoxSpec = {
		id: 'right-side',
		size: [d.sidePanelThickness, bodyInteriorHeight, interiorDepth],
		position: [sideCenterX, sideCenterY, sideCenterZ],
		tone: 'structure'
	};

	const shelves: ShelfSpec[] = Array.from({ length: d.shelfCount }, (_, index) => {
		const bottomY = d.plinthHeight + index * shelfPitch;
		const surfaceY = bottomY + d.shelfThickness;
		return {
			index,
			surfaceY,
			clearance: d.shelfClearance,
			innerWidth: d.innerWidth,
			innerDepth: interiorDepth,
			board: {
				id: `shelf-${index}`,
				size: [d.innerWidth, d.shelfThickness, interiorDepth],
				position: [0, bottomY + d.shelfThickness / 2, -interiorDepth / 2],
				tone: 'structure'
			}
		};
	});

	const topBoardBottomY = d.plinthHeight + d.shelfCount * shelfPitch;
	const topBoard: BoxSpec = {
		id: 'top-board',
		size: [d.innerWidth, d.shelfThickness, interiorDepth],
		position: [0, topBoardBottomY + d.shelfThickness / 2, -interiorDepth / 2],
		tone: 'structure'
	};

	// Crown bounding box spec (rendered via smooth mitered profile geometry in Bookcase.svelte)
	const crownDepth = d.depth + d.crownOverhang;
	const crown: BoxSpec = {
		id: 'crown',
		size: [outerWidth + d.crownOverhang * 2, d.crownHeight, crownDepth],
		position: [0, bodyTopY + d.crownHeight / 2, d.crownOverhang - crownDepth / 2],
		tone: 'trim'
	};

	// Subtle front face-frame stile trim on left and right side panels
	const stileDepth = 0.006;
	const stileWidth = d.sidePanelThickness - 0.006;
	const leftStile: BoxSpec = {
		id: 'left-stile-trim',
		size: [stileWidth, bodyInteriorHeight, stileDepth],
		position: [-sideCenterX, sideCenterY, stileDepth / 2],
		tone: 'trim'
	};
	const rightStile: BoxSpec = {
		id: 'right-stile-trim',
		size: [stileWidth, bodyInteriorHeight, stileDepth],
		position: [sideCenterX, sideCenterY, stileDepth / 2],
		tone: 'trim'
	};

	// Crisp front bullnose / beveled edge lip on every Shelf board and the closing top board
	const lipDepth = 0.004;
	const lipHeight = d.shelfThickness - 0.006;
	const shelfLips: BoxSpec[] = [
		...shelves.map((shelf) => ({
			id: `shelf-lip-${shelf.index}`,
			size: [d.innerWidth, lipHeight, lipDepth] as const,
			position: [0, shelf.board.position[1], lipDepth / 2] as const,
			tone: 'trim' as const
		})),
		{
			id: 'top-board-lip',
			size: [d.innerWidth, lipHeight, lipDepth] as const,
			position: [0, topBoard.position[1], lipDepth / 2] as const,
			tone: 'trim' as const
		}
	];

	const trimParts: BoxSpec[] = [plinthShoe, plinthCap, leftStile, rightStile, ...shelfLips];

	return {
		plinth,
		backPanel,
		leftSide,
		rightSide,
		shelves,
		topBoard,
		crown,
		trimParts,
		bounds: {
			minX: -(outerWidth / 2 + d.crownOverhang),
			maxX: outerWidth / 2 + d.crownOverhang,
			minY: 0,
			maxY: totalHeight,
			minZ: -d.depth,
			maxZ: d.crownOverhang,
			innerMinX: -d.innerWidth / 2,
			innerMaxX: d.innerWidth / 2,
			interiorDepth
		}
	};
}

/**
 * Returns the initial Shelf Mode camera target Y coordinate, centered vertically
 * on the default Shelf bay.
 */
export function getInitialShelfCameraY(): number {
	const surfaceY = getShelfSurfaceY(SHELF_CAMERA_DEFAULTS.initialShelfIndex);
	return surfaceY + BOOKCASE_DIMENSIONS.shelfClearance / 2;
}
