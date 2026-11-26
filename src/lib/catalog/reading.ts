import { getReadableVolumePackage } from '#lib/catalog/readable/index.ts';
import type {
	IllustrationMotion,
	ProseSection,
	VerseSection,
	VolumeContent
} from '#lib/catalog/readable/types.ts';
import type { Volume } from '#lib/catalog/types.ts';

export type PageKind =
	| 'endpaper'
	| 'front-title'
	| 'chapter-start'
	| 'body'
	| 'stanza'
	| 'illustration'
	| 'colophon';
export type PageSide = 'left' | 'right';
export type PageContentMode = 'specimen' | 'prose' | 'verse' | 'illustration';

export interface PageTextLine {
	readonly text: string;
	readonly indent?: boolean;
	readonly stanzaGapBefore?: boolean;
}

export interface Page {
	/** 0-based sequential index across the entire Volume (even = left verso, odd = right recto). */
	readonly index: number;
	/** Printed folio number, or null for unnumbered front matter / endpaper / colophon. */
	readonly pageNumber: number | null;
	/** Which side of a Spread this Page sits on. */
	readonly side: PageSide;
	readonly kind: PageKind;
	/** 0-based Chapter index, or null for front/back matter. */
	readonly chapterIndex: number | null;
	/** 1-based Chapter number, or null for front/back matter. */
	readonly chapterNumber: number | null;
	readonly chapterRomanNumeral: string | null;
	readonly chapterTitle: string | null;
	readonly volumeTitle: string;
	readonly volumeAuthor: string;
	readonly volumeSubtitle?: string;
	readonly volumeTranslator?: string;
	readonly sourceNote?: string;
	readonly colophonNote?: string;
	/** Deterministic clay placeholder ruled-line count for this Page. */
	readonly lineCount: number;
	/** Deterministic paragraph break line indices for clay placeholder layout. */
	readonly paragraphBreaks: readonly number[];
	/** Rendering mode for Lookdev Page textures (defaults to specimen when content is empty). */
	readonly contentMode?: PageContentMode;
	/** Pre-paginated literary text lines for deterministic prose/verse rendering (ADR 0004). */
	readonly lines?: readonly PageTextLine[];
	readonly epigraph?: string;
	readonly stanzaNumber?: number;
	readonly fullBleed?: boolean;
	readonly illustrationSrc?: string;
	readonly illustrationMotion?: IllustrationMotion;
	readonly illustrationCaption?: string;
}

export interface Chapter {
	/** 0-based index in VolumeReadingModel.chapters. */
	readonly index: number;
	/** 1-based Chapter number. */
	readonly number: number;
	readonly romanNumeral: string;
	readonly title: string;
	/** First Page index belonging to this Chapter. */
	readonly startPageIndex: number;
	/** Last Page index (inclusive) belonging to this Chapter. */
	readonly endPageIndex: number;
	/** Spread index where this Chapter begins. */
	readonly startSpreadIndex: number;
}

export interface Spread {
	/** 0-based Spread index (0 = front title Spread). */
	readonly index: number;
	readonly leftPage: Page;
	readonly rightPage: Page;
	/** Active Chapter index for this Spread, or null on front/back matter. */
	readonly chapterIndex: number | null;
	/** Normalized reading progress in [0, 1] used to split left/right page-stack thickness. */
	readonly progress: number;
}

export interface VolumeReadingModel {
	readonly volumeId: string;
	readonly title: string;
	readonly author: string;
	readonly chapters: readonly Chapter[];
	readonly pages: readonly Page[];
	readonly spreads: readonly Spread[];
	readonly totalLeaves: number;
}

interface ChapterBlueprint {
	readonly title: string;
	readonly pageCount: number;
}

/**
 * The 24 canonical Chapters of Homer's Odyssey with deterministic fixed-layout
 * page counts (ADR 0004: identical pagination across desktop and mobile).
 */
const ODYSSEY_CHAPTERS: readonly ChapterBlueprint[] = [
	{ title: 'Athena Inspires the Prince', pageCount: 10 },
	{ title: 'Telemachus Sets Sail', pageCount: 10 },
	{ title: 'King Nestor Remembers', pageCount: 12 },
	{ title: 'The King and Queen of Sparta', pageCount: 16 },
	{ title: 'Odysseus — Nymph and Shipwreck', pageCount: 12 },
	{ title: 'The Princess and the Stranger', pageCount: 8 },
	{ title: 'Phaeacia’s Halls and Gardens', pageCount: 8 },
	{ title: 'A Day for Songs and Contests', pageCount: 12 },
	{ title: 'In the One-Eyed Giant’s Cave', pageCount: 12 },
	{ title: 'The Bewitching Queen of Aeaea', pageCount: 12 },
	{ title: 'The Kingdom of the Dead', pageCount: 14 },
	{ title: 'The Cattle of the Sun', pageCount: 10 },
	{ title: 'Ithaca at Last', pageCount: 10 },
	{ title: 'The Loyal Swineherd', pageCount: 12 },
	{ title: 'The Prince Sets Sail for Home', pageCount: 12 },
	{ title: 'Father and Son', pageCount: 10 },
	{ title: 'Stranger at the Gates', pageCount: 12 },
	{ title: 'The Beggar-King of Ithaca', pageCount: 10 },
	{ title: 'Penelope and Her Guest', pageCount: 12 },
	{ title: 'Portents Gather', pageCount: 8 },
	{ title: 'Odysseus Strings His Bow', pageCount: 10 },
	{ title: 'Slaughter in the Hall', pageCount: 10 },
	{ title: 'The Great Rooted Bed', pageCount: 8 },
	{ title: 'Peace', pageCount: 10 }
];

const ROMAN_NUMERALS: readonly [number, string][] = [
	[100, 'C'],
	[90, 'XC'],
	[50, 'L'],
	[40, 'XL'],
	[10, 'X'],
	[9, 'IX'],
	[5, 'V'],
	[4, 'IV'],
	[1, 'I']
];

export function toRomanNumeral(value: number): string {
	let remaining = Math.max(1, Math.floor(value));
	let out = '';
	for (const [num, symbol] of ROMAN_NUMERALS) {
		while (remaining >= num) {
			out += symbol;
			remaining -= num;
		}
	}
	return out;
}

function deterministicHash(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i += 1) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function buildParagraphBreaks(seed: string, lineCount: number): readonly number[] {
	const breaks: number[] = [];
	let cursor = 4 + (deterministicHash(`${seed}:p0`) % 4);
	let idx = 1;
	while (cursor < lineCount - 3) {
		breaks.push(cursor);
		cursor += 5 + (deterministicHash(`${seed}:p${idx}`) % 4);
		idx += 1;
	}
	return breaks;
}

function getChapterBlueprintsForVolume(volume: Volume): readonly ChapterBlueprint[] {
	if (volume.id === 'the-odyssey') {
		return ODYSSEY_CHAPTERS;
	}
	// Data-driven fallback for any future Readable Volume (ADR 0006).
	const chapterCount = Math.max(6, Math.min(24, Math.round(volume.dimensions.thickness * 320)));
	const blueprints: ChapterBlueprint[] = [];
	for (let i = 0; i < chapterCount; i += 1) {
		const pages = 8 + (deterministicHash(`${volume.id}:ch:${i}`) % 5) * 2;
		blueprints.push({
			title: `Chapter ${toRomanNumeral(i + 1)}`,
			pageCount: pages
		});
	}
	return blueprints;
}

const PROSE_CHARS_PER_LINE = 42;
const VERSE_CHARS_PER_LINE = 44;
const BODY_LINES_PER_PAGE = 22;
const OPENER_LINES_PER_PAGE = 14;
const MIN_BODY_LINES_PER_PAGE = 6;

function wrapTextToBudget(text: string, maxChars: number): string[] {
	const words = text.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];
	const rows: string[] = [];
	let current = words[0];
	for (let i = 1; i < words.length; i += 1) {
		const word = words[i];
		if (current.length + 1 + word.length <= maxChars) {
			current += ' ' + word;
		} else {
			rows.push(current);
			current = word;
		}
	}
	rows.push(current);
	return rows;
}

function paginateProseSection(section: ProseSection): readonly (readonly PageTextLine[])[] {
	const allLines: PageTextLine[] = [];
	for (const paragraph of section.paragraphs) {
		const wrapped = wrapTextToBudget(paragraph, PROSE_CHARS_PER_LINE);
		wrapped.forEach((text, idx) => {
			allLines.push({ text, indent: idx === 0 });
		});
	}
	if (allLines.length === 0) return [[]];

	const firstLimit = section.epigraph ? OPENER_LINES_PER_PAGE - 3 : OPENER_LINES_PER_PAGE;
	let openerLineCount = Math.min(firstLimit, allLines.length);
	let remainingLineCount = allLines.length - openerLineCount;

	// Give a short tail back to the Chapter-opening Page instead of leaving a
	// nearly empty final Page by itself.
	if (remainingLineCount > 0 && remainingLineCount < MIN_BODY_LINES_PER_PAGE) {
		openerLineCount = Math.max(
			MIN_BODY_LINES_PER_PAGE,
			allLines.length - MIN_BODY_LINES_PER_PAGE
		);
		remainingLineCount = allLines.length - openerLineCount;
	}

	const buckets: PageTextLine[][] = [allLines.slice(0, openerLineCount)];
	const continuationPageCount = Math.ceil(remainingLineCount / BODY_LINES_PER_PAGE);
	const continuationLinesPerPage = continuationPageCount
		? Math.ceil(remainingLineCount / continuationPageCount)
		: 0;
	let cursor = openerLineCount;
	while (cursor < allLines.length) {
		const end = Math.min(allLines.length, cursor + continuationLinesPerPage);
		buckets.push(allLines.slice(cursor, end));
		cursor = end;
	}
	return buckets;
}

function paginateVerseSection(section: VerseSection): readonly (readonly PageTextLine[])[] {
	const allLines: PageTextLine[] = [];
	section.stanzas.forEach((stanza, stanzaIdx) => {
		stanza.forEach((rawLine, lineIdx) => {
			const wrapped = wrapTextToBudget(rawLine, VERSE_CHARS_PER_LINE);
			if (wrapped.length === 0) return;
			wrapped.forEach((text, wrapIdx) => {
				allLines.push({
					text,
					indent: wrapIdx > 0,
					stanzaGapBefore: stanzaIdx > 0 && lineIdx === 0 && wrapIdx === 0
				});
			});
		});
	});
	if (allLines.length === 0) return [[]];

	const firstLimit = section.epigraph ? OPENER_LINES_PER_PAGE - 3 : OPENER_LINES_PER_PAGE;
	const buckets: PageTextLine[][] = [];
	let cursor = 0;
	while (cursor < allLines.length) {
		const limit = buckets.length === 0 ? Math.max(6, firstLimit) : BODY_LINES_PER_PAGE;
		const slice: PageTextLine[] = [];
		let units = 0;
		while (cursor < allLines.length) {
			const line = allLines[cursor];
			const gapCost = slice.length > 0 && line.stanzaGapBefore ? 0.65 : 0;
			if (slice.length > 0 && units + gapCost + 1 > limit) break;
			slice.push(slice.length === 0 && line.stanzaGapBefore ? { ...line, stanzaGapBefore: false } : line);
			units += gapCost + 1;
			cursor += 1;
		}
		buckets.push(slice);
	}
	return buckets;
}

const modelCache = new Map<string, VolumeReadingModel>();

/**
 * Builds a deterministic fixed-layout Chapter / Page / Spread model for a Volume
 * from an explicit `VolumeContent` package (ADR 0004). Falls back to specimen pages
 * when `content.sections` is empty.
 */
export function buildVolumeReadingModel(
	volume: Volume,
	content?: VolumeContent
): VolumeReadingModel {
	const pages: Page[] = [];
	const chapters: Chapter[] = [];
	const resolvedTitle = content?.title ?? volume.title;
	const resolvedAuthor = content?.author ?? volume.author;

	// Spread 0: Front title Spread
	pages.push({
		index: 0,
		pageNumber: null,
		side: 'left',
		kind: 'endpaper',
		chapterIndex: null,
		chapterNumber: null,
		chapterRomanNumeral: null,
		chapterTitle: null,
		volumeTitle: resolvedTitle,
		volumeAuthor: resolvedAuthor,
		lineCount: 0,
		paragraphBreaks: []
	});

	pages.push({
		index: 1,
		pageNumber: null,
		side: 'right',
		kind: 'front-title',
		chapterIndex: null,
		chapterNumber: null,
		chapterRomanNumeral: null,
		chapterTitle: null,
		volumeTitle: resolvedTitle,
		volumeAuthor: resolvedAuthor,
		volumeSubtitle: content?.subtitle,
		volumeTranslator: content?.translator,
		sourceNote: content?.sourceNote,
		lineCount: 0,
		paragraphBreaks: []
	});

	let folio = 1;

	if (content?.illustratedStanzas) {
		for (const [stanzaIndex, stanza] of content.illustratedStanzas.entries()) {
			const pageIndex = pages.length;
			const stanzaPage = {
				chapterIndex: null,
				chapterNumber: null,
				chapterRomanNumeral: null,
				chapterTitle: null,
				volumeTitle: resolvedTitle,
				volumeAuthor: resolvedAuthor,
				paragraphBreaks: [],
				stanzaNumber: stanzaIndex + 1
			};
			const lines = stanza.lines.map((text) => ({ text }));
			pages.push(
				{
					...stanzaPage,
					index: pageIndex,
					pageNumber: folio,
					side: 'left',
					kind: 'illustration',
					contentMode: 'illustration',
					lineCount: 0,
					fullBleed: true,
					illustrationSrc: stanza.illustrationSrc,
					illustrationMotion: stanza.motion
				},
				{
					...stanzaPage,
					index: pageIndex + 1,
					pageNumber: folio + 1,
					side: 'right',
					kind: 'stanza',
					contentMode: 'verse',
					lineCount: lines.length,
					lines
				}
			);
			folio += 2;
		}
	} else if (content?.sections?.length) {
		for (const section of content.sections) {
			const chapterIndex = chapters.length;
			const chapterNumber = chapterIndex + 1;
			const roman = toRomanNumeral(chapterNumber);
			const startPageIndex = pages.length;

			if (section.kind === 'illustration') {
				const pageIndex = pages.length;
				pages.push({
					index: pageIndex,
					pageNumber: folio,
					side: pageIndex % 2 === 0 ? 'left' : 'right',
					kind: 'illustration',
					contentMode: 'illustration',
					chapterIndex,
					chapterNumber,
					chapterRomanNumeral: roman,
					chapterTitle: section.title ?? section.caption ?? `Plate ${roman}`,
					volumeTitle: resolvedTitle,
					volumeAuthor: resolvedAuthor,
					lineCount: 0,
					paragraphBreaks: [],
					illustrationSrc: section.src,
					illustrationMotion: section.motion,
					illustrationCaption: section.caption
				});
				folio += 1;
				chapters.push({
					index: chapterIndex,
					number: chapterNumber,
					romanNumeral: roman,
					title: section.title ?? section.caption ?? `Plate ${roman}`,
					startPageIndex,
					endPageIndex: pageIndex,
					startSpreadIndex: Math.floor(startPageIndex / 2)
				});
				continue;
			}

			const pageBuckets =
				section.kind === 'prose' ? paginateProseSection(section) : paginateVerseSection(section);

			pageBuckets.forEach((lines, bucketIdx) => {
				const pageIndex = pages.length;
				const isStart = bucketIdx === 0;
				const paragraphBreaks: number[] = [];
				lines.forEach((line, idx) => {
					if (idx > 0 && (line.indent || line.stanzaGapBefore)) paragraphBreaks.push(idx);
				});
				pages.push({
					index: pageIndex,
					pageNumber: folio,
					side: pageIndex % 2 === 0 ? 'left' : 'right',
					kind: isStart ? 'chapter-start' : 'body',
					contentMode: section.kind,
					chapterIndex,
					chapterNumber,
					chapterRomanNumeral: roman,
					chapterTitle: section.title,
					volumeTitle: resolvedTitle,
					volumeAuthor: resolvedAuthor,
					lineCount: Math.max(1, lines.length),
					paragraphBreaks,
					lines,
					epigraph: isStart ? section.epigraph : undefined
				});
				folio += 1;
			});

			const endPageIndex = pages.length - 1;
			chapters.push({
				index: chapterIndex,
				number: chapterNumber,
				romanNumeral: roman,
				title: section.title,
				startPageIndex,
				endPageIndex,
				startSpreadIndex: Math.floor(startPageIndex / 2)
			});
		}
	} else {
		const blueprints = getChapterBlueprintsForVolume(volume);

		for (let c = 0; c < blueprints.length; c += 1) {
			const bp = blueprints[c];
			const chapterNumber = c + 1;
			const roman = toRomanNumeral(chapterNumber);
			const startPageIndex = pages.length;

			for (let p = 0; p < bp.pageCount; p += 1) {
				const pageIndex = pages.length;
				const isStart = p === 0;
				const isEnd = p === bp.pageCount - 1;
				const baseLines = isStart ? 18 : isEnd ? 16 + (deterministicHash(`${volume.id}:${pageIndex}`) % 7) : 26;
				pages.push({
					index: pageIndex,
					pageNumber: folio,
					side: pageIndex % 2 === 0 ? 'left' : 'right',
					kind: isStart ? 'chapter-start' : 'body',
					contentMode: 'specimen',
					chapterIndex: c,
					chapterNumber,
					chapterRomanNumeral: roman,
					chapterTitle: bp.title,
					volumeTitle: resolvedTitle,
					volumeAuthor: resolvedAuthor,
					lineCount: baseLines,
					paragraphBreaks: buildParagraphBreaks(`${volume.id}:${pageIndex}`, baseLines)
				});
				folio += 1;
			}

			const endPageIndex = pages.length - 1;
			chapters.push({
				index: c,
				number: chapterNumber,
				romanNumeral: roman,
				title: bp.title,
				startPageIndex,
				endPageIndex,
				startSpreadIndex: Math.floor(startPageIndex / 2)
			});
		}
	}

	// Ensure a clean closing colophon Spread with an even total number of Pages.
	if (pages.length % 2 === 0) {
		pages.push({
			index: pages.length,
			pageNumber: null,
			side: 'left',
			kind: 'endpaper',
			chapterIndex: null,
			chapterNumber: null,
			chapterRomanNumeral: null,
			chapterTitle: null,
			volumeTitle: resolvedTitle,
			volumeAuthor: resolvedAuthor,
			lineCount: 0,
			paragraphBreaks: []
		});
	}
	pages.push({
		index: pages.length,
		pageNumber: null,
		side: 'right',
		kind: 'colophon',
		chapterIndex: null,
		chapterNumber: null,
		chapterRomanNumeral: null,
		chapterTitle: null,
		volumeTitle: resolvedTitle,
		volumeAuthor: resolvedAuthor,
		colophonNote: content?.colophonNote ?? content?.sourceNote,
		lineCount: 0,
		paragraphBreaks: []
	});

	const spreadCount = pages.length / 2;
	const spreads: Spread[] = [];
	for (let s = 0; s < spreadCount; s += 1) {
		const leftPage = pages[s * 2];
		const rightPage = pages[s * 2 + 1];
		const chapterIndex = leftPage.chapterIndex ?? rightPage.chapterIndex;
		const progress = spreadCount > 1 ? s / (spreadCount - 1) : 0;
		spreads.push({
			index: s,
			leftPage,
			rightPage,
			chapterIndex,
			progress
		});
	}

	return {
		volumeId: volume.id,
		title: resolvedTitle,
		author: resolvedAuthor,
		chapters,
		pages,
		spreads,
		totalLeaves: spreadCount
	};
}

/**
 * Builds (and caches) a deterministic fixed-layout Chapter / Page / Spread model
 * for a Volume (ADR 0004).
 */
export function getVolumeReadingModel(volume: Volume): VolumeReadingModel {
	const cached = modelCache.get(volume.id);
	if (cached) return cached;

	const pkg = getReadableVolumePackage(volume.id);
	const model = buildVolumeReadingModel(volume, pkg?.content);
	modelCache.set(volume.id, model);
	return model;
}

export function clampSpreadIndex(model: VolumeReadingModel, spreadIndex: number): number {
	if (!Number.isFinite(spreadIndex)) return 0;
	return Math.max(0, Math.min(model.spreads.length - 1, Math.floor(spreadIndex)));
}

export function getSpread(model: VolumeReadingModel, spreadIndex: number): Spread {
	return model.spreads[clampSpreadIndex(model, spreadIndex)];
}

export function getSpreadIndexForPage(model: VolumeReadingModel, pageIndex: number): number {
	if (!Number.isFinite(pageIndex)) return 0;
	const clampedPage = Math.max(0, Math.min(model.pages.length - 1, Math.floor(pageIndex)));
	return Math.floor(clampedPage / 2);
}

/**
 * Canonical Page index stored in localStorage when saving reading progress for a Spread.
 * Spread 0 stores Page 1 (the front title Page); body Spreads store their left Page index.
 */
export function getCanonicalPageIndexForSpread(
	model: VolumeReadingModel,
	spreadIndex: number
): number {
	const spread = getSpread(model, spreadIndex);
	return spread.index === 0 ? spread.rightPage.index : spread.leftPage.index;
}
