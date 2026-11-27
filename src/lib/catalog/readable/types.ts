import type { BindingStyleId, SpineProfile, VolumeCoverColor } from '#lib/catalog/types.ts';

/**
 * Curated classical cover emblem presets rendered in metallic foil or blind tooling.
 * Teammates may pick any preset or pass a custom single-color SVG path (`svgPath`).
 */
export type CoverEmblemPreset =
	| 'compass'
	| 'lozenge'
	| 'wreath'
	| 'fleuron'
	| 'urn'
	| 'knot'
	| 'crown'
	| 'ship'
	| 'quill'
	| 'laurel'
	| 'none';

export interface CustomSvgEmblem {
	/** Single-color SVG path `d` string drawn inside a centered square viewBox. */
	readonly svgPath: string;
	/** Square viewBox side length for `svgPath` coordinates (defaults to 100). */
	readonly viewBoxSize?: number;
}

export type CoverEmblemSpec = CoverEmblemPreset | CustomSvgEmblem;

export type TitlePageIconPreset = 'book' | 'sailboat';

export interface CustomTitlePageIcon {
	/** Single-color SVG path `d` string drawn inside a centered square viewBox. */
	readonly svgPath: string;
	/** Square viewBox side length for `svgPath` coordinates (defaults to 24). */
	readonly viewBoxSize?: number;
}

export type TitlePageIconSpec = TitlePageIconPreset | CustomTitlePageIcon;

export type FoilStyle = 'gold' | 'blind';

export type CoverBorderStyle = 'double-rule' | 'single-rule' | 'corner-ornaments' | 'none';

export type EndpaperStyle = 'marbled' | 'plain' | 'ruled' | 'botanical' | 'custom';

export interface CoverArtworkSpec {
	/** Relative path under `static/`, e.g. `volumes/<volume-id>/front-cover.webp`. */
	readonly front?: string;
	/** Relative path under `static/`, e.g. `volumes/<volume-id>/back-cover.webp`. */
	readonly back?: string;
	/** Relative path under `static/`, e.g. `volumes/<volume-id>/spine.webp`. */
	readonly spine?: string;
	/** Blend strength of cover artwork over the binding substrate (0..1, defaults to 0.92). */
	readonly opacity?: number;
}

export interface StampPaintInfo {
	readonly width: number;
	readonly height: number;
	readonly title: string;
	readonly author: string;
	/** Linear PBR channel color string for metallic foil (`gold`) or blind tooling (`blind`). */
	readonly foil: string;
	/** Linear PBR channel color string for blind tooling. */
	readonly blind: string;
	/** Runs Stoa's default cover or spine stamp layout so custom painters can layer on top. */
	readonly defaultPaint: () => void;
}

export interface EndpaperPaintInfo {
	readonly width: number;
	readonly height: number;
	readonly pageIndex: number;
	readonly side: 'left' | 'right';
	/** Runs the built-in endpaper renderer so custom painters can layer on top. */
	readonly defaultPaint: () => void;
}

/**
 * Full per-Volume visual customization surface (ADR 0006).
 * Every field is optional — omitted fields fall back to cohesive library defaults.
 * `coverColor` stays restricted to `LOOKDEV_PALETTE.volumes` so the Bookcase stays harmonious.
 */
export interface VolumeDesign {
	// --- Binding & 3D Surface Material ---
	readonly bindingStyle?: BindingStyleId;
	readonly spineProfile?: SpineProfile;
	readonly coverColor?: VolumeCoverColor;
	/** Cover surface roughness override (0 = glossy, 1 = matte). */
	readonly surfaceRoughness?: number;
	/** Binding grain relief depth override (typically 0.00002..0.00025). */
	readonly bumpScale?: number;
	readonly foilStyle?: FoilStyle;
	/** Custom metallic foil hex color (defaults to LOOKDEV_PALETTE.paperAndInk.goldFoil). */
	readonly foilColor?: string;
	/** Custom blind-tooling ink hex color (defaults to LOOKDEV_PALETTE.paperAndInk.blindTooling). */
	readonly toolColor?: string;
	/** Custom cloth headband hex color (defaults to LOOKDEV_PALETTE.paperAndInk.goldFoil). */
	readonly headbandColor?: string;
	/** Optional full-bleed cover/spine artwork images under `static/volumes/<volume-id>/`. */
	readonly coverArtwork?: CoverArtworkSpec;

	// --- Cover & Spine Stamping ---
	/** Optional display title override stamped eagerly on the closed spine/cover and Shelf HUD. */
	readonly title?: string;
	/** Optional author override stamped eagerly on the closed spine/cover and Shelf HUD. */
	readonly author?: string;
	/** Optional source attribution stamped eagerly on the closed back cover. */
	readonly sourceNote?: string;
	readonly coverBorder?: CoverBorderStyle;
	readonly emblem?: CoverEmblemSpec;
	/** Icon shown beside "Title Page" in the Reading Mode navigation drawer (defaults to `'book'`). */
	readonly titlePageIcon?: TitlePageIconSpec;
	/** Edition imprint stamped near the foot of the cover (defaults to "STOA LIBRARY EDITION"). */
	readonly editionLine?: string;
	/** Full custom 2D canvas painter for the front cover stamp channel. */
	readonly paintFrontCover?: (ctx: CanvasRenderingContext2D, info: StampPaintInfo) => void;
	/** Full custom 2D canvas painter for the back cover stamp channel. */
	readonly paintBackCover?: (ctx: CanvasRenderingContext2D, info: StampPaintInfo) => void;
	/** Full custom 2D canvas painter for the spine stamp channel. */
	readonly paintSpine?: (ctx: CanvasRenderingContext2D, info: StampPaintInfo) => void;

	// --- Endpapers ---
	/** Built-in endpaper pattern style (defaults to `'marbled'`). */
	readonly endpaperStyle?: EndpaperStyle;
	/** Optional trio of LOOKDEV_PALETTE.volumes colors used for endpaper pigments. */
	readonly endpaperColors?: readonly [VolumeCoverColor, VolumeCoverColor, VolumeCoverColor];
	/** Optional full-bleed static endpaper image under `static/volumes/<volume-id>/`. */
	readonly endpaperTextureSrc?: string;
	/** Full custom 2D canvas painter for endpapers. */
	readonly paintEndpaper?: (ctx: CanvasRenderingContext2D, info: EndpaperPaintInfo) => void;
	/** Whether to paste the Stoa Ex Libris Bookplate onto the front endpaper (defaults to `true`). */
	readonly showBookplate?: boolean;

	// --- Interior Paper & Typography ---
	/** Custom archival paper base hex color (defaults to LOOKDEV_PALETTE.paperAndInk.archivalPaper). */
	readonly paperTint?: string;
	/** Custom primary body ink hex color (defaults to LOOKDEV_PALETTE.paperAndInk.inkPrimary). */
	readonly inkColor?: string;
	/** Custom secondary/running-head ink hex color (defaults to LOOKDEV_PALETTE.paperAndInk.inkMuted). */
	readonly mutedInkColor?: string;
	/** Custom ornament diamond/rule accent hex color (defaults to LOOKDEV_PALETTE.volumes.ochreLinen). */
	readonly accentColor?: string;
	/** Custom CSS font-family stack for interior pages (defaults to Georgia serif). */
	readonly fontFamily?: string;
}

export interface ProseSection {
	readonly kind: 'prose';
	readonly title: string;
	/** Exclude front/back matter (e.g. Author's Note, Epilogue) from sequential Chapter numbering. */
	readonly unnumbered?: boolean;
	readonly epigraph?: string;
	/** Full-page Chapter opener artwork, followed by prose on the next Page. */
	readonly openingImageSrc?: string;
	readonly paragraphs: readonly string[];
}

export interface VerseSection {
	readonly kind: 'verse';
	readonly title: string;
	/** Exclude front/back matter from sequential Chapter numbering. */
	readonly unnumbered?: boolean;
	readonly epigraph?: string;
	/** Full-page Chapter opener artwork, followed by verse on the next Page. */
	readonly openingImageSrc?: string;
	/** Each stanza is an ordered list of verse lines preserved verbatim. */
	readonly stanzas: readonly (readonly string[])[];
}

export interface IllustrationSection {
	readonly kind: 'illustration';
	readonly title?: string;
	/** Relative path under `static/`, e.g. `volumes/ode-on-a-grecian-urn/urn.webp`. */
	readonly src: string;
	readonly motion?: IllustrationMotion;
	readonly caption?: string;
}

export type VolumeContentSection = ProseSection | VerseSection | IllustrationSection;

export interface IllustrationMotion {
	/** Local sprite sheet under `static/`, arranged in row-major order. */
	readonly src: string;
	readonly columns: number;
	readonly frameCount: number;
	readonly framesPerSecond: number;
	/** Patch origin in pixels of the base illustration. */
	readonly origin: readonly [x: number, y: number];
}

export interface IllustratedStanza {
	readonly illustrationSrc: string;
	readonly motion?: IllustrationMotion;
	readonly lines: readonly string[];
}

interface VolumeMetadata {
	/** Optional display title override inside Reading Mode (title Page, running heads, HUD). */
	readonly title?: string;
	/** Optional author override inside Reading Mode (title Page, colophon, HUD). */
	readonly author?: string;
	readonly subtitle?: string;
	readonly translator?: string;
	/** Source / edition attribution shown on the 1st title Page and closing colophon. */
	readonly sourceNote?: string;
	readonly colophonNote?: string;
}

export type VolumeContent = VolumeMetadata &
	(
		| {
				/** Leave empty to fall back to the deterministic specimen layout. */
				readonly sections: readonly VolumeContentSection[];
				readonly illustratedStanzas?: never;
		  }
		| {
				/** Each stanza faces its illustration on a Spread without a Chapter. */
				readonly illustratedStanzas: readonly [IllustratedStanza, ...IllustratedStanza[]];
				readonly sections?: never;
		  }
	);

export interface ReadableVolumePackage {
	readonly design: VolumeDesign;
	/** Lazy loader for `content.ts` so full literary texts are code-split per Volume. */
	readonly loadContent: () => Promise<VolumeContent>;
}
