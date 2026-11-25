# Stoa

A static, browser-only 3D library web app where readers browse a warm wooden bookcase, pull down classic literature (starting with *The Odyssey*), inspect closed volumes, and read directly on bending 3D pages.

## Stack & Environment

- **Package manager**: Use `pnpm` (`npm` is not on PATH in this environment). Verify changes with `pnpm check` and `pnpm build`.
- **Framework**: SvelteKit 3 + Svelte 5 (runes mode enforced in `vite.config.ts`) + TypeScript + Tailwind CSS 4 + `@sveltejs/adapter-static` (`prerender = true`, `ssr = false` in `src/routes/+layout.ts`). Import shared modules via `#lib/*`.
- **3D Engine**: Threlte 8 (`@threlte/core`, `@threlte/extras`) + Three.js. All 3D geometry and page textures are procedural in code; keep the app self-contained with zero external 3D software or runtime backend calls.

## Docs

- [`GLOSSARY.md`](./GLOSSARY.md) — Read before naming types, components, states, or UI copy. Use the canonical terms (`Bookcase`, `Shelf`, `Catalog`, `Volume`, `Readable Volume`, `Placeholder Volume`, `Binding Style`, `Peek`, `Chapter`, `Leaf`, `Page`, `Spread`, `Bookmark Ribbon`, `Shelf Mode`, `Inspect Mode`, `Reading Mode`) consistently across code and conversation.
- [`CODING_STANDARD.md`](./CODING_STANDARD.md) — Read before creating files or writing 3D/Svelte code. Defines the layered `src/lib/` architecture, metric scale & pivot discipline, Clay-before-Lookdev workflow, and Svelte 5 / Threlte 8 conventions.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Branching and contribution rules (`dev/<name>`, `feat/<name>` for significant milestones, and never `codex/` or `claude` branch names).
- [`docs/adr/`](./docs/adr/) — Read before changing 3D asset workflows (`0001`), adding 2D reading fallbacks (`0002`), modifying page-turn physics (`0003`), altering pagination/mobile viewport layout (`0004`), changing unit scale or Clay-before-Lookdev (`0005`), or customizing `Volume` geometry (`0006`).

## Collaboration

- The maintainer is new to Svelte. When introducing Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`), Threlte lifecycle hooks, or SvelteKit conventions for the first time, add a brief, plain-English explanation of how they work.
- All reading progress and bookmarks persist locally in `localStorage`; keep the app 100% static and client-side.
