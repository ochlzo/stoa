# Stoa Coding Standard & Architecture

This document defines the module boundaries, 3D scene conventions, and Svelte 5 / Threlte 8 practices for Stoa. Follow [`GLOSSARY.md`](./GLOSSARY.md) for all domain names and [`docs/adr/`](./docs/adr/) for architectural constraints.

---

## 1. Layered Architecture

Keep pure data, math, procedural textures, reactive state, and 3D rendering in distinct layers under `src/lib/` (imported via `#lib/*`). Never combine geometry construction, layout math, texture painting, physics, and UI into a single component.

```text
src/lib/
├── catalog/            # Pure TS: Volume metadata, Binding Styles, Bookcase & Shelf layout math
├── physics/            # Pure TS: Spring-damper math, camera inertia/clamping, page-curl math
├── textures/           # Canvas 2D -> THREE.CanvasTexture generators (wood, spines, pages)
├── state/              # Svelte 5 runes (.svelte.ts): Scene mode, Peek target, localStorage persistence
└── components/
    ├── scene/          # Thin Threlte 8 3D components (Bookcase, Volume, ShelfCamera, Lights)
    └── ui/             # Minimal HTML/Tailwind overlays (Coming Soon cue, Reading Mode HUD)
```

### Dependency Rules

- **`catalog/` and `physics/` must stay pure TypeScript.** Do not import Svelte, Threlte, or DOM APIs here. They should be deterministic and directly unit-testable.
- **`textures/` depends only on Canvas 2D and Three.js.** Keep procedural surface generation isolated from scene components so typography and materials can be tuned independently.
- **`state/` owns scene transitions and persistence.** Express `Shelf Mode`, `Inspect Mode`, `Reading Mode`, and `Peek` state explicitly rather than scattering boolean flags across 3D components.
- **`components/scene/` are thin renderers.** Scene components read from `catalog/`, `physics/`, `textures/`, and `state/` and declare Threlte `<T.*>` meshes and groups; keep non-trivial math out of `.svelte` templates.

---

## 2. 3D Asset & Scene Conventions

### Real-World Metric Scale (`1 unit = 1 meter`)

- All coordinates, dimensions, and distances are in meters (see [ADR 0005](./docs/adr/0005-real-world-metric-scale-and-clay-before-lookdev.md)).
- Define shared physical constants (shelf height, board thickness, book clearance, default camera FOV/distance) in `src/lib/catalog/` rather than scattering magic numbers across components.

### Pivot & Placement Discipline

- **`Bookcase`**: Anchored consistently around a known origin so camera bounds can be computed directly from its dimensions.
- **`Volume`**: Local pivot sits flush at the bottom of the volume (so `y = 0` rests cleanly on the top surface of its `Shelf`) and aligned to the spine/back edge so `Peek` slide-outs, `Inspect Mode` pull-outs, and `Reading Mode` spine hinges behave predictably without floating or clipping.
- **Deterministic layout**: Shelf packing is computed from `Catalog` dimensions with explicit gaps/tolerances; never rely on unseeded `Math.random()` for book positions or sizes.

### Two-Pass Production Discipline (Clay → Lookdev)

1. **Clay / Geometry Pass**: Build and verify scale, silhouettes, pivots, camera framing, bounds, and interactions using neutral matte materials and simple neutral lighting.
2. **Lookdev & Lighting Pass**: Layer procedural wood/cloth/paper textures, warm library lighting, shadows, and atmospheric details only after geometry and feel are verified.

### Resource Cleanup

- Any manually constructed `THREE.BufferGeometry`, `THREE.Material`, or `THREE.CanvasTexture` created outside Threlte's automatic disposal must be disposed cleanly on teardown (`$effect` cleanup or `onDestroy`) to prevent WebGL memory leaks.

---

## 3. Svelte 5 & Threlte 8 Conventions

- **Runes mode only**: Use `$state`, `$derived`, `$effect`, and `$props` (never legacy `export let` or `$:` reactive statements).
- **Shared reactive state**: Put cross-component state in `.svelte.ts` modules under `src/lib/state/`.
- **Frame loop**: Drive continuous motion (camera inertia, spring `Peek`, dust motes, page curl) inside Threlte's `useTask((delta) => ...)` and always clamp `delta` (e.g., `Math.min(delta, 0.05)`) so tab switches never cause spring explosions.
- **Interactivity**: Enable `@threlte/extras` `interactivity()` once at the scene root; keep pointer handlers thin and guard tap/click gestures against drag-pan thresholds.

---

## 4. Naming & Domain Language

- Use canonical terms from [`GLOSSARY.md`](./GLOSSARY.md) in types, files, props, and UI copy: `Bookcase`, `Shelf`, `Catalog`, `Volume`, `Readable Volume`, `Placeholder Volume`, `Binding Style`, `Peek`, `Chapter`, `Leaf`, `Page`, `Spread`, `Bookmark Ribbon`, `Shelf Mode`, `Inspect Mode`, `Reading Mode`.
- Avoid the forbidden synonyms listed under `_Avoid_` in `GLOSSARY.md`.

---

## 5. Verification

Before considering any slice or ticket complete:

1. Run `pnpm verify` (`pnpm check && pnpm lint && pnpm test && pnpm build`) — all checks must pass with zero errors.
2. Visually inspect the running app (`pnpm dev`) in the browser to verify proportions, zero clipping/Z-fighting, camera framing, and interaction feel.
