import type { Volume } from '#lib/catalog/types.ts';

export type PageKind = 'endpaper' | 'front-title' | 'chapter-start' | 'body' | 'colophon';
export type PageSide = 'left' | 'right';

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
	/** Deterministic clay placeholder ruled-line count for this Page. */
	readonly lineCount: number;
	/** Deterministic paragraph break line indices for clay placeholder layout. */
	readonly paragraphBreaks: readonly number[];
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

const modelCache = new Map<string, VolumeReadingModel>();

/**
 * Builds (and caches) a deterministic fixed-layout Chapter / Page / Spread model
 * for a Volume (ADR 0004).
 *
 * Layout convention:
 * - Spread 0: Front endpaper (left, index 0) + Front title Page (right, index 1).
 * - Spreads 1..N-2: Numbered Chapters & body Pages (folio numbers starting at 1).
 * - Final Spread: Trailing body/blank + Colophon Page so total Page count is always even.
 */
export function getVolumeReadingModel(volume: Volume): VolumeReadingModel {
	const cached = modelCache.get(volume.id);
	if (cached) return cached;

	const pages: Page[] = [];
	const chapters: Chapter[] = [];

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
		volumeTitle: volume.title,
		volumeAuthor: volume.author,
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
		volumeTitle: volume.title,
		volumeAuthor: volume.author,
		lineCount: 0,
		paragraphBreaks: []
	});

	const blueprints = getChapterBlueprintsForVolume(volume);
	let folio = 1;

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
				chapterIndex: c,
				chapterNumber,
				chapterRomanNumeral: roman,
				chapterTitle: bp.title,
				volumeTitle: volume.title,
				volumeAuthor: volume.author,
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
			volumeTitle: volume.title,
			volumeAuthor: volume.author,
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
		volumeTitle: volume.title,
		volumeAuthor: volume.author,
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

	const model: VolumeReadingModel = {
		volumeId: volume.id,
		title: volume.title,
		author: volume.author,
		chapters,
		pages,
		spreads,
		totalLeaves: spreadCount
	};

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
