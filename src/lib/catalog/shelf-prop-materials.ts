import { LOOKDEV_PALETTE } from '#lib/catalog/lookdev.ts';
import type { ShelfPropSpec } from '#lib/catalog/props.ts';

const { props, volumes, paperAndInk } = LOOKDEV_PALETTE;

export type ShelfPropMaterialKind =
	| 'glass'
	| 'paper'
	| 'leather'
	| 'cloth'
	| 'plain'
	| 'textured';

export type ShelfPropTextureNoise = 'none' | 'wood' | 'veined' | 'speckled' | 'brushed';

export type ShelfPropTexturePattern =
	| 'none'
	| 'globe'
	| 'coast'
	| 'temple'
	| 'hills'
	| 'foliage'
	| 'botanical';

export interface ShelfPropFinishPreset {
	readonly color: string;
	readonly roughness: number;
	readonly metalness: number;
	readonly materialKind: ShelfPropMaterialKind;
	readonly pattern?: ShelfPropTexturePattern;
	readonly noise?: ShelfPropTextureNoise;
}

export const SHELF_PROP_FINISHES = {
	glaze: { color: props.stonewareCream, roughness: 0.28, metalness: 0, materialKind: 'textured' },
	botanical: {
		color: props.stonewareCream,
		roughness: 0.31,
		metalness: 0,
		materialKind: 'textured',
		pattern: 'botanical'
	},
	bisque: {
		color: props.stonewareCream,
		roughness: 0.83,
		metalness: 0,
		materialKind: 'textured',
		noise: 'speckled'
	},
	sage: { color: props.sageGlaze, roughness: 0.35, metalness: 0, materialKind: 'textured' },
	terracotta: {
		color: props.terracotta,
		roughness: 0.88,
		metalness: 0,
		materialKind: 'textured',
		noise: 'speckled'
	},
	soil: {
		color: props.soil,
		roughness: 0.99,
		metalness: 0,
		materialKind: 'textured',
		noise: 'speckled'
	},
	leaf: {
		color: props.foliage,
		roughness: 0.51,
		metalness: 0,
		materialKind: 'textured',
		pattern: 'foliage'
	},
	petal: {
		color: props.petal,
		roughness: 0.69,
		metalness: 0,
		materialKind: 'textured',
		pattern: 'foliage'
	},
	stem: { color: props.stem, roughness: 0.76, metalness: 0, materialKind: 'plain' },
	brass: {
		color: props.brushedBrass,
		roughness: 0.29,
		metalness: 1,
		materialKind: 'textured',
		noise: 'brushed'
	},
	bronze: {
		color: props.agedBronze,
		roughness: 0.52,
		metalness: 1,
		materialKind: 'textured',
		noise: 'brushed'
	},
	stone: {
		color: props.travertine,
		roughness: 0.71,
		metalness: 0,
		materialKind: 'textured',
		noise: 'veined'
	},
	marble: {
		color: props.marble,
		roughness: 0.47,
		metalness: 0,
		materialKind: 'textured',
		noise: 'veined'
	},
	walnut: {
		color: LOOKDEV_PALETTE.architecture.woodBackPanel,
		roughness: 0.46,
		metalness: 0,
		materialKind: 'textured',
		noise: 'wood'
	},
	glass: { color: props.tintedGlass, roughness: 0.09, metalness: 0, materialKind: 'glass' },
	wax: { color: paperAndInk.archivalPaper, roughness: 0.64, metalness: 0, materialKind: 'plain' },
	wick: { color: paperAndInk.inkPrimary, roughness: 0.99, metalness: 0, materialKind: 'plain' },
	globe: {
		color: '#ffffff',
		roughness: 0.77,
		metalness: 0,
		materialKind: 'textured',
		pattern: 'globe'
	},
	coast: {
		color: '#ffffff',
		roughness: 0.95,
		metalness: 0,
		materialKind: 'textured',
		pattern: 'coast'
	},
	temple: {
		color: '#ffffff',
		roughness: 0.95,
		metalness: 0,
		materialKind: 'textured',
		pattern: 'temple'
	},
	hills: {
		color: '#ffffff',
		roughness: 0.95,
		metalness: 0,
		materialKind: 'textured',
		pattern: 'hills'
	},
	navy: { color: volumes.navyCloth, roughness: 0.97, metalness: 0, materialKind: 'cloth' },
	oxblood: { color: volumes.oxblood, roughness: 0.49, metalness: 0, materialKind: 'leather' },
	olive: { color: volumes.oliveCloth, roughness: 0.97, metalness: 0, materialKind: 'cloth' },
	ochre: { color: volumes.ochreLinen, roughness: 0.97, metalness: 0, materialKind: 'cloth' },
	paper: { color: paperAndInk.archivalPaper, roughness: 0.96, metalness: 0, materialKind: 'paper' }
} as const satisfies Record<string, ShelfPropFinishPreset>;

export type ShelfPropFinish = keyof typeof SHELF_PROP_FINISHES;

export const SHELF_PROP_MATERIALS = {
	vase: { amphora: 'botanical', belly: 'bisque', bowl: 'glaze' },
	frame: { rail: 'brass', temple: 'temple', hills: 'hills', coast: 'coast' },
	planter: { tall: 'bisque', rosette: 'terracotta', soil: 'soil', stem: 'stem', leaf: 'leaf', petal: 'petal' },
	bookend: { body: 'stone' },
	sculpture: { body: 'marble' },
	globe: { base: 'bronze', meridian: 'brass', sphere: 'globe' },
	candlestick: { holder: 'brass', taper: 'wax', wick: 'wick' },
	'keepsake-box': { body: 'walnut', finial: 'brass' },
	'book-stack': {
		covers: ['olive', 'oxblood', 'navy', 'ochre'],
		pages: 'paper',
		bowl: 'sage',
		sculpture: 'marble',
		hourglass: 'glass',
		cap: 'bronze',
		rod: 'brass'
	}
} as const satisfies Record<
	ShelfPropSpec['kind'],
	Record<string, ShelfPropFinish | readonly ShelfPropFinish[]>
>;
