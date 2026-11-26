---
name: volume-explore
description: Read-only exploration of Stoa's Readable Volume architecture, file layout, and rendering pipeline. Use when a teammate asks what, where, or how questions about their assigned volume.
---

# Explore Stoa's Volume Architecture

Answer codebase and architecture questions accurately without modifying files. Always use canonical terms from `GLOSSARY.md` (`Bookcase`, `Shelf`, `Catalog`, `Volume`, `Readable Volume`, `Placeholder Volume`, `Binding Style`, `Peek`, `Chapter`, `Leaf`, `Page`, `Spread`, `Shelf Mode`, `Inspect Mode`, `Reading Mode`).

## Architecture Map

| Layer | Directory | Responsibility | Pure TS? |
| --- | --- | --- | --- |
| **Catalog & Readable Volumes** | `src/lib/catalog/` | `Bookcase` dimensions, `Shelf` layout, `CATALOG` entries (`volumes.ts`), deterministic pagination (`reading.ts`), and per-volume packages under `src/lib/catalog/readable/<volume-id>/`. | Yes (no Three, Svelte, Threlte, or DOM imports) |
| **Physics** | `src/lib/physics/` | Camera gestures, `Peek`, `Inspect Mode` orbit, `Leaf` turn spring, and `Shelf` domino tilt. | Yes |
| **Procedural Textures** | `src/lib/textures/` | 2D Canvas & PBR maps: `volume-finishes.ts` (leather/cloth/vellum grain), `volume-stamp.ts` (cover & spine gold/blind foil), `reading-page-texture.ts` (endpapers, bookplate, title page, prose/verse/plates), `brand-mark.ts` (Stoa vector paths). | Browser/Three |
| **3D Scene & UI** | `src/lib/components/scene/` & `src/lib/components/ui/` | Threlte 8 components (`Volume.svelte`, `OpenVolume.svelte`, `volume-stamp-geometry.ts`) and Tailwind overlays. | Svelte 5 / Threlte |
| **Static Assets** | `static/volumes/<volume-id>/` | Local images for cover artwork, endpaper textures, and interior illustration plates. | Static files |

## How a Readable Volume Flows End-to-End

1. `src/lib/catalog/readable/<volume-id>/design.ts` exports `design: VolumeDesign`.
2. `src/lib/catalog/readable/<volume-id>/content.ts` exports `content: VolumeContent`.
3. `src/lib/catalog/readable/index.ts` registers both in `READABLE_VOLUMES[<volume-id>]`.
4. `src/lib/catalog/volumes.ts` merges `design` (and metadata overrides) onto the `Readable Volume` while retaining `shelfIndex`, `dimensions`, `clayTone`, and `placement`. `Placeholder Volumes` stay 100% procedural.
5. **Closed Volume (`Shelf Mode` & `Inspect Mode`)**: `volume-finishes.ts` generates binding grain/roughness/bump; `volume-stamp.ts` paints the front, back, and spine foil/blind channels; `volume-stamp-geometry.ts` composites optional `coverArtwork` and foil shaders onto the 3D meshes.
6. **Open Volume (`Reading Mode`)**: `reading.ts` deterministically paginates `content.sections` into fixed-layout `Pages` and `Spreads`; `reading-page-texture.ts` paints the front endpaper (with the pasted-in Stoa *Ex Libris* Bookplate), title page, chapters, illustration plates, and colophon.

## Useful Lookups

- Check neighbor `coverColor`s on the user's `Shelf`: read `src/lib/catalog/volumes.ts` and filter by `shelfIndex`.
- Check allowed palette keys: read `LOOKDEV_PALETTE.volumes` in `src/lib/catalog/lookdev.ts`.
- Check all `VolumeDesign` and `VolumeContent` fields: read `src/lib/catalog/readable/types.ts`.
- Check structural invariants and automated checks: read `src/lib/catalog/invariants.test.ts` and `src/lib/catalog/readable/readable.test.ts`.
