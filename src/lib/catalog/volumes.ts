import type {
	BindingStyleId,
	SpineProfile,
	VolumeCoverColor,
	VolumeClayTone,
	Volume,
	VolumePlacementRule
} from '#lib/catalog/types.ts';

/**
 * Neutral matte clay palette for Volumes during the Clay geometry pass (ADR 0005).
 * Seven close-but-distinct values let neighboring spines read as separate objects
 * without introducing hue (that belongs to the Lookdev pass).
 */
export const VOLUME_CLAY_COLORS: Record<VolumeClayTone, string> = {
	bone: '#e8e4db',
	alabaster: '#dddad3',
	stone: '#cfccc5',
	warmClay: '#d6d1c8',
	ash: '#c1beb7',
	slateClay: '#b3b1ab',
	charcoal: '#a09e98'
};

export const PAGE_BLOCK_CLAY_COLOR = '#e9e6df';

const DEG = Math.PI / 180;

/** [height, thickness, depth] in meters. */
type Size = readonly [height: number, thickness: number, depth: number];

const LEFT: VolumePlacementRule = { anchor: 'left' };
const RIGHT: VolumePlacementRule = { anchor: 'right' };
const leaning = (rule: VolumePlacementRule, degrees: number): VolumePlacementRule => ({
	...rule,
	leanRadians: degrees * DEG
});

interface VolumeSpec {
	readonly id: string;
	readonly title: string;
	readonly author: string;
	readonly shelf: number;
	readonly size: Size;
	readonly binding: BindingStyleId;
	readonly coverColor: VolumeCoverColor;
	readonly tone: VolumeClayTone;
	readonly spine: SpineProfile;
	readonly placement: VolumePlacementRule;
	readonly readable?: boolean;
}

function volume(spec: VolumeSpec): Volume {
	const [height, thickness, depth] = spec.size;
	return {
		id: spec.id,
		title: spec.title,
		author: spec.author,
		shelfIndex: spec.shelf,
		kind: spec.readable ? 'readable' : 'placeholder',
		dimensions: { height, thickness, depth },
		bindingStyle: spec.binding,
		clayTone: spec.tone,
		coverColor: spec.coverColor,
		spineProfile: spec.spine,
		placement: spec.placement
	};
}

/**
 * Curated Catalog of classic Volumes in Stoa: 1 Readable Volume (The Odyssey) plus
 * Placeholder Volumes, arranged in asymmetric clusters across all 5 Shelves.
 *
 * Authoring rules that keep the Shelves natural and physically grounded:
 * - Heights span ~0.196-0.268 m, spines ~0.024-0.056 m, depths ~0.136-0.188 m.
 * - Every upright cluster is supported against a side panel (with a bookend or leaning
 *   outer Volume on its open end — never free-standing upright in mid-shelf).
 * - No two neighbors share a clay tone, and tall/short and thick/thin volumes alternate.
 * - Each Catalog list reads left-to-right as seen from the front of the Bookcase.
 */
export const CATALOG: readonly Volume[] = [
	// --- Shelf 0 (bottom): History & Biography. Short left run (supported by bookend), right run with leaning end ---
	volume({ id: 'lives-of-the-artists', title: 'Lives of the Artists', author: 'Giorgio Vasari', shelf: 0, size: [0.258, 0.052, 0.182], binding: 'blind-tooled-calf', coverColor: 'oxblood', tone: 'charcoal', spine: 'flat', placement: LEFT }),
	volume({ id: 'confessions', title: 'Confessions', author: 'Augustine of Hippo', shelf: 0, size: [0.214, 0.03, 0.148], binding: 'quarter-vellum', coverColor: 'agedVellum', tone: 'bone', spine: 'shallow', placement: LEFT }),
	volume({ id: 'autobiography-franklin', title: 'The Autobiography', author: 'Benjamin Franklin', shelf: 0, size: [0.242, 0.042, 0.168], binding: 'raised-band-leather', coverColor: 'navyCloth', tone: 'warmClay', spine: 'rounded', placement: LEFT }),

	volume({ id: 'parallel-lives', title: 'Parallel Lives', author: 'Plutarch', shelf: 0, size: [0.232, 0.034, 0.158], binding: 'quarter-vellum', coverColor: 'oliveCloth', tone: 'bone', spine: 'shallow', placement: leaning(RIGHT, -13) }),
	volume({ id: 'peloponnesian-war', title: 'History of the Peloponnesian War', author: 'Thucydides', shelf: 0, size: [0.25, 0.046, 0.178], binding: 'blind-tooled-calf', coverColor: 'umberCalf', tone: 'ash', spine: 'rounded', placement: RIGHT }),
	volume({ id: 'histories-herodotus', title: 'The Histories', author: 'Herodotus', shelf: 0, size: [0.264, 0.052, 0.184], binding: 'raised-band-leather', coverColor: 'oxblood', tone: 'stone', spine: 'rounded', placement: RIGHT }),
	volume({ id: 'decline-and-fall', title: 'The Decline and Fall of the Roman Empire', author: 'Edward Gibbon', shelf: 0, size: [0.268, 0.056, 0.188], binding: 'raised-band-leather', coverColor: 'forestGreen', tone: 'charcoal', spine: 'flat', placement: RIGHT }),
	volume({ id: 'anabasis', title: 'Anabasis', author: 'Xenophon', shelf: 0, size: [0.21, 0.028, 0.144], binding: 'linen-cloth', coverColor: 'ochreLinen', tone: 'alabaster', spine: 'shallow', placement: RIGHT }),
	volume({ id: 'annals', title: 'The Annals', author: 'Tacitus', shelf: 0, size: [0.252, 0.042, 0.174], binding: 'blind-tooled-calf', coverColor: 'plumLeather', tone: 'warmClay', spine: 'rounded', placement: RIGHT }),
	volume({ id: 'gallic-war', title: 'The Gallic War', author: 'Julius Caesar', shelf: 0, size: [0.23, 0.038, 0.162], binding: 'linen-cloth', coverColor: 'slateBlue', tone: 'slateClay', spine: 'flat', placement: RIGHT }),

	// --- Shelf 1: Great Novels. Grounded left cluster with leaning end, props in center, right run with leaning end ---
	volume({ id: 'great-expectations', title: 'Great Expectations', author: 'Charles Dickens', shelf: 1, size: [0.248, 0.046, 0.174], binding: 'raised-band-leather', coverColor: 'forestGreen', tone: 'stone', spine: 'rounded', placement: LEFT }),
	volume({ id: 'middlemarch', title: 'Middlemarch', author: 'George Eliot', shelf: 1, size: [0.262, 0.054, 0.184], binding: 'blind-tooled-calf', coverColor: 'oxblood', tone: 'charcoal', spine: 'rounded', placement: LEFT }),
	volume({ id: 'pride-and-prejudice', title: 'Pride and Prejudice', author: 'Jane Austen', shelf: 1, size: [0.222, 0.032, 0.152], binding: 'quarter-vellum', coverColor: 'agedVellum', tone: 'bone', spine: 'flat', placement: leaning(LEFT, 14) }),

	volume({ id: 'moby-dick', title: 'Moby-Dick', author: 'Herman Melville', shelf: 1, size: [0.24, 0.046, 0.17], binding: 'raised-band-leather', coverColor: 'navyCloth', tone: 'slateClay', spine: 'rounded', placement: leaning(RIGHT, -14) }),
	volume({ id: 'don-quixote', title: 'Don Quixote', author: 'Miguel de Cervantes', shelf: 1, size: [0.256, 0.052, 0.18], binding: 'raised-band-leather', coverColor: 'ochreLinen', tone: 'warmClay', spine: 'rounded', placement: RIGHT }),
	volume({ id: 'brothers-karamazov', title: 'The Brothers Karamazov', author: 'Fyodor Dostoevsky', shelf: 1, size: [0.228, 0.04, 0.156], binding: 'linen-cloth', coverColor: 'oliveCloth', tone: 'bone', spine: 'flat', placement: RIGHT }),
	volume({ id: 'war-and-peace', title: 'War and Peace', author: 'Leo Tolstoy', shelf: 1, size: [0.268, 0.056, 0.188], binding: 'blind-tooled-calf', coverColor: 'umberCalf', tone: 'alabaster', spine: 'rounded', placement: RIGHT }),

	// --- Shelf 2 (eye-level default Shelf Mode): Epics on the left (Aeneid leaning on The Odyssey), Stoics on the right ---
	volume({ id: 'gilgamesh', title: 'The Epic of Gilgamesh', author: 'Anonymous', shelf: 2, size: [0.204, 0.028, 0.14], binding: 'quarter-vellum', coverColor: 'agedVellum', tone: 'bone', spine: 'shallow', placement: LEFT }),
	volume({ id: 'beowulf', title: 'Beowulf', author: 'Anonymous', shelf: 2, size: [0.234, 0.038, 0.162], binding: 'linen-cloth', coverColor: 'slateBlue', tone: 'slateClay', spine: 'flat', placement: LEFT }),
	volume({ id: 'iliad', title: 'The Iliad', author: 'Homer', shelf: 2, size: [0.26, 0.052, 0.182], binding: 'raised-band-leather', coverColor: 'oxblood', tone: 'stone', spine: 'rounded', placement: LEFT }),
	volume({ id: 'the-odyssey', title: 'The Odyssey', author: 'Homer', shelf: 2, size: [0.254, 0.05, 0.178], binding: 'raised-band-leather', coverColor: 'navyCloth', tone: 'warmClay', spine: 'rounded', placement: LEFT, readable: true }),
	volume({ id: 'aeneid', title: 'The Aeneid', author: 'Virgil', shelf: 2, size: [0.236, 0.04, 0.166], binding: 'blind-tooled-calf', coverColor: 'oliveCloth', tone: 'ash', spine: 'rounded', placement: leaning(LEFT, 14) }),

	volume({ id: 'meditations', title: 'Meditations', author: 'Marcus Aurelius', shelf: 2, size: [0.226, 0.036, 0.158], binding: 'raised-band-leather', coverColor: 'forestGreen', tone: 'slateClay', spine: 'rounded', placement: RIGHT }),
	volume({ id: 'letters-from-a-stoic', title: 'Letters from a Stoic', author: 'Seneca', shelf: 2, size: [0.246, 0.042, 0.17], binding: 'blind-tooled-calf', coverColor: 'umberCalf', tone: 'stone', spine: 'flat', placement: RIGHT }),
	volume({ id: 'enchiridion', title: 'Enchiridion', author: 'Epictetus', shelf: 2, size: [0.196, 0.024, 0.136], binding: 'quarter-vellum', coverColor: 'agedVellum', tone: 'alabaster', spine: 'shallow', placement: RIGHT }),
	volume({ id: 'essays-montaigne', title: 'Essays', author: 'Michel de Montaigne', shelf: 2, size: [0.264, 0.054, 0.184], binding: 'raised-band-leather', coverColor: 'plumLeather', tone: 'charcoal', spine: 'flat', placement: RIGHT }),
	volume({ id: 'pensees', title: 'Pensées', author: 'Blaise Pascal', shelf: 2, size: [0.218, 0.032, 0.15], binding: 'linen-cloth', coverColor: 'ochreLinen', tone: 'warmClay', spine: 'rounded', placement: RIGHT }),
	volume({ id: 'ethics-spinoza', title: 'Ethics', author: 'Baruch Spinoza', shelf: 2, size: [0.248, 0.044, 0.174], binding: 'blind-tooled-calf', coverColor: 'oxblood', tone: 'bone', spine: 'rounded', placement: RIGHT }),

	// --- Shelf 3: Poetry & Drama. Balanced left run with leaning end, toned-down right run ---
	volume({ id: 'leaves-of-grass', title: 'Leaves of Grass', author: 'Walt Whitman', shelf: 3, size: [0.222, 0.032, 0.154], binding: 'linen-cloth', coverColor: 'oliveCloth', tone: 'bone', spine: 'flat', placement: LEFT }),
	volume({ id: 'canterbury-tales', title: 'The Canterbury Tales', author: 'Geoffrey Chaucer', shelf: 3, size: [0.254, 0.05, 0.18], binding: 'raised-band-leather', coverColor: 'navyCloth', tone: 'slateClay', spine: 'rounded', placement: LEFT }),
	volume({ id: 'faust', title: 'Faust', author: 'Johann Wolfgang von Goethe', shelf: 3, size: [0.238, 0.038, 0.166], binding: 'blind-tooled-calf', coverColor: 'umberCalf', tone: 'stone', spine: 'shallow', placement: LEFT }),
	volume({ id: 'divine-comedy', title: 'The Divine Comedy', author: 'Dante Alighieri', shelf: 3, size: [0.264, 0.054, 0.184], binding: 'raised-band-leather', coverColor: 'oxblood', tone: 'warmClay', spine: 'rounded', placement: LEFT }),
	volume({ id: 'paradise-lost', title: 'Paradise Lost', author: 'John Milton', shelf: 3, size: [0.23, 0.036, 0.162], binding: 'quarter-vellum', coverColor: 'agedVellum', tone: 'alabaster', spine: 'flat', placement: LEFT }),
	volume({ id: 'metamorphoses', title: 'Metamorphoses', author: 'Ovid', shelf: 3, size: [0.242, 0.042, 0.17], binding: 'blind-tooled-calf', coverColor: 'forestGreen', tone: 'ash', spine: 'rounded', placement: leaning(LEFT, 14) }),

	volume({ id: 'sonnets', title: 'Sonnets', author: 'William Shakespeare', shelf: 3, size: [0.204, 0.026, 0.14], binding: 'quarter-vellum', coverColor: 'plumLeather', tone: 'bone', spine: 'shallow', placement: leaning(RIGHT, -12) }),
	volume({ id: 'complete-works-shakespeare', title: 'Complete Works', author: 'William Shakespeare', shelf: 3, size: [0.266, 0.056, 0.186], binding: 'blind-tooled-calf', coverColor: 'slateBlue', tone: 'charcoal', spine: 'flat', placement: RIGHT }),
	volume({ id: 'don-juan', title: 'Don Juan', author: 'Lord Byron', shelf: 3, size: [0.244, 0.044, 0.172], binding: 'raised-band-leather', coverColor: 'ochreLinen', tone: 'stone', spine: 'rounded', placement: RIGHT }),

	// --- Shelf 4 (top): Ancient Philosophy. Framed art on the left, right run with leaning end ---
	volume({ id: 'symposium', title: 'Symposium', author: 'Plato', shelf: 4, size: [0.214, 0.03, 0.15], binding: 'quarter-vellum', coverColor: 'agedVellum', tone: 'alabaster', spine: 'shallow', placement: leaning(RIGHT, -15) }),
	volume({ id: 'republic', title: 'The Republic', author: 'Plato', shelf: 4, size: [0.24, 0.044, 0.168], binding: 'raised-band-leather', coverColor: 'forestGreen', tone: 'stone', spine: 'rounded', placement: RIGHT }),
	volume({ id: 'nicomachean-ethics', title: 'Nicomachean Ethics', author: 'Aristotle', shelf: 4, size: [0.258, 0.05, 0.182], binding: 'blind-tooled-calf', coverColor: 'oxblood', tone: 'charcoal', spine: 'flat', placement: RIGHT }),
	volume({ id: 'phaedo', title: 'Phaedo', author: 'Plato', shelf: 4, size: [0.2, 0.026, 0.14], binding: 'linen-cloth', coverColor: 'ochreLinen', tone: 'bone', spine: 'shallow', placement: RIGHT }),
	volume({ id: 'metaphysics', title: 'Metaphysics', author: 'Aristotle', shelf: 4, size: [0.264, 0.054, 0.186], binding: 'raised-band-leather', coverColor: 'navyCloth', tone: 'warmClay', spine: 'rounded', placement: RIGHT }),
	volume({ id: 'discourses', title: 'Discourses', author: 'Epictetus', shelf: 4, size: [0.228, 0.038, 0.16], binding: 'linen-cloth', coverColor: 'oliveCloth', tone: 'slateClay', spine: 'flat', placement: RIGHT }),
	volume({ id: 'critique-of-pure-reason', title: 'Critique of Pure Reason', author: 'Immanuel Kant', shelf: 4, size: [0.25, 0.048, 0.174], binding: 'blind-tooled-calf', coverColor: 'umberCalf', tone: 'ash', spine: 'rounded', placement: RIGHT })
];
