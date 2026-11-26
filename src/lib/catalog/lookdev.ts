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

export interface DirectionalLightSpec {
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
	readonly sunKey: DirectionalLightSpec;
	/** Gentle opposite-side sky fill to soften shadow contrast on spines and props. */
	readonly skyFill: DirectionalLightSpec;
	/** Subtle warm room bounce from the lower foreground to lift underside Shelf details. */
	readonly warmBounce: DirectionalLightSpec;
}

const bookcaseBounds = getBookcaseStructure().bounds;
const bookcaseCenterY = (bookcaseBounds.minY + bookcaseBounds.maxY) / 2;

/**
 * Physically based renderer and shadow calibration for the warm sunlit afternoon study.
 * Shadow frustum bounds are derived directly from the metric Bookcase dimensions (ADR 0005).
 */
export const LOOKDEV_RENDERER_CONFIG: LookdevRendererConfig = {
	exposure: 1.05,
	clayExposure: 1.0,
	environmentIntensity: 0.65,
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
 */
export const SUNLIT_STUDY_LIGHTS: SunlitStudyLightsConfig = {
	background: '#ece3d5',
	hemisphere: {
		skyColor: '#fff5e4',
		groundColor: '#b99c7a',
		intensity: 0.72
	},
	sunKey: {
		position: [2.1, 3.05, 2.55],
		target: [0, bookcaseCenterY, -0.15],
		color: '#ffe2b8',
		intensity: 2.35,
		castShadow: true
	},
	skyFill: {
		position: [-2.2, 1.5, 1.9],
		target: [0, bookcaseCenterY, -0.1],
		color: '#d8e4f2',
		intensity: 0.58,
		castShadow: false
	},
	warmBounce: {
		position: [0.25, -0.8, 1.8],
		target: [0, bookcaseCenterY, -0.1],
		color: '#f2d8b6',
		intensity: 0.28,
		castShadow: false
	}
};

/**
 * Shared warm sunlit afternoon study palette anchor for downstream Lookdev slices
 * (#19 Bookcase/Room, #20 Volume Binding Styles, #21 Shelf Props, #22 Reading Pages,
 * #23 Spine/Cover Foil). Keeping these hex anchors in one pure-TS module prevents
 * color-temperature drift across parallel Lookdev tickets.
 */
export const LOOKDEV_PALETTE = {
	architecture: {
		plasterWall: '#efe7d8',
		baseboard: '#f3ede0',
		hardwoodFloor: '#9d7652',
		woodPrimary: '#8c5e38',
		woodTrim: '#7a502f',
		woodBackPanel: '#6d472a'
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
		foliage: '#4f6a48',
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
