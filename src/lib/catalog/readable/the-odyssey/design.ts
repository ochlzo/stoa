import type { VolumeDesign } from '#lib/catalog/readable/types.ts';

export const design: VolumeDesign = {
	bindingStyle: 'linen-cloth',
	spineProfile: 'shallow',
	coverColor: 'ochreLinen',
	foilStyle: 'gold',
	titlePageIcon: 'sailboat',
	sourceNote: 'Homer, The Odyssey. Translated by Samuel Butler (1900); text via Wikisource.',
	coverArtwork: {
		front: 'volumes/the-odyssey/front-cover.jpg',
		opacity: 1
	},
	// The supplied artwork already includes the title, author, and border.
	paintFrontCover: () => {}
};
