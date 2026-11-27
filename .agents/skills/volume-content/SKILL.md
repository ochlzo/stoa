---
name: volume-content
description: Author and structure a Readable Volume's metadata, source attribution, literary text (prose/verse), and interior illustration plates in content.ts.
---

# Author Literary Content (`content.ts`)

Populate a teammate's assigned `<volume-id>` in `src/lib/catalog/readable/<volume-id>/content.ts` and optional interior plate images in `static/volumes/<volume-id>/`.

## Step 1 — Inspect Current Package

1. Read `src/lib/catalog/readable/<volume-id>/content.ts` and `src/lib/catalog/readable/types.ts`.
2. Confirm the work's sourcing: prefer verified public-domain editions (Project Gutenberg, Standard Ebooks, Wikisource) with accurate attribution. For copyrighted works, use approved class excerpts or summaries as instructed by your course.

## Step 2 — Edit `content.ts`

Keep `content.ts` pure TypeScript with `#lib/*` imports and explicit `.ts` extensions (`import type { VolumeContent } from '#lib/catalog/readable/types.ts';`). Never import Three.js, Svelte, `@threlte/*`, or browser DOM APIs.

### Metadata & Attribution Fields

- **`title`** *(optional override)*: Freely customize the displayed `Volume` title without touching `volumes.ts`.
- **`author`** *(optional override)*: Freely customize the displayed author name without touching `volumes.ts`.
- **`subtitle`** *(optional)*: Rendered below the title on the 1st `Page` (Front Title Page).
- **`translator`** *(optional)*: Rendered as `"Translated by ..."` on the 1st `Page`.
- **`sourceNote`** *(recommended)*: Edition / source attribution (e.g. `"Translated by Samuel Butler — Project Gutenberg"`). Displayed on the 1st `Page`, the back cover imprint, and the closing Colophon `Page`.
- **`colophonNote`** *(optional)*: Custom closing note on the final `Page` (falls back to `sourceNote`).

### Literary Sections (`sections: readonly VolumeContentSection[]`)

Stoa deterministically paginates every section into fixed-layout `Pages` and even `Spreads` (ADR `0004`). Leave `sections: []` only as a temporary stub (which renders the type specimen fallback).

1. **Prose (`kind: 'prose'`)**:
   ```ts
   {
   	kind: 'prose',
   	title: 'Book I — Athena Inspires the Prince',
   	epigraph: 'Optional italic epigraph',
   	paragraphs: [
   		'First paragraph of prose...',
   		'Second paragraph of prose...'
   	]
   }
   ```
2. **Verse (`kind: 'verse'`)** — preserves every line break and stanza gap verbatim:
   ```ts
   {
   	kind: 'verse',
   	title: 'Ode on a Grecian Urn',
   	epigraph: 'Optional italic epigraph',
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
   }
   ```
3. **Illustration Plate (`kind: 'illustration'`)** — full-page archival framed plate composited onto rag paper (supports optional `motion` sprite sheet):
   ```ts
   {
   	kind: 'illustration',
   	title: 'Plate I',
   	src: 'volumes/<volume-id>/plate-1.webp',
   	caption: 'Optional italic caption below the plate frame'
   }
   ```

### Illustrated Stanzas (`illustratedStanzas`)

For short illustrated poems where each stanza faces a full-bleed illustration on its own `Spread` without chapters, use `illustratedStanzas` instead of `sections` (see `ode-on-a-grecian-urn/content.ts`):

```ts
export const content: VolumeContent = {
	title: '...',
	author: '...',
	sourceNote: '...',
	illustratedStanzas: [
		{
			illustrationSrc: 'volumes/<volume-id>/stanza-1.webp',
			motion: {
				src: 'volumes/<volume-id>/stanza-1-motion.webp',
				origin: [146, 418],
				columns: 2,
				frameCount: 12,
				framesPerSecond: 8
			},
			lines: ['First line...', 'Second line...']
		}
	]
};
```

Sprite-sheet `motion` automatically respects `prefers-reduced-motion: reduce` (skipping motion downloads and rendering the still illustration).

### Interior Image Rules

- Place files inside `static/volumes/<volume-id>/` and reference them as `'volumes/<volume-id>/filename.webp'` (no leading `static/`). Never place image files inside `src/lib/catalog/readable/<volume-id>/` (enforced by `pnpm lint` `volume-assets-in-static`).
- Never use external hotlinked URLs.
- Keep images `.webp`, `.png`, or `.jpg`, at most `1200px` wide and `<= 400 KB`.

## Step 3 — Verify

Proceed to `../volume-verify/SKILL.md` to check pagination invariants, pure-TS rules, and the full build.
