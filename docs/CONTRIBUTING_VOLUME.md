# Contributing a `Readable Volume` to Stoa

This is the single source of truth for adding literary text, illustrations, and cover/binding design to your assigned `Readable Volume` in Stoa.

## 1. Assigned `Readable Volume` Slots

Edit **only** the files inside your own `src/lib/catalog/readable/<volume-id>/` folder (and optional images inside `static/volumes/<volume-id>/`). Do **not** edit `src/lib/catalog/volumes.ts` or any other teammate’s folder—this guarantees zero merge conflicts across parallel `dev/<name>` branches.

| Contributor | Title | Author | `Shelf` | Folder | Static Images Folder |
| --- | --- | --- | --- | --- | --- |
| Bone | *Ode on a Grecian Urn* | John Keats | 3 | `src/lib/catalog/readable/ode-on-a-grecian-urn/` | `static/volumes/ode-on-a-grecian-urn/` |
| Omadto | *The Color Purple* | Alice Walker | 1 | `src/lib/catalog/readable/the-color-purple/` | `static/volumes/the-color-purple/` |
| Licup | *Sir Gawain and the Green Knight* | Anonymous | 2 | `src/lib/catalog/readable/sir-gawain-and-the-green-knight/` | `static/volumes/sir-gawain-and-the-green-knight/` |
| Nedia | *Oedipus Rex* | Sophocles | 4 | `src/lib/catalog/readable/oedipus-rex/` | `static/volumes/oedipus-rex/` |
| Alcovindas | *Ilustrado* | Miguel Syjuco | 0 | `src/lib/catalog/readable/ilustrado/` | `static/volumes/ilustrado/` |
| Belgica | *Your Laughter* | Pablo Neruda | 2 | `src/lib/catalog/readable/your-laughter/` | `static/volumes/your-laughter/` |
| Burac | *The Road Not Taken* | Robert Frost | 0 | `src/lib/catalog/readable/the-road-not-taken/` | `static/volumes/the-road-not-taken/` |
| Briongos | *Gulliver's Travels* | Jonathan Swift | 1 | `src/lib/catalog/readable/gullivers-travels/` | `static/volumes/gullivers-travels/` |

## 2. Git Setup & Branching Workflow

1. Pull the latest `main` and install dependencies:
   ```bash
   git checkout main && git pull origin main
   pnpm install
   pnpm setup:hooks
   ```
2. Create or switch to your personal branch (never push directly to `main`, and never use `codex/` or `claude` in branch names):
   ```bash
   git checkout -b dev/<yourname>
   ```
3. Preview your `Volume` locally at any time with:
   ```bash
   pnpm dev
   ```

## 3. Customizing Your `Volume` Design (`design.ts`)

Every `Volume` uses Stoa’s shared parametric 3D kit (ADR `0006`). You customize its look purely through data in `src/lib/catalog/readable/<volume-id>/design.ts`:

```ts
import type { VolumeDesign } from '#lib/catalog/readable/types.ts';

export const design: VolumeDesign = {
	bindingStyle: 'quarter-vellum',
	spineProfile: 'shallow',
	coverColor: 'plumLeather',
	foilStyle: 'gold',
	emblem: 'urn',
	editionLine: 'STOA LIBRARY EDITION',
	endpaperColors: ['plumLeather', 'ochreLinen', 'oliveCloth']
};
```

### Allowed Options

- **`bindingStyle`**: `'raised-band-leather'` | `'linen-cloth'` | `'quarter-vellum'` | `'blind-tooled-calf'`
- **`spineProfile`**: `'rounded'` | `'shallow'` | `'flat'`
- **`coverColor`** (restricted to `LOOKDEV_PALETTE.volumes` in `src/lib/catalog/lookdev.ts`):
  `'oxblood'` | `'forestGreen'` | `'navyCloth'` | `'ochreLinen'` | `'agedVellum'` | `'umberCalf'` | `'slateBlue'` | `'plumLeather'` | `'oliveCloth'`
  - *Constraint:* Neighboring `Volumes` on the same `Shelf` cannot share the exact same `coverColor` (enforced automatically by `pnpm test`).
- **`foilStyle`**: `'gold'` (metallic gold leaf) | `'blind'` (recessed blind tooling)
- **`emblem`**:
  - Built-in classical presets: `'compass'` | `'lozenge'` | `'wreath'` | `'fleuron'` | `'urn'` | `'knot'` | `'crown'` | `'ship'` | `'quill'` | `'laurel'` | `'none'`
  - Or a custom single-color SVG path rendered in real foil / blind tooling:
    ```ts
    emblem: {
    	svgPath: 'M50 12 L62 42 L92 42 L68 60 L77 90 L50 72 L23 90 L32 60 L8 42 L38 42 Z',
    	viewBoxSize: 100
    }
    ```
- **`editionLine`** (optional): Short imprint stamped near the foot of the front/back cover and title `Page`.
- **`endpaperColors`** (optional): Tuple of 3 `LOOKDEV_PALETTE.volumes` color keys for the marbled endpaper veins in `Reading Mode`.

## 4. Adding Literary Content (`content.ts`)

Add your work’s text and optional illustrations in `src/lib/catalog/readable/<volume-id>/content.ts`. Stoa deterministically paginates every section into fixed-layout `Pages` and `Spreads` (ADR `0004`).

```ts
import type { VolumeContent } from '#lib/catalog/readable/types.ts';

export const content: VolumeContent = {
	subtitle: 'Optional subtitle',
	translator: 'Optional translator name',
	sourceNote: 'Public domain text via Project Gutenberg',
	sections: [
		{
			kind: 'verse',
			title: 'Ode on a Grecian Urn',
			stanzas: [
				[
					'Thou still unravish’d bride of quietness,',
					'Thou foster-child of silence and slow time,'
				]
			]
		},
		{
			kind: 'prose',
			title: 'Chapter I',
			epigraph: 'Optional epigraph in italics',
			paragraphs: [
				'First paragraph of prose...',
				'Second paragraph of prose...'
			]
		},
		{
			kind: 'illustration',
			title: 'Plate I',
			src: 'volumes/ode-on-a-grecian-urn/urn-plate.webp',
			caption: 'Attic red-figure amphora'
		}
	]
};
```

### Content & Image Rules

- **Pure TypeScript only:** Never import Three.js, Svelte, `@threlte/*`, or browser DOM APIs inside `src/lib/catalog/readable/`.
- **Imports:** Always use `#lib/*` subpath imports with explicit `.ts` extensions.
- **Sourcing:** Prefer verified public-domain editions (Project Gutenberg, Standard Ebooks, Wikisource) and include `translator` and `sourceNote` when applicable. For copyrighted works, use approved class excerpts or summaries as instructed by your course.
- **Interior `Page` illustrations:**
  - Place files inside `static/volumes/<volume-id>/` (never use external hotlinked URLs).
  - Reference them via relative path (`'volumes/<volume-id>/filename.webp'`).
  - Keep files lightweight: `.webp`, `.png`, or `.jpg`, at most `1200px` wide and `<= 400 KB`.
  - Illustrations are automatically composited onto the archival rag paper with a warm printed blend.

## 5. Verification Before Pushing

Run the full verification suite and make sure every check passes with zero errors:

```bash
pnpm verify
```

This runs:
1. `pnpm check` — TypeScript + Svelte type check (`0 errors, 0 warnings`)
2. `pnpm lint` — Architecture & pure-TS layer rules (`0 violations`)
3. `pnpm test` — `Bookcase`, `Catalog`, neighbor cover-color contrast, and deterministic pagination tests
4. `pnpm build` — Static production build (`@sveltejs/adapter-static`)

Then commit your changes and push your branch:

```bash
git add src/lib/catalog/readable/<volume-id> static/volumes/<volume-id>
git commit -m "feat(catalog): add design and content for <Title>"
git push -u origin dev/<yourname>
```
