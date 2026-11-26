import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	ClampToEdgeWrapping,
	DataTexture,
	LinearMipmapLinearFilter,
	NoColorSpace,
	RepeatWrapping,
	SRGBColorSpace
} from 'three';
import {
	configurePbrTexture,
	createPbrTextureCache,
	getColorSpaceForMapKind,
	type PbrMapKind
} from '#lib/textures/pbr-texture-cache.ts';

function makeDummyTexture(): DataTexture {
	return new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
}

describe('PBR texture color space contract', () => {
	it('assigns SRGBColorSpace to albedo maps and NoColorSpace to linear data maps', () => {
		assert.equal(getColorSpaceForMapKind('albedo'), SRGBColorSpace);

		const linearKinds: readonly PbrMapKind[] = ['roughness', 'metalness', 'bump', 'normal'];
		for (const kind of linearKinds) {
			assert.equal(getColorSpaceForMapKind(kind), NoColorSpace);
		}
	});

	it('configures wrapping, mipmapping, anisotropy, repeat, and color space consistently', () => {
		const albedo = configurePbrTexture(makeDummyTexture(), 'albedo', {
			repeat: [2, 3],
			anisotropy: 8
		});
		assert.equal(albedo.colorSpace, SRGBColorSpace);
		assert.equal(albedo.wrapS, RepeatWrapping);
		assert.equal(albedo.wrapT, RepeatWrapping);
		assert.equal(albedo.minFilter, LinearMipmapLinearFilter);
		assert.equal(albedo.generateMipmaps, true);
		assert.equal(albedo.anisotropy, 8);
		assert.equal(albedo.repeat.x, 2);
		assert.equal(albedo.repeat.y, 3);
		albedo.dispose();

		const roughness = configurePbrTexture(makeDummyTexture(), 'roughness', {
			wrapS: ClampToEdgeWrapping,
			wrapT: ClampToEdgeWrapping
		});
		assert.equal(roughness.colorSpace, NoColorSpace);
		assert.equal(roughness.wrapS, ClampToEdgeWrapping);
		assert.equal(roughness.wrapT, ClampToEdgeWrapping);
		roughness.dispose();
	});
});

describe('createPbrTextureCache', () => {
	it('reuses cached textures for identical keys instead of invoking factory repeatedly', () => {
		const cache = createPbrTextureCache();
		let factoryCalls = 0;

		const first = cache.getOrCreate('leather-roughness', () => {
			factoryCalls += 1;
			return configurePbrTexture(makeDummyTexture(), 'roughness');
		});
		const second = cache.getOrCreate('leather-roughness', () => {
			factoryCalls += 1;
			return configurePbrTexture(makeDummyTexture(), 'roughness');
		});

		assert.equal(first, second);
		assert.equal(factoryCalls, 1);
		assert.equal(cache.has('leather-roughness'), true);
		assert.equal(cache.size(), 1);

		cache.dispose();
		assert.equal(cache.size(), 0);
		assert.equal(cache.has('leather-roughness'), false);
	});

	it('disposes every cached texture cleanly on teardown', () => {
		let disposedCount = 0;
		const cache = createPbrTextureCache<{ readonly id: string; dispose(): void }>();

		cache.getOrCreate('a', () => ({
			id: 'a',
			dispose() {
				disposedCount += 1;
			}
		}));
		cache.getOrCreate('b', () => ({
			id: 'b',
			dispose() {
				disposedCount += 1;
			}
		}));

		assert.equal(cache.size(), 2);
		cache.dispose();
		assert.equal(disposedCount, 2);
		assert.equal(cache.size(), 0);
	});
});
