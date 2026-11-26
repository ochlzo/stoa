---
name: volume-verify
description: Verify a teammate's Readable Volume contribution against Stoa's scope rules, coding standards, automated tests, visual QC, and git/PR checklist.
---

# Verify & Ship a Readable Volume

Run every check below before committing or opening a PR. Fix all reported errors before re-running.

## Step 1 — Scope & Branch Audit

1. Check the active branch (`git branch --show-current`):
   - Must be `dev/<name>` (never `main`, never a `codex/` or `claude` branch name).
2. Check `git status --short`:
   - Modified/added files must be **only** inside:
     - `src/lib/catalog/readable/<volume-id>/`
     - `static/volumes/<volume-id>/`
   - If any core file (`src/lib/catalog/volumes.ts`, `src/lib/physics/*`, `src/lib/components/*`, or another teammate's `<volume-id>`) was touched accidentally, revert it before continuing.

## Step 2 — Standards & Asset Check

- **Imports**: Every internal import uses `#lib/*` with an explicit `.ts` extension.
- **Pure-TS Layer**: `design.ts` and `content.ts` contain zero imports from `three`, `svelte`, `@threlte/*`, `#lib/components/*`, or `#lib/state/*`.
- **No external URLs**: All image paths in `design.ts` and `content.ts` point to local files under `static/volumes/<volume-id>/`.
- **Image budget**: Each image in `static/volumes/<volume-id>/` is `.webp`, `.png`, or `.jpg`, `<= 1200px` wide and `<= 400 KB`.

## Step 3 — Run `pnpm verify`

Execute the full verification pipeline (always use `pnpm`; `npm` is not on PATH):

```powershell
pnpm verify
```

This runs `pnpm check && pnpm lint && pnpm test && pnpm build`.

### Troubleshooting Common Failures

- **`assigns different cover colors to neighboring Volumes on every Shelf`** (`invariants.test.ts`):
  Your `coverColor` matches an immediate neighbor on the same `Shelf`. Pick a different key from `LOOKDEV_PALETTE.volumes` in `design.ts`.
- **`use-lib-subpath-imports` / `pure-ts-layer`** (`pnpm lint`):
  Replace relative imports (`../types`) with `#lib/catalog/readable/types.ts` and remove any Three/Svelte/DOM imports.
- **`noUnusedLocals` / `noUnusedParameters`** (`pnpm check`):
  Remove unused variables, imports, or callback parameters (prefix intentionally unused params with `_` if needed).
- **Pagination / folio test failures** (`readable.test.ts`):
  Ensure every `prose` section has non-empty paragraphs and every `verse` section has non-empty stanzas.

## Step 4 — Visual Spot-Check (`pnpm dev`)

Open the app locally and inspect your `Readable Volume` across all three modes:

1. **`Shelf Mode`**: Spine title, author, Stoa foot combination mark, and `coverColor` contrast cleanly against neighbors.
2. **`Inspect Mode`**: Front cover, back cover (source attribution), spine, and headband look clean at close range; check `?clay=1` if you changed binding/spine profile.
3. **`Reading Mode`**: Spread 0 shows your endpaper + pasted-in Stoa *Ex Libris* Bookplate on the left and the Title Page (with source attribution) on the right; turn through prose, verse, and illustration plates to confirm layout and legibility.

## Completion Criterion

- `pnpm verify` exits `0` with zero errors/warnings.
- `git status` shows only files inside your `<volume-id>` scope.
- Commit cleanly on `dev/<name>`, push (`git push -u origin dev/<name>`), and open a PR into `main` using `../pr/SKILL.md` (`/pr`).
