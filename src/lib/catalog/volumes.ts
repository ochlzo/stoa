import type { VolumeClayTone, VolumeEntry } from './types.ts';

/**
 * Neutral matte clay palette for Volumes during the Clay geometry pass (ADR 0005).
 */
export const VOLUME_CLAY_COLORS: Record<VolumeClayTone, string> = {
	alabaster: '#dddad3',
	stone: '#cfccc5',
	ash: '#c1beb7',
	warmClay: '#d6d1c8',
	slateClay: '#b8b6b0'
};

export const PAGE_BLOCK_CLAY_COLOR = '#e9e6df';

const DEG = Math.PI / 180;

/**
 * Curated Catalog of 14 classic Volumes in Stoa:
 * 1 Readable Volume (The Odyssey) + 13 Placeholder Volumes,
 * arranged in asymmetric upright & leaning clusters across all 5 Shelves.
 */
export const CATALOG: readonly VolumeEntry[] = [
	// --- Shelf 0 (bottom): History cluster on the right ---
	{
		id: 'peloponnesian-war',
		title: 'History of the Peloponnesian War',
		author: 'Thucydides',
		shelfIndex: 0,
		kind: 'placeholder',
		dimensions: { height: 0.258, depth: 0.184, thickness: 0.05 },
		bindingStyle: 'blind-tooled-calf',
		clayTone: 'ash',
		placement: { anchor: 'right' }
	},
	{
		id: 'histories-herodotus',
		title: 'The Histories',
		author: 'Herodotus',
		shelfIndex: 0,
		kind: 'placeholder',
		dimensions: { height: 0.268, depth: 0.19, thickness: 0.056 },
		bindingStyle: 'raised-band-leather',
		clayTone: 'stone',
		placement: { anchor: 'right' }
	},

	// --- Shelf 1 (lower-middle): Great Novels leaning cluster on the right ---
	{
		id: 'moby-dick',
		title: 'Moby-Dick',
		author: 'Herman Melville',
		shelfIndex: 1,
		kind: 'placeholder',
		dimensions: { height: 0.242, depth: 0.172, thickness: 0.05 },
		bindingStyle: 'raised-band-leather',
		clayTone: 'slateClay',
		placement: { anchor: 'right', leanRadians: -14 * DEG }
	},
	{
		id: 'don-quixote',
		title: 'Don Quixote',
		author: 'Miguel de Cervantes',
		shelfIndex: 1,
		kind: 'placeholder',
		dimensions: { height: 0.254, depth: 0.18, thickness: 0.058 },
		bindingStyle: 'raised-band-leather',
		clayTone: 'warmClay',
		placement: { anchor: 'right' }
	},
	{
		id: 'war-and-peace',
		title: 'War and Peace',
		author: 'Leo Tolstoy',
		shelfIndex: 1,
		kind: 'placeholder',
		dimensions: { height: 0.258, depth: 0.182, thickness: 0.06 },
		bindingStyle: 'blind-tooled-calf',
		clayTone: 'alabaster',
		placement: { anchor: 'right' }
	},

	// --- Shelf 2 (eye-level default Shelf Mode): Epics on the left (The Aeneid leaning on The Odyssey) + Stoics on the right ---
	{
		id: 'iliad',
		title: 'The Iliad',
		author: 'Homer',
		shelfIndex: 2,
		kind: 'placeholder',
		dimensions: { height: 0.248, depth: 0.174, thickness: 0.05 },
		bindingStyle: 'raised-band-leather',
		clayTone: 'stone',
		placement: { anchor: 'left' }
	},
	{
		id: 'the-odyssey',
		title: 'The Odyssey',
		author: 'Homer',
		shelfIndex: 2,
		kind: 'readable',
		dimensions: { height: 0.252, depth: 0.176, thickness: 0.052 },
		bindingStyle: 'raised-band-leather',
		clayTone: 'warmClay',
		placement: { anchor: 'left' }
	},
	{
		id: 'aeneid',
		title: 'The Aeneid',
		author: 'Virgil',
		shelfIndex: 2,
		kind: 'placeholder',
		dimensions: { height: 0.238, depth: 0.168, thickness: 0.042 },
		bindingStyle: 'blind-tooled-calf',
		clayTone: 'ash',
		placement: { anchor: 'left', leanRadians: 14 * DEG }
	},
	{
		id: 'meditations',
		title: 'Meditations',
		author: 'Marcus Aurelius',
		shelfIndex: 2,
		kind: 'placeholder',
		dimensions: { height: 0.228, depth: 0.16, thickness: 0.036 },
		bindingStyle: 'raised-band-leather',
		clayTone: 'slateClay',
		placement: { anchor: 'right' }
	},
	{
		id: 'letters-stoic',
		title: 'Letters from a Stoic',
		author: 'Seneca',
		shelfIndex: 2,
		kind: 'placeholder',
		dimensions: { height: 0.234, depth: 0.164, thickness: 0.042 },
		bindingStyle: 'blind-tooled-calf',
		clayTone: 'stone',
		placement: { anchor: 'right' }
	},

	// --- Shelf 3 (upper-middle): Poetic Epics leaning cluster on the left ---
	{
		id: 'divine-comedy',
		title: 'The Divine Comedy',
		author: 'Dante Alighieri',
		shelfIndex: 3,
		kind: 'placeholder',
		dimensions: { height: 0.252, depth: 0.178, thickness: 0.054 },
		bindingStyle: 'raised-band-leather',
		clayTone: 'warmClay',
		placement: { anchor: 'left' }
	},
	{
		id: 'paradise-lost',
		title: 'Paradise Lost',
		author: 'John Milton',
		shelfIndex: 3,
		kind: 'placeholder',
		dimensions: { height: 0.238, depth: 0.168, thickness: 0.044 },
		bindingStyle: 'quarter-vellum',
		clayTone: 'alabaster',
		placement: { anchor: 'left' }
	},
	{
		id: 'metamorphoses',
		title: 'Metamorphoses',
		author: 'Ovid',
		shelfIndex: 3,
		kind: 'placeholder',
		dimensions: { height: 0.244, depth: 0.172, thickness: 0.046 },
		bindingStyle: 'blind-tooled-calf',
		clayTone: 'ash',
		placement: { anchor: 'left', leanRadians: 14 * DEG }
	},

	// --- Shelf 4 (top): Ancient Philosophy leaning cluster on the right ---
	{
		id: 'symposium-plato',
		title: 'Symposium',
		author: 'Plato',
		shelfIndex: 4,
		kind: 'placeholder',
		dimensions: { height: 0.218, depth: 0.154, thickness: 0.032 },
		bindingStyle: 'quarter-vellum',
		clayTone: 'alabaster',
		placement: { anchor: 'right', leanRadians: -15 * DEG }
	},
	{
		id: 'republic-plato',
		title: 'The Republic',
		author: 'Plato',
		shelfIndex: 4,
		kind: 'placeholder',
		dimensions: { height: 0.242, depth: 0.17, thickness: 0.046 },
		bindingStyle: 'raised-band-leather',
		clayTone: 'stone',
		placement: { anchor: 'right' }
	}
];
