import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { LOOKDEV_PALETTE } from '#lib/catalog/lookdev.ts';
import {
	buildVolumeReadingModel,
	getSpreadIndexForPage,
	getVolumeReadingModel,
	loadVolumeReadingModel
} from '#lib/catalog/reading.ts';
import { READABLE_VOLUMES } from '#lib/catalog/readable/index.ts';
import type { VolumeContent } from '#lib/catalog/readable/types.ts';
import { CATALOG } from '#lib/catalog/volumes.ts';

const validCoverColors = new Set(Object.keys(LOOKDEV_PALETTE.volumes));

describe('Readable Volume packages & registry', () => {
	it('registers an isolated readable package for every Readable Volume in CATALOG', () => {
		const readable = CATALOG.filter((v) => v.kind === 'readable');
		assert.equal(readable.length, 12);
		for (const volume of readable) {
			const pkg = READABLE_VOLUMES[volume.id];
			assert.ok(pkg, `Missing readable volume package for ${volume.id}`);
			if (pkg.design.coverColor) {
				assert.ok(
					validCoverColors.has(pkg.design.coverColor),
					`${volume.id} coverColor must be in LOOKDEV_PALETTE.volumes`
				);
			}
			if (pkg.design.endpaperColors) {
				for (const color of pkg.design.endpaperColors) {
					assert.ok(
						validCoverColors.has(color),
						`${volume.id} endpaper color ${color} must be in LOOKDEV_PALETTE.volumes`
					);
				}
			}
		}
	});

	it('leaves Placeholder Volumes purely procedural with no readable package', () => {
		const placeholders = CATALOG.filter((v) => v.kind === 'placeholder');
		assert.ok(placeholders.length > 0);
		for (const volume of placeholders) {
			assert.equal(READABLE_VOLUMES[volume.id], undefined, `${volume.id} should stay procedural`);
		}
	});
});

describe('Deterministic literary pagination (prose, verse, and illustration plates)', () => {
	const sampleVolume = CATALOG.find((v) => v.id === 'ode-on-a-grecian-urn')!;

	it('paginates prose, verse stanzas, and illustration plates into even Spreads with monotonic folios', () => {
		const content: VolumeContent = {
			title: 'Ode on a Grecian Urn (Annotated)',
			author: 'John Keats (1819)',
			subtitle: 'A Test Specimen',
			translator: 'E. Translator',
			sourceNote: 'Public domain test fixture',
			sections: [
				{
					kind: 'verse',
					title: 'Ode on a Grecian Urn',
					epigraph: 'Beauty is truth, truth beauty.',
					stanzas: [
						[
							'Thou still unravish’d bride of quietness,',
							'Thou foster-child of silence and slow time,'
						],
						[
							'Sylvan historian, who canst thus express',
							'A flowery tale more sweetly than our rhyme:'
						]
					]
				},
				{
					kind: 'illustration',
					title: 'Plate I',
					src: 'volumes/ode-on-a-grecian-urn/urn.webp',
					caption: 'Attic red-figure amphora'
				},
				{
					kind: 'prose',
					title: 'Commentary',
					openingImageSrc: 'volumes/ode-on-a-grecian-urn/commentary.webp',
					paragraphs: [
						'This is a long prose paragraph designed to wrap deterministically across multiple fixed-layout lines without relying on browser DOM measurements.',
						'A second paragraph verifies that paragraph indents and folio numbering remain strictly monotonic across every Spread.'
					]
				}
			]
		};

		const model = buildVolumeReadingModel(sampleVolume, content);
		assert.equal(model.chapters.length, 3);
		assert.equal(model.pages.length % 2, 0);
		assert.equal(model.spreads.length, model.pages.length / 2);

		// Spread 0 metadata, overrides, and source attribution
		assert.equal(model.title, 'Ode on a Grecian Urn (Annotated)');
		assert.equal(model.author, 'John Keats (1819)');
		assert.equal(model.pages[1].kind, 'front-title');
		assert.equal(model.pages[1].volumeTitle, 'Ode on a Grecian Urn (Annotated)');
		assert.equal(model.pages[1].volumeAuthor, 'John Keats (1819)');
		assert.equal(model.pages[1].volumeSubtitle, 'A Test Specimen');
		assert.equal(model.pages[1].volumeTranslator, 'E. Translator');
		assert.equal(model.pages[1].sourceNote, 'Public domain test fixture');

		// Verse page preserves stanza gap and epigraph
		const versePage = model.pages[model.chapters[0].startPageIndex];
		assert.equal(versePage.contentMode, 'verse');
		assert.equal(versePage.epigraph, 'Beauty is truth, truth beauty.');
		assert.ok(versePage.lines?.some((line) => line.stanzaGapBefore));

		// Illustration plate page
		const platePage = model.pages[model.chapters[1].startPageIndex];
		assert.equal(platePage.kind, 'illustration');
		assert.equal(platePage.illustrationSrc, 'volumes/ode-on-a-grecian-urn/urn.webp');
		assert.equal(platePage.illustrationCaption, 'Attic red-figure amphora');

		// An illustrated opener belongs to its prose Chapter; text starts on the next Page.
		const openerPage = model.pages[model.chapters[2].startPageIndex];
		assert.equal(openerPage.kind, 'chapter-opener');
		assert.equal(openerPage.illustrationSrc, 'volumes/ode-on-a-grecian-urn/commentary.webp');
		const prosePage = model.pages[openerPage.index + 1];
		assert.equal(prosePage.kind, 'body');
		assert.equal(prosePage.contentMode, 'prose');
		assert.ok((prosePage.lines?.length ?? 0) >= 3);

		// Monotonic folios & round-trip spread mapping
		let expectedFolio = 1;
		for (const page of model.pages) {
			if (
				page.kind === 'chapter-start' ||
				page.kind === 'chapter-opener' ||
				page.kind === 'body' ||
				page.kind === 'illustration'
			) {
				assert.equal(page.pageNumber, expectedFolio);
				expectedFolio += 1;
			}
			assert.equal(getSpreadIndexForPage(model, page.index), Math.floor(page.index / 2));
		}

		// Colophon note
		const lastPage = model.pages[model.pages.length - 1];
		assert.equal(lastPage.kind, 'colophon');
		assert.equal(lastPage.colophonNote, 'Public domain test fixture');
	});

	it('builds illustratedStanzas with explicit stanza PageKind, fullBleed plates, and static assets', async () => {
		const pkg = READABLE_VOLUMES['ode-on-a-grecian-urn'];
		const model = buildVolumeReadingModel(sampleVolume, await pkg.loadContent());

		assert.equal(model.chapters.length, 0);
		// Title spread + 5 illustrated stanza spreads + closing colophon spread
		assert.equal(model.spreads.length, 7);

		const root = process.cwd();
		for (let i = 1; i <= 5; i += 1) {
			const spread = model.spreads[i];
			assert.equal(spread.leftPage.kind, 'illustration');
			assert.equal(spread.leftPage.fullBleed, true);
			assert.ok(spread.leftPage.illustrationSrc?.startsWith('volumes/ode-on-a-grecian-urn/'));
			assert.ok(
				existsSync(resolve(root, 'static', spread.leftPage.illustrationSrc!)),
				`Missing static asset ${spread.leftPage.illustrationSrc}`
			);
			assert.ok(spread.leftPage.illustrationMotion?.src.startsWith('volumes/ode-on-a-grecian-urn/'));
			assert.ok(
				existsSync(resolve(root, 'static', spread.leftPage.illustrationMotion!.src)),
				`Missing static motion asset ${spread.leftPage.illustrationMotion?.src}`
			);

			assert.equal(spread.rightPage.kind, 'stanza');
			assert.equal(spread.rightPage.stanzaNumber, i);
			assert.equal(spread.rightPage.lines?.length, 10);
		}
	});

	it('lazy-loads The Odyssey content on demand and caches its 24 illustrated chapters', async () => {
		const odyssey = CATALOG.find((v) => v.id === 'the-odyssey')!;
		const model = await loadVolumeReadingModel(odyssey);

		assert.equal(model.chapters.length, 24);
		assert.equal(model.pages.filter((p) => p.kind === 'chapter-opener').length, 24);
		assert.equal(getVolumeReadingModel(odyssey), model);
	});
});

describe('Agent-agnostic skill registration', () => {
	const TOOLKIT_SKILLS = [
		'contribute-volume',
		'volume-explore',
		'volume-design',
		'volume-content',
		'volume-verify',
		'grilling',
		'pr'
	] as const;

	it('keeps all 7 toolkit skills identical across .agents and .claude and indexed in docs/CONTRIBUTING_VOLUME.md', () => {
		const root = process.cwd();
		const guide = readFileSync(resolve(root, 'docs/CONTRIBUTING_VOLUME.md'), 'utf8');
		const claudeMd = readFileSync(resolve(root, 'CLAUDE.md'), 'utf8');

		for (const skill of TOOLKIT_SKILLS) {
			const agentsSkill = readFileSync(
				resolve(root, `.agents/skills/${skill}/SKILL.md`),
				'utf8'
			);
			const claudeSkill = readFileSync(
				resolve(root, `.claude/skills/${skill}/SKILL.md`),
				'utf8'
			);
			assert.equal(agentsSkill, claudeSkill, `Skill ${skill} drifted between .agents and .claude`);
			assert.ok(
				guide.includes(skill),
				`docs/CONTRIBUTING_VOLUME.md must index the ${skill} skill`
			);
		}

		assert.ok(claudeMd.includes('AGENTS.md'));
		assert.ok(guide.includes('Ode on a Grecian Urn'));
		assert.ok(guide.includes("Gulliver's Travels"));
		assert.ok(guide.includes('Don Quixote'));
		assert.ok(guide.includes('Life of Pi'));
	});
});
