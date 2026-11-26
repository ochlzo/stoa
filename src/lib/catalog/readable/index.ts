import type { ReadableVolumePackage } from '#lib/catalog/readable/types.ts';
import { design as theOdysseyDesign } from '#lib/catalog/readable/the-odyssey/design.ts';
import { content as theOdysseyContent } from '#lib/catalog/readable/the-odyssey/content.ts';
import { design as theRoadNotTakenDesign } from '#lib/catalog/readable/the-road-not-taken/design.ts';
import { content as theRoadNotTakenContent } from '#lib/catalog/readable/the-road-not-taken/content.ts';
import { design as ilustradoDesign } from '#lib/catalog/readable/ilustrado/design.ts';
import { content as ilustradoContent } from '#lib/catalog/readable/ilustrado/content.ts';
import { design as theColorPurpleDesign } from '#lib/catalog/readable/the-color-purple/design.ts';
import { content as theColorPurpleContent } from '#lib/catalog/readable/the-color-purple/content.ts';
import { design as donQuixoteDesign } from '#lib/catalog/readable/don-quixote/design.ts';
import { content as donQuixoteContent } from '#lib/catalog/readable/don-quixote/content.ts';
import { design as gulliversTravelsDesign } from '#lib/catalog/readable/gullivers-travels/design.ts';
import { content as gulliversTravelsContent } from '#lib/catalog/readable/gullivers-travels/content.ts';
import { design as sirGawainDesign } from '#lib/catalog/readable/sir-gawain-and-the-green-knight/design.ts';
import { content as sirGawainContent } from '#lib/catalog/readable/sir-gawain-and-the-green-knight/content.ts';
import { design as yourLaughterDesign } from '#lib/catalog/readable/your-laughter/design.ts';
import { content as yourLaughterContent } from '#lib/catalog/readable/your-laughter/content.ts';
import { design as odeOnAGrecianUrnDesign } from '#lib/catalog/readable/ode-on-a-grecian-urn/design.ts';
import { content as odeOnAGrecianUrnContent } from '#lib/catalog/readable/ode-on-a-grecian-urn/content.ts';
import { design as oedipusRexDesign } from '#lib/catalog/readable/oedipus-rex/design.ts';
import { content as oedipusRexContent } from '#lib/catalog/readable/oedipus-rex/content.ts';

/**
 * Isolated per-Readable-Volume packages. Each entry owns its own `design.ts`
 * and `content.ts` so parallel contributor branches never collide in `volumes.ts`.
 */
export const READABLE_VOLUMES: Readonly<Record<string, ReadableVolumePackage>> = {
	'the-odyssey': { design: theOdysseyDesign, content: theOdysseyContent },
	'the-road-not-taken': { design: theRoadNotTakenDesign, content: theRoadNotTakenContent },
	ilustrado: { design: ilustradoDesign, content: ilustradoContent },
	'the-color-purple': { design: theColorPurpleDesign, content: theColorPurpleContent },
	'don-quixote': { design: donQuixoteDesign, content: donQuixoteContent },
	'gullivers-travels': { design: gulliversTravelsDesign, content: gulliversTravelsContent },
	'sir-gawain-and-the-green-knight': { design: sirGawainDesign, content: sirGawainContent },
	'your-laughter': { design: yourLaughterDesign, content: yourLaughterContent },
	'ode-on-a-grecian-urn': { design: odeOnAGrecianUrnDesign, content: odeOnAGrecianUrnContent },
	'oedipus-rex': { design: oedipusRexDesign, content: oedipusRexContent }
};

export function getReadableVolumePackage(volumeId: string): ReadableVolumePackage | undefined {
	return READABLE_VOLUMES[volumeId];
}
