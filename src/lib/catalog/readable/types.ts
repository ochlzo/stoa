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

export type FoilStyle = 'gold' | 'blind';

/**
 * Per-Volume visual customization surface (ADR 0006).
 * Cover colors are restricted to LOOKDEV_PALETTE.volumes so the Bookcase palette stays harmonious.
 */
export interface VolumeDesign {
	readonly bindingStyle?: BindingStyleId;
	readonly spineProfile?: SpineProfile;
	readonly coverColor?: VolumeCoverColor;
	readonly foilStyle?: FoilStyle;
	readonly emblem?: CoverEmblemSpec;
	/** Edition imprint stamped near the foot of the cover (defaults to "STOA LIBRARY EDITION"). */
	readonly editionLine?: string;
	/** Optional trio of LOOKDEV_PALETTE.volumes colors used for marbled endpaper veins. */
	readonly endpaperColors?: readonly [VolumeCoverColor, VolumeCoverColor, VolumeCoverColor];
}

export interface ProseSection {
	readonly kind: 'prose';
	readonly title: string;
	readonly epigraph?: string;
	readonly paragraphs: readonly string[];
}

export interface VerseSection {
	readonly kind: 'verse';
	readonly title: string;
	readonly epigraph?: string;
	/** Each stanza is an ordered list of verse lines preserved verbatim. */
	readonly stanzas: readonly (readonly string[])[];
}

export interface IllustrationSection {
	readonly kind: 'illustration';
	readonly title?: string;
	/** Relative path under `static/`, e.g. `volumes/ode-on-a-grecian-urn/urn.webp`. */
	readonly src: string;
	readonly caption?: string;
}

export type VolumeContentSection = ProseSection | VerseSection | IllustrationSection;

export interface VolumeContent {
	readonly subtitle?: string;
	readonly translator?: string;
	readonly sourceNote?: string;
	readonly colophonNote?: string;
	/**
	 * Ordered literary sections (prose chapters, verse poems/stanzas, or full-page plates).
	 * Leave empty to fall back to the deterministic specimen layout.
	 */
	readonly sections: readonly VolumeContentSection[];
}

export interface ReadableVolumePackage {
	readonly design: VolumeDesign;
	readonly content: VolumeContent;
}
