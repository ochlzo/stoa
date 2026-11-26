---
status: accepted
---

# Curated Framed Bookcase, Shelf Props, and Procedural Leaning Physics

Stoa uses a narrower, architectural `Bookcase` (~`1.25 m` inner width, 5 `Shelves`) framed against a room backdrop (wall, floor, and baseboard) rather than an edge-to-edge wall of 150+ filler books. Each `Shelf` holds asymmetric clusters of registered `Catalog` `Volumes` (~7–11 per `Shelf`, ~45 total; upright and leaning, with varied heights, spine widths, spine profiles, and clay tones so no two neighbors read alike) balanced with non-interactive procedural `Shelf Props` (ceramics, bowls, framed prints, planters, bookends, sculptures, and decorative horizontal book stacks).

## Considered Options

- **Curated framed `Bookcase` + `Shelf Props` + lightweight procedural topple physics (chosen)**: Keeps the `Catalog` intentional (~45 curated classics, not generic filler), gives every `Shelf` an editorial, lived-in composition matching warm architectural bookcases, and allows a leaning neighbor resting on a `Readable Volume` to topple naturally on pull-out (and smoothly right itself on return) using lightweight angular physics in `src/lib/physics/` without adding a rigid-body engine.
- **Wide edge-to-edge `Bookcase` packed with 150+ `Placeholder Volumes`**: Avoids rendering a room backdrop, but dilutes the `Catalog` with repetitive filler spines and produces a rigid, uniform silhouette.
- **Full rigid-body physics engine (e.g., Rapier)**: Handles arbitrary collisions automatically, but adds significant bundle weight and nondeterministic jitter for an interaction that only needs deterministic tipping and settling.

## Consequences

- `Shelf Mode` camera bounds (Issue #4) frame the `Bookcase` with a controlled room-wall margin on desktop (primary vertical panning across `Shelves` with subtle horizontal give) and free horizontal/vertical panning on mobile, without ever exposing void beyond the room backdrop.
- `Shelf Props` are strictly non-interactive decorative geometry; `Volume` remains reserved for interactive `Catalog` books (`Readable Volume` and `Placeholder Volume`).
- Leaning and upright `Volumes` on the active `Shelf` participate in a deterministic, pure-TypeScript 2D shelf-plane multi-body solver (`src/lib/physics/shelf-domino.ts`) with real dimension-derived mass, rotational inertia, floor/cover friction, and SAT contact resolution. During `Peek`, `Volumes` slide forward along `+Z` at their resting tilt; when a `Volume` is pulled into `Inspect Mode`, any leaning cluster presses through intermediate upright neighbors in a natural domino chain (and in all-upright rows, the heavier adjacent neighbor gently tips into the gap until caught), then every displaced `Volume` smoothly rights itself back to its exact resting slot on return.
