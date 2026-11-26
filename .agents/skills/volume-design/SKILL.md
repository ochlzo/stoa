---
name: volume-design
description: Design and implement a Readable Volume's visual appearance in design.ts (binding, surface finishes, cover artwork, foil/stamps, endpapers, and interior typography) using a structured grilling pass first.
---

# Design a Readable Volume (`design.ts`)

Customize the 3D exterior, endpapers, and interior page theme of a teammate's assigned `<volume-id>` in `src/lib/catalog/readable/<volume-id>/design.ts`.

## Aesthetic & Craft Direction

Stoa is a quiet, sunlit private study built around **tactile physical bookbinding craft** — antique private-press editions resting together on a warm walnut `Bookcase`. Guide every design choice toward that physical world:

- **Material honesty over digital sheen:** Treat covers as real cloth, pebbled goatskin, blind-tooled calfskin, or quarter vellum — matte to satin finishes with subtle tactile grain rather than plastic gloss or neon saturation.
- **Harmonious, aged pigments:** Every cover belongs to the same sunlit wooden shelf (`LOOKDEV_PALETTE.volumes`). Favor deep, weathered tones (oxblood, forest green, navy cloth, ochre linen, aged vellum, umber calf, slate blue, plum leather, olive cloth) paired with warm gold leaf, burnished copper/silver, or recessed blind tooling.
- **Classical restraint & negative space:** Let typography, fine rules, and a single crisp emblem or engraving breathe. Avoid cluttered modern paperback layouts, loud drop shadows, or harsh pure-black/pure-white digital contrast.
- **Archival print feel inside:** Endpapers feel like hand-combed marbled sheets, botanical woodblock prints, or fine laid paper framing the pasted-in Stoa *Ex Libris* Bookplate. Interior pages read like letterpress ink on warm cotton rag paper; cover artwork and plates should blend organically into the substrate like lithographs, etchings, or watercolor washes.

Every `Readable Volume` should express the distinct spirit of its literary work while still looking like it was bound and shelved in the same timeless library.

## Step 1 — Gather Facts & Grill Design Decisions

1. **Look up facts first** (never ask the user for repo facts):
   - Read `src/lib/catalog/readable/<volume-id>/design.ts` to see current defaults.
   - Read `src/lib/catalog/volumes.ts` to identify the `<volume-id>`'s `shelfIndex` and its immediate left/right neighbors' `coverColor`s (neighboring `Volumes` on the same `Shelf` cannot share the same `coverColor`).
   - Check `static/volumes/<volume-id>/` for any existing local images.
2. **Grill open design choices**:
   - If the user has not already specified their full visual direction, read and follow `../grilling/SKILL.md` (`/grilling`) to walk the **Volume Design Tree** in frontier rounds before writing code:
     1. **Binding & Silhouette**: `bindingStyle`, `spineProfile`, `coverColor` (excluding neighbor colors).
     2. **Surface & Foil**: `surfaceRoughness`, `bumpScale`, `foilStyle`, custom `foilColor`/`toolColor`/`headbandColor`, and whether to use `coverArtwork` images.
     3. **Cover & Spine Composition**: `coverBorder`, `emblem` (preset, custom `svgPath`, or `'none'`), `editionLine`, or custom 2D canvas painters (`paintFrontCover`, `paintBackCover`, `paintSpine`).
     4. **Endpapers & Bookplate**: `endpaperStyle`, `endpaperColors`, optional `endpaperTextureSrc` or `paintEndpaper`, and `showBookplate`.
     5. **Interior Paper & Typography**: default archival look vs custom `paperTint`, `inkColor`, `mutedInkColor`, `accentColor`, `fontFamily`.

## Step 2 — Implement `design.ts`

Edit only `src/lib/catalog/readable/<volume-id>/design.ts` (and optional images in `static/volumes/<volume-id>/`). Keep the file pure TypeScript with `#lib/*` imports and explicit `.ts` extensions (`import type { VolumeDesign } from '#lib/catalog/readable/types.ts';`).

### Complete `VolumeDesign` Surface (`src/lib/catalog/readable/types.ts`)

- **Binding & Surface Material**:
  - `bindingStyle`: `'raised-band-leather'` | `'linen-cloth'` | `'quarter-vellum'` | `'blind-tooled-calf'`
  - `spineProfile`: `'rounded'` | `'shallow'` | `'flat'`
  - `coverColor`: must be a key of `LOOKDEV_PALETTE.volumes` (`'oxblood'`, `'forestGreen'`, `'navyCloth'`, `'ochreLinen'`, `'agedVellum'`, `'umberCalf'`, `'slateBlue'`, `'plumLeather'`, `'oliveCloth'`) and differ from adjacent neighbors on the same `Shelf`.
  - `surfaceRoughness` (`0..1`), `bumpScale`, `foilStyle` (`'gold'` | `'blind'`), `foilColor` (hex), `toolColor` (hex), `headbandColor` (hex).
  - `coverArtwork`: `{ front?, back?, spine?, opacity? }` referencing relative paths under `static/`, e.g. `'volumes/<volume-id>/front-cover.webp'`.
- **Cover & Spine Stamping**:
  - `coverBorder`: `'double-rule'` | `'single-rule'` | `'corner-ornaments'` | `'none'`
  - `emblem`: `'compass'` | `'lozenge'` | `'wreath'` | `'fleuron'` | `'urn'` | `'knot'` | `'crown'` | `'ship'` | `'quill'` | `'laurel'` | `'none'` | `{ svgPath: string; viewBoxSize?: number }`
  - `editionLine`: short imprint string.
  - `paintFrontCover`, `paintBackCover`, `paintSpine`: `(ctx, info) => void` where `info` provides `{ width, height, title, author, foil, blind, defaultPaint }`. Use `info.foil` / `info.blind` channel colors so stamps inherit real PBR foil/tooling. Call `info.defaultPaint()` first to layer onto the default layout, or paint from scratch.
- **Endpapers & Bookplate**:
  - `endpaperStyle`: `'marbled'` | `'plain'` | `'ruled'` | `'botanical'` | `'custom'`
  - `endpaperColors`: tuple of 3 `LOOKDEV_PALETTE.volumes` keys.
  - `endpaperTextureSrc`: relative path under `static/volumes/<volume-id>/`.
  - `paintEndpaper`: `(ctx, info) => void` with `{ width, height, pageIndex, side, defaultPaint }`.
  - `showBookplate`: boolean (defaults to `true`; pastes the Stoa *Ex Libris* Bookplate onto the front endpaper).
- **Interior Paper & Typography**:
  - `paperTint`, `inkColor`, `mutedInkColor`, `accentColor` (hex strings), `fontFamily` (CSS font stack).

### Image Rules

- Store all images under `static/volumes/<volume-id>/` and reference them without `static/` (e.g. `'volumes/<volume-id>/cover.webp'`).
- Never use external URLs; keep files `.webp`, `.png`, or `.jpg`, at most `1200px` wide and `<= 400 KB`.

## Step 3 — Verify

Proceed to `../volume-verify/SKILL.md` to validate scope, neighbor colors, architecture lint, and build.
