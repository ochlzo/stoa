# Contributing to Stoa

Thanks for contributing to **Stoa**! Please follow the branching conventions, coding standards, and verification steps below.

---

## Branching Rules

1. **Personal development branches (`dev/`):** Every contributor works on their own branch prefixed with `dev/` (for example, `dev/cholo`).
2. **Significant feature branches (`feat/`):** When a change or milestone is significant enough to deserve its own dedicated branch, push it to a separate branch prefixed with `feat/` (for example, `feat/shelf-mode-clay-pass`).
3. **No agent-branded branch names:** Never create or push branches containing `codex/` or `claude` (or similar AI tool prefixes).

---

## Standards & Architecture

Before writing code or naming new concepts, read:

- [`GLOSSARY.md`](./GLOSSARY.md) — Canonical domain terms (`Bookcase`, `Shelf`, `Catalog`, `Volume`, `Readable Volume`, `Placeholder Volume`, `Binding Style`, `Peek`, etc.).
- [`CODING_STANDARD.md`](./CODING_STANDARD.md) — Layered `src/lib/` architecture, metric scale (`1 unit = 1 meter`), pivot discipline, and the Clay-before-Lookdev workflow.
- [`docs/adr/`](./docs/adr/) — Accepted architectural decisions (`0001`–`0006`).

---

## Verification

Use `pnpm` for all commands. Before opening a pull request or pushing a milestone:

1. Run `pnpm check` and `pnpm build` and ensure both pass with zero errors.
2. Visually verify any 3D scene or UI changes in the browser via `pnpm dev`.
