import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	clampSpreadIndex,
	getCanonicalPageIndexForSpread,
	getSpread,
	getSpreadIndexForPage,
	getVolumeReadingModel,
	toRomanNumeral
} from '#lib/catalog/reading.ts';
import { CATALOG } from '#lib/catalog/volumes.ts';

const odyssey = CATALOG.find((v) => v.id === 'the-odyssey')!;

describe('Deterministic Chapter / Page / Spread model (ADR 0004)', () => {
	it('generates 24 Chapters and deterministic even-count Pages for The Odyssey', () => {
		const model = getVolumeReadingModel(odyssey);
		assert.equal(model.volumeId, 'the-odyssey');
		assert.equal(model.chapters.length, 24);
		assert.equal(model.pages.length % 2, 0);
		assert.equal(model.spreads.length, model.pages.length / 2);
		assert.equal(model.totalLeaves, model.spreads.length);
	});

	it('places a front endpaper and front title Page on Spread 0', () => {
		const model = getVolumeReadingModel(odyssey);
		const titleSpread = getSpread(model, 0);

		assert.equal(titleSpread.index, 0);
		assert.equal(titleSpread.progress, 0);
		assert.equal(titleSpread.leftPage.kind, 'endpaper');
		assert.equal(titleSpread.leftPage.side, 'left');
		assert.equal(titleSpread.leftPage.pageNumber, null);

		assert.equal(titleSpread.rightPage.kind, 'front-title');
		assert.equal(titleSpread.rightPage.side, 'right');
		assert.equal(titleSpread.rightPage.pageNumber, null);
		assert.equal(titleSpread.rightPage.volumeTitle, 'The Odyssey');
	});

	it('assigns monotonic folio numbers and alternating left/right sides across all body Pages', () => {
		const model = getVolumeReadingModel(odyssey);
		let expectedFolio = 1;

		for (const page of model.pages) {
			assert.equal(page.side, page.index % 2 === 0 ? 'left' : 'right');
			if (page.kind === 'chapter-start' || page.kind === 'body') {
				assert.equal(page.pageNumber, expectedFolio);
				expectedFolio += 1;
			}
		}

		assert.ok(Math.abs(model.spreads[model.spreads.length - 1].progress - 1) < 1e-6);
		assert.equal(model.spreads[model.spreads.length - 1].rightPage.kind, 'colophon');
	});

	it('maps canonical Page indices round-trip back to the exact same Spread', () => {
		const model = getVolumeReadingModel(odyssey);
		for (let s = 0; s < model.spreads.length; s += 1) {
			const savedPage = getCanonicalPageIndexForSpread(model, s);
			assert.equal(getSpreadIndexForPage(model, savedPage), s);
		}
		assert.equal(clampSpreadIndex(model, -5), 0);
		assert.equal(clampSpreadIndex(model, 9999), model.spreads.length - 1);
	});

	it('converts chapter numbers to Roman numerals cleanly', () => {
		assert.equal(toRomanNumeral(1), 'I');
		assert.equal(toRomanNumeral(4), 'IV');
		assert.equal(toRomanNumeral(9), 'IX');
		assert.equal(toRomanNumeral(14), 'XIV');
		assert.equal(toRomanNumeral(24), 'XXIV');
	});
});
