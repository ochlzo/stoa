---
name: contribute-volume
description: Customize a teammate's assigned Readable Volume (design.ts, content.ts, and optional static page illustrations) in Stoa following project conventions.
---

# Contribute a Readable Volume

Before making any edits, read `docs/CONTRIBUTING_VOLUME.md` completely—it is the single source of truth for teammate slot assignments, allowed `VolumeDesign` options, `VolumeContent` schema (prose, verse, and illustration plates), image rules, and git workflow.

## Procedure

1. Read `docs/CONTRIBUTING_VOLUME.md` and identify the user's assigned `<volume-id>`.
2. Confirm the user is on their own `dev/<name>` branch (never `main`, and never a `codex/` or `claude` branch name).
3. Edit **only** files inside:
   - `src/lib/catalog/readable/<volume-id>/design.ts`
   - `src/lib/catalog/readable/<volume-id>/content.ts`
   - `static/volumes/<volume-id>/` (optional local illustrations only; no external URLs)
4. Keep `design.ts` and `content.ts` pure TypeScript with `#lib/*` imports and explicit `.ts` extensions, using only `LOOKDEV_PALETTE.volumes` keys for `coverColor` and `endpaperColors`.
5. Run `pnpm verify` and fix any errors (including neighbor `coverColor` collisions caught by `pnpm test`) before finishing.
