import type { ReadableVolumePackage, VolumeContent } from '#lib/catalog/readable/types.ts';
import { design as theOdysseyDesign } from '#lib/catalog/readable/the-odyssey/design.ts';
import { design as theRoadNotTakenDesign } from '#lib/catalog/readable/the-road-not-taken/design.ts';
import { design as ilustradoDesign } from '#lib/catalog/readable/ilustrado/design.ts';
import { design as theColorPurpleDesign } from '#lib/catalog/readable/the-color-purple/design.ts';
import { design as theMerchantOfVeniceDesign } from '#lib/catalog/readable/the-merchant-of-venice/design.ts';
import { design as donQuixoteDesign } from '#lib/catalog/readable/don-quixote/design.ts';
import { design as gulliversTravelsDesign } from '#lib/catalog/readable/gullivers-travels/design.ts';
import { design as sirGawainDesign } from '#lib/catalog/readable/sir-gawain-and-the-green-knight/design.ts';
import { design as theOldManAndTheSeaDesign } from '#lib/catalog/readable/the-old-man-and-the-sea/design.ts';
import { design as yourLaughterDesign } from '#lib/catalog/readable/your-laughter/design.ts';
import { design as lifeOfPiDesign } from '#lib/catalog/readable/life-of-pi/design.ts';
import { design as odeOnAGrecianUrnDesign } from '#lib/catalog/readable/ode-on-a-grecian-urn/design.ts';
import { design as oedipusRexDesign } from '#lib/catalog/readable/oedipus-rex/design.ts';

/**
 * Isolated per-Readable-Volume packages. Each entry owns its own `design.ts`
 * (loaded eagerly for 3D Bookcase spines/covers) and lazy `content.ts` (code-split
 * per Volume so full literary texts are only downloaded when opened).
 */
export const READABLE_VOLUMES: Readonly<Record<string, ReadableVolumePackage>> = {
	'the-odyssey': {
		design: theOdysseyDesign,
		loadContent: () => import('#lib/catalog/readable/the-odyssey/content.ts').then((m) => m.content)
	},
	'the-road-not-taken': {
		design: theRoadNotTakenDesign,
		loadContent: () =>
			import('#lib/catalog/readable/the-road-not-taken/content.ts').then((m) => m.content)
	},
	ilustrado: {
		design: ilustradoDesign,
		loadContent: () => import('#lib/catalog/readable/ilustrado/content.ts').then((m) => m.content)
	},
	'the-color-purple': {
		design: theColorPurpleDesign,
		loadContent: () =>
			import('#lib/catalog/readable/the-color-purple/content.ts').then((m) => m.content)
	},
	'the-merchant-of-venice': {
		design: theMerchantOfVeniceDesign,
		loadContent: () =>
			import('#lib/catalog/readable/the-merchant-of-venice/content.ts').then((m) => m.content)
	},
	'don-quixote': {
		design: donQuixoteDesign,
		loadContent: () => import('#lib/catalog/readable/don-quixote/content.ts').then((m) => m.content)
	},
	'gullivers-travels': {
		design: gulliversTravelsDesign,
		loadContent: () =>
			import('#lib/catalog/readable/gullivers-travels/content.ts').then((m) => m.content)
	},
	'sir-gawain-and-the-green-knight': {
		design: sirGawainDesign,
		loadContent: () =>
			import('#lib/catalog/readable/sir-gawain-and-the-green-knight/content.ts').then(
				(m) => m.content
			)
	},
	'the-old-man-and-the-sea': {
		design: theOldManAndTheSeaDesign,
		loadContent: () =>
			import('#lib/catalog/readable/the-old-man-and-the-sea/content.ts').then((m) => m.content)
	},
	'your-laughter': {
		design: yourLaughterDesign,
		loadContent: () =>
			import('#lib/catalog/readable/your-laughter/content.ts').then((m) => m.content)
	},
	'life-of-pi': {
		design: lifeOfPiDesign,
		loadContent: () => import('#lib/catalog/readable/life-of-pi/content.ts').then((m) => m.content)
	},
	'ode-on-a-grecian-urn': {
		design: odeOnAGrecianUrnDesign,
		loadContent: () =>
			import('#lib/catalog/readable/ode-on-a-grecian-urn/content.ts').then((m) => m.content)
	},
	'oedipus-rex': {
		design: oedipusRexDesign,
		loadContent: () => import('#lib/catalog/readable/oedipus-rex/content.ts').then((m) => m.content)
	}
};

const contentCache = new Map<string, VolumeContent>();
const pendingLoads = new Map<string, Promise<VolumeContent | undefined>>();

export function getReadableVolumePackage(volumeId: string): ReadableVolumePackage | undefined {
	return READABLE_VOLUMES[volumeId];
}

export function getLoadedVolumeContent(volumeId: string): VolumeContent | undefined {
	return contentCache.get(volumeId);
}

export function loadVolumeContent(volumeId: string): Promise<VolumeContent | undefined> {
	const cached = contentCache.get(volumeId);
	if (cached) return Promise.resolve(cached);

	const inFlight = pendingLoads.get(volumeId);
	if (inFlight) return inFlight;

	const pkg = READABLE_VOLUMES[volumeId];
	if (!pkg) return Promise.resolve(undefined);

	const promise = pkg
		.loadContent()
		.then((content) => {
			contentCache.set(volumeId, content);
			pendingLoads.delete(volumeId);
			return content;
		})
		.catch((error) => {
			pendingLoads.delete(volumeId);
			throw error;
		});

	pendingLoads.set(volumeId, promise);
	return promise;
}
