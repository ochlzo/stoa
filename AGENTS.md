# Stoa

A static, browser-only 3D library web app where readers browse a warm wooden bookcase, pull down classic literature (starting with *The Odyssey*), inspect closed volumes, and read directly on bending 3D pages.

## Stack & Environment

- **Package manager**: Use `pnpm` (`npm` is not on PATH in this environment). Verify changes with `pnpm verify` (`pnpm check && pnpm lint && pnpm test && pnpm build`).
- **Framework**: SvelteKit 3 + Svelte 5 (runes mode enforced in `vite.config.ts`) + TypeScript + Tailwind CSS 4 + `@sveltejs/adapter-static` (`prerender = true`, `ssr = false` in `src/routes/+layout.ts`). Import shared modules via `#lib/*`.
- **3D Engine**: Threlte 8 (`@threlte/core`, `@threlte/extras`) + Three.js. All 3D geometry and page textures are procedural in code; keep the app self-contained with zero external 3D software or runtime backend calls.

## Docs

- [`GLOSSARY.md`](./GLOSSARY.md) — Read before naming types, components, states, or UI copy. Use the canonical terms (`Bookcase`, `Shelf`, `Catalog`, `Volume`, `Readable Volume`, `Placeholder Volume`, `Shelf Prop`, `Binding Style`, `Peek`, `Chapter`, `Leaf`, `Page`, `Spread`, `Bookmark Ribbon`, `Shelf Mode`, `Inspect Mode`, `Reading Mode`) consistently across code and conversation.
- [`CODING_STANDARD.md`](./CODING_STANDARD.md) — Read before creating files or writing 3D/Svelte code. Defines the layered `src/lib/` architecture, metric scale & pivot discipline, Clay-before-Lookdev workflow, and Svelte 5 / Threlte 8 conventions.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Branching and contribution rules (`dev/<name>`, `feat/<name>` for significant milestones, and never `codex/` or `claude` branch names).
- [`docs/CONTRIBUTING_VOLUME.md`](./docs/CONTRIBUTING_VOLUME.md) — Single source of truth for customizing a `Readable Volume` (`src/lib/catalog/readable/<volume-id>/design.ts`, `content.ts`, and optional `static/volumes/<volume-id>/` illustrations).
- [`docs/adr/`](./docs/adr/) — Read before changing 3D asset workflows (`0001`), adding 2D reading fallbacks (`0002`), modifying page-turn physics (`0003`), altering pagination/mobile viewport layout (`0004`), changing unit scale or Clay-before-Lookdev (`0005`), customizing `Volume` geometry (`0006`), or changing `Bookcase` framing, `Shelf Props`, or leaning-volume physics (`0007`).

## Collaboration

- The maintainer is new to Svelte. When introducing Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`), Threlte lifecycle hooks, or SvelteKit conventions for the first time, add a brief, plain-English explanation of how they work.
- All reading progress and bookmarks persist locally in `localStorage`; keep the app 100% static and client-side.

## Enforced Rules

| Rule | Enforced by |
| --- | --- |
| `#lib/*` imports with explicit extensions inside `src/lib/` | `pnpm lint` (`use-lib-subpath-imports`) + `pnpm check` |
| `src/lib/catalog/` & `src/lib/physics/` stay pure TS (no Three/Svelte/Threlte) | `pnpm lint` (`pure-ts-layer`) |
| `Readable Volume` images live in `static/volumes/<volume-id>/` (not `src/lib/catalog/readable/`) | `pnpm lint` (`volume-assets-in-static`) |
| Camera & scene wheel gesture math lives in `src/lib/physics/` | `pnpm lint` (`camera-gesture-math`, `scene-wheel-gesture-math`) |
| Manual `THREE.*Geometry`/`Material` live in `*-geometry.ts` with `dispose()` | `pnpm lint` (`scene-geometry-disposal`, `geometry-helper-dispose`) |
| `useTask()` clamps `delta` (e.g. `Math.min(delta, 0.05)`) | `pnpm lint` (`clamp-usetask-delta`) |
| Canonical `GLOSSARY.md` type names (`Volume`, not `VolumeEntry`) | `pnpm lint` (`glossary-canonical-names`) |
| No unused locals or parameters | `pnpm check` (`tsconfig.json`: `noUnusedLocals`, `noUnusedParameters`) |
| Exact `Volume` lean contact, flush `Shelf` resting, zero prop clipping/stack gaps | `pnpm test` (`src/lib/catalog/invariants.test.ts`) |
| No direct pushes to `main` | `.githooks/pre-push` |
