---
status: accepted
---

# Curated Framed Bookcase, Shelf Props, and Procedural Leaning Physics

Stoa uses a narrower, architectural `Bookcase` (~`1.25 m` inner width, 5 `Shelves`) framed against a room backdrop (wall, floor, and baseboard) rather than an edge-to-edge wall of 150+ filler books. Each `Shelf` holds an asymmetric cluster of ~12–15 registered `Catalog` `Volumes` (upright and leaning) balanced with non-interactive procedural `Shelf Props` (ceramics, bowls, framed prints, planters, bookends, sculptures, and decorative horizontal book stacks).

## Considered Options

- **Curated framed `Bookcase` + `Shelf Props` + lightweight procedural topple physics (chosen)**: Keeps the `Catalog` intentional (~12–15 iconic works), gives every `Shelf` an editorial, lived-in composition matching warm architectural bookcases, and allows a leaning neighbor resting on a `Readable Volume` to topple naturally on pull-out (and smoothly right itself on return) using lightweight angular physics in `src/lib/physics/` without adding a rigid-body engine.
- **Wide edge-to-edge `Bookcase` packed with 150+ `Placeholder Volumes`**: Avoids rendering a room backdrop, but dilutes the `Catalog` with repetitive filler spines and produces a rigid, uniform silhouette.
- **Full rigid-body physics engine (e.g., Rapier)**: Handles arbitrary collisions automatically, but adds significant bundle weight and nondeterministic jitter for an interaction that only needs deterministic tipping and settling.

## Consequences

- `Shelf Mode` camera bounds (Issue #4) frame the `Bookcase` with a controlled room-wall margin on desktop (primary vertical panning across `Shelves` with subtle horizontal give) and free horizontal/vertical panning on mobile, without ever exposing void beyond the room backdrop.
- `Shelf Props` are strictly non-interactive decorative geometry; `Volume` remains reserved for interactive `Catalog` books (`Readable Volume` and `Placeholder Volume`).
- Leaning `Placeholder Volumes` may rest directly against a `Readable Volume` (such as *The Odyssey*); during `Peek` they slide forward along `+Z` at their current tilt angle, and when the supporting `Readable Volume` is pulled into `Inspect Mode` (in a later milestone), lightweight procedural angular physics tips the neighbor onto the `Shelf`.
