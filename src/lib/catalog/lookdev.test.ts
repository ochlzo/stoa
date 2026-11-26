import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getBookcaseStructure } from '#lib/catalog/bookcase.ts';
import {
	LOOKDEV_PALETTE,
	LOOKDEV_RENDERER_CONFIG,
	SUNLIT_STUDY_LIGHTS,
	parseClayModeParam
} from '#lib/catalog/lookdev.ts';

describe('parseClayModeParam', () => {
	it('defaults to Lookdev mode when clay param is absent or empty', () => {
		assert.equal(parseClayModeParam(''), false);
		assert.equal(parseClayModeParam('?foo=bar'), false);
		assert.equal(parseClayModeParam('?clay='), false);
		assert.equal(parseClayModeParam('?clay=0'), false);
		assert.equal(parseClayModeParam('?clay=false'), false);
	});

	it('enables Clay comparison mode for ?clay=1 and ?clay=true', () => {
		assert.equal(parseClayModeParam('?clay=1'), true);
		assert.equal(parseClayModeParam('?clay=true'), true);
		assert.equal(parseClayModeParam('?clay=TRUE'), true);
		assert.equal(parseClayModeParam('?debug=1&clay=1&mode=shelf'), true);
	});
});

describe('LOOKDEV_RENDERER_CONFIG & SUNLIT_STUDY_LIGHTS', () => {
	it('sizes the shadow frustum to cover the full Bookcase silhouette', () => {
		const { bounds } = getBookcaseStructure();
		const { shadowFrustum } = LOOKDEV_RENDERER_CONFIG;
		const bookcaseWidth = bounds.maxX - bounds.minX;
		const bookcaseHeight = bounds.maxY - bounds.minY;

		assert.ok(shadowFrustum.right - shadowFrustum.left >= bookcaseWidth);
		assert.ok(shadowFrustum.top - shadowFrustum.bottom >= bookcaseHeight);
		assert.ok(shadowFrustum.near > 0 && shadowFrustum.far > shadowFrustum.near);
	});

	it('configures positive sunlit intensities and a single primary shadow caster', () => {
		assert.ok(SUNLIT_STUDY_LIGHTS.sunKey.castShadow);
		assert.equal(SUNLIT_STUDY_LIGHTS.skyFill.castShadow, false);
		assert.equal(SUNLIT_STUDY_LIGHTS.warmBounce.castShadow, false);
		assert.ok(SUNLIT_STUDY_LIGHTS.sunKey.intensity > SUNLIT_STUDY_LIGHTS.skyFill.intensity);
		assert.ok(LOOKDEV_RENDERER_CONFIG.exposure > 0);
		assert.ok(LOOKDEV_RENDERER_CONFIG.environmentIntensity > 0);
	});

	it('defines valid 6-digit hex colors across the shared LOOKDEV_PALETTE', () => {
		const hexPattern = /^#[0-9a-f]{6}$/i;
		for (const group of Object.values(LOOKDEV_PALETTE)) {
			for (const color of Object.values(group)) {
				assert.match(color, hexPattern);
			}
		}
	});
});
