import {
	LinearMipmapLinearFilter,
	NoColorSpace,
	RepeatWrapping,
	SRGBColorSpace,
	type ColorSpace,
	type Texture,
	type Wrapping
} from 'three';

/**
 * Semantic PBR texture channel kinds supported by Stoa's procedural texture layer.
 * - `albedo`: sRGB color data (diffuse/base color, typography, painted graphics).
 * - `roughness` | `metalness` | `bump` | `normal`: linear non-color data maps.
 */
export type PbrMapKind = 'albedo' | 'roughness' | 'metalness' | 'bump' | 'normal';

export interface PbrTextureOptions {
	readonly wrapS?: Wrapping;
	readonly wrapT?: Wrapping;
	readonly repeat?: readonly [x: number, y: number];
	readonly anisotropy?: number;
	readonly generateMipmaps?: boolean;
}

/**
 * Minimal texture interface accepted by the cache so both Three.js `Texture` instances
 * and lightweight test doubles can be managed and disposed uniformly.
 */
export interface DisposableTexture {
	dispose(): void;
}

export interface PbrTextureCache<T extends DisposableTexture = Texture> {
	/** Returns the cached texture for `key`, or creates, stores, and returns it via `factory`. */
	getOrCreate(key: string, factory: () => T): T;
	/** Returns true when `key` is already stored in the cache. */
	has(key: string): boolean;
	/** Number of currently cached textures. */
	size(): number;
	/** Disposes every cached texture and clears the cache. */
	dispose(): void;
}

/**
 * Enforces Three.js PBR color-space rules:
 * color maps (`albedo`) use `SRGBColorSpace`; linear data maps use `NoColorSpace`.
 */
export function getColorSpaceForMapKind(kind: PbrMapKind): ColorSpace {
	return kind === 'albedo' ? SRGBColorSpace : NoColorSpace;
}

/**
 * Applies standard Stoa PBR texture defaults (color space, wrapping, mipmapping,
 * anisotropy, optional repeat) to a newly created procedural `Texture`.
 */
export function configurePbrTexture<T extends Texture>(
	texture: T,
	kind: PbrMapKind,
	options: PbrTextureOptions = {}
): T {
	texture.colorSpace = getColorSpaceForMapKind(kind);
	texture.wrapS = options.wrapS ?? RepeatWrapping;
	texture.wrapT = options.wrapT ?? RepeatWrapping;
	texture.generateMipmaps = options.generateMipmaps ?? true;
	texture.minFilter = LinearMipmapLinearFilter;
	texture.anisotropy = options.anisotropy ?? 4;

	if (options.repeat) {
		texture.repeat.set(options.repeat[0], options.repeat[1]);
	}

	texture.needsUpdate = true;
	return texture;
}

/**
 * Creates an isolated procedural texture cache that shares preset PBR maps across
 * meshes (e.g. ~45 Volumes sharing 4 Binding Style grain maps) and disposes every
 * allocated texture cleanly on teardown.
 */
export function createPbrTextureCache<T extends DisposableTexture = Texture>(): PbrTextureCache<T> {
	const entries = new Map<string, T>();

	return {
		getOrCreate(key: string, factory: () => T): T {
			const existing = entries.get(key);
			if (existing !== undefined) {
				return existing;
			}
			const created = factory();
			entries.set(key, created);
			return created;
		},

		has(key: string): boolean {
			return entries.has(key);
		},

		size(): number {
			return entries.size;
		},

		dispose(): void {
			for (const texture of entries.values()) {
				texture.dispose();
			}
			entries.clear();
		}
	};
}
