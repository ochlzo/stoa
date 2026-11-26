import { getBookcaseStructure } from '#lib/catalog/bookcase.ts';

export interface ShadowFrustumBounds {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
	readonly near: number;
	readonly far: number;
}

export interface LookdevRendererConfig {
	/** Filmic tone-mapping exposure for the sunlit afternoon study. */
	readonly exposure: number;
	/** Neutral exposure when `?clay=1` restores the Clay studio pass. */
	readonly clayExposure: number;
	/** Strength of the procedural PMREM room environment map for IBL reflections. */
	readonly environmentIntensity: number;
	/** Square shadow-map resolution for the primary sunlit key light. */
	readonly shadowMapSize: number;
	/** Depth bias to eliminate self-shadowing acne on Bookcase and Volume planes. */
	readonly shadowBias: number;
	/** Normal-offset bias to prevent detached shadows on thin cover boards and Shelves. */
	readonly shadowNormalBias: number;
	/** Orthographic shadow camera frustum sized in meters to cover the Bookcase and Backdrop. */
	readonly shadowFrustum: ShadowFrustumBounds;
}

export interface StudyLightSpec {
	readonly position: readonly [x: number, y: number, z: number];
	readonly target: readonly [x: number, y: number, z: number];
	readonly color: string;
	readonly intensity: number;
	readonly castShadow: boolean;
}

export interface HemisphereLightSpec {
	readonly skyColor: string;
	readonly groundColor: string;
	readonly intensity: number;
}

export interface SunlitStudyLightsConfig {
	/** Warm sunlit study backdrop color behind the RoomBackdrop. */
	readonly background: string;
	/** Soft sky-to-floor ambient bounce so deep Shelf bays stay warm and readable. */
	readonly hemisphere: HemisphereLightSpec;
	/** Primary afternoon window sunlight casting soft shadows across the Bookcase. */
	readonly sunKey: StudyLightSpec;
	/** Gentle opposite-side sky fill to soften shadow contrast on spines and props. */
	readonly skyFill: StudyLightSpec;
	/** Subtle warm room bounce from the lower foreground to lift underside Shelf details. */
	readonly warmBounce: StudyLightSpec;
	/** Back-left rim light that separates covers and catches foil during Inspect Mode. */
	readonly rim: StudyLightSpec;
	/** Non-shadow-casting dappled afternoon foliage sunlight washing the right wall and floor. */
	readonly dappledSun: StudyLightSpec & { readonly angle: number; readonly penumbra: number };
}

export interface StudyLightingTarget {
	sun: number;
	sky: number;
	ambient: number;
	rim: number;
	dappled: number;
	environment: number;
	exposure: number;
	dust: number;
}

const bookcaseBounds = getBookcaseStructure().bounds;
const bookcaseCenterY = (bookcaseBounds.minY + bookcaseBounds.maxY) / 2;

/** Cross-grain width of one procedural wood tile in meters. */
export const WOOD_GRAIN_TILE_WIDTH = 0.42;

/** Dimmed backdrop styling for Inspect Mode and Reading Mode in Lookdev vs Clay. */
export const LOOKDEV_BACKDROP = {
	clayColor: '#141210',
	lookdevColor: '#44382c',
	inspectOpacity: 0.24,
	readingOpacity: 0.39
} as const;

/**
 * Physically based renderer and shadow calibration for the warm sunlit afternoon study.
 * Shadow frustum bounds are derived directly from the metric Bookcase dimensions (ADR 0005).
 */
export const LOOKDEV_RENDERER_CONFIG: LookdevRendererConfig = {
	exposure: 0.92,
	clayExposure: 1.0,
	environmentIntensity: 0.34,
	shadowMapSize: 2048,
	shadowBias: -0.00025,
	shadowNormalBias: 0.012,
	shadowFrustum: {
		left: -1.6,
		right: 1.6,
		top: 1.8,
		bottom: -1.5,
		near: 0.5,
		far: 8.5
	}
};

/**
 * Warm sunlit afternoon study lighting rig:
 * - Angled golden-hour window key from upper-right foreground (+X, +Y, +Z)
 * - Soft warm-ivory sky / oak-floor hemisphere fill
 * - Cool-neutral opposite window fill so shadowed spine crevices retain shape
 * - Gentle warm floor/desk bounce from below
 * - Inspect Mode rim light from back-left to catch cover grain and gold foil
 */
export const SUNLIT_STUDY_LIGHTS: SunlitStudyLightsConfig = {
	background: '#d5c6b1',
	hemisphere: {
		skyColor: '#fff2dc',
		groundColor: '#8d6a49',
		intensity: 0.44
	},
	sunKey: {
		position: [2.1, 3.05, 2.55],
		target: [0, bookcaseCenterY, -0.15],
		color: '#ffddb0',
		intensity: 2.05,
		castShadow: true
	},
	skyFill: {
		position: [-2.2, 1.5, 1.9],
		target: [0, bookcaseCenterY, -0.1],
		color: '#d2dfee',
		intensity: 0.34,
		castShadow: false
	},
	warmBounce: {
		position: [0.25, -0.8, 1.8],
		target: [0, bookcaseCenterY, -0.1],
		color: '#e8c499',
		intensity: 0.18,
		castShadow: false
	},
	rim: {
		position: [-1.8, 2.45, -1.2],
		target: [0, bookcaseCenterY, -0.15],
		color: '#ffe5be',
		intensity: 0,
		castShadow: false
	},
	dappledSun: {
		position: [2.45, 2.75, 2.1],
		target: [1.18, bookcaseCenterY - 0.12, -0.35],
		angle: 0.72,
		penumbra: 0.75,
		color: '#ffe2b0',
		intensity: 2.15,
		castShadow: false
	}
};

const shelfLighting: StudyLightingTarget = {
	sun: SUNLIT_STUDY_LIGHTS.sunKey.intensity,
	sky: SUNLIT_STUDY_LIGHTS.skyFill.intensity,
	ambient: SUNLIT_STUDY_LIGHTS.hemisphere.intensity,
	rim: SUNLIT_STUDY_LIGHTS.rim.intensity,
	dappled: SUNLIT_STUDY_LIGHTS.dappledSun.intensity,
	environment: LOOKDEV_RENDERER_CONFIG.environmentIntensity,
	exposure: LOOKDEV_RENDERER_CONFIG.exposure,
	dust: 1
};

/** Per-mode lighting interpolation targets for Shelf Mode, Inspect Mode, and Reading Mode. */
export const STUDY_LIGHTING: Readonly<Record<'shelf' | 'inspect' | 'reading', StudyLightingTarget>> = {
	shelf: shelfLighting,
	inspect: {
		...shelfLighting,
		sun: 1.95,
		sky: 0.52,
		ambient: 0.6,
		rim: 1.15,
		dappled: 0.35,
		environment: 0.45,
		exposure: 0.96,
		dust: 0
	},
	reading: {
		...shelfLighting,
		sun: 1.08,
		sky: 0.84,
		ambient: 0.96,
		rim: 0.08,
		dappled: 0,
		environment: 0.31,
		exposure: 0.98,
		dust: 0
	}
};

/** Sunlit air volume in front of the middle Shelves where dust motes drift in Shelf Mode. */
export const STUDY_WINDOW = {
	position: SUNLIT_STUDY_LIGHTS.sunKey.position,
	target: SUNLIT_STUDY_LIGHTS.sunKey.target,
	halfWidth: 0.26,
	angle: 0.27
} as const;

/**
 * Shared warm sunlit afternoon study palette anchor for downstream Lookdev slices
 * (#19 Bookcase/Room, #20 Volume Binding Styles, #21 Shelf Props, #22 Reading Pages,
 * #23 Spine/Cover Foil). Keeping these hex anchors in one pure-TS module prevents
 * color-temperature drift across parallel Lookdev tickets.
 */
export const LOOKDEV_PALETTE = {
	architecture: {
		plasterWall: '#cfc0a9',
		baseboard: '#d8ccb7',
		hardwoodFloor: '#8a6342',
		woodPrimary: '#80512d',
		woodTrim: '#6e4324',
		woodBackPanel: '#54321a'
	},
	paperAndInk: {
		archivalPaper: '#f5eedf',
		endpaperBase: '#e8dec8',
		inkPrimary: '#2b241d',
		inkMuted: '#65594b',
		goldFoil: '#cfa654',
		blindTooling: '#3a2a1e'
	},
	props: {
		brushedBrass: '#b8944f',
		agedBronze: '#5c4b37',
		stonewareCream: '#ddd4c4',
		terracotta: '#b36b4d',
		sageGlaze: '#7e8c78',
		travertine: '#cfc5b4',
		marble: '#e0d6c4',
		foliage: '#4f6a48',
		petal: '#78906b',
		stem: '#485536',
		soil: '#3e3228',
		tintedGlass: '#dce5df'
	},
	volumes: {
		oxblood: '#6e2c26',
		forestGreen: '#2c4637',
		navyCloth: '#26384d',
		ochreLinen: '#a87d43',
		agedVellum: '#ddd2bc',
		umberCalf: '#563c2c',
		slateBlue: '#485b6b',
		plumLeather: '#523140',
		oliveCloth: '#5a6345'
	}
} as const;

/**
 * Deterministic 32-bit linear congruential PRNG returning values in [0, 1).
 * Shared across pure-TS seeding and procedural texture generators so there is
 * one reproducible noise source instead of duplicated LCG loops.
 */
export function createSeededRandom(initialSeed: number): () => number {
	let seed = initialSeed >>> 0;
	return () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}

/**
 * Parses the URL query string for the dev-only Clay comparison toggle (`?clay=1` or `?clay=true`).
 * Defaults to `false` (Lookdev enabled).
 */
export function parseClayModeParam(search: string): boolean {
	if (!search) return false;
	const params = new URLSearchParams(search);
	const raw = params.get('clay');
	if (raw === null) return false;
	const normalized = raw.trim().toLowerCase();
	return normalized === '1' || normalized === 'true';
}
