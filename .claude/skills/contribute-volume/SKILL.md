---
name: contribute-volume
description: Master router skill for contributing a teammate's assigned Readable Volume in Stoa. Use when exploring how Readable Volumes work, designing covers/textures/endpapers, authoring literary content, or verifying a volume contribution.
---

# Contribute a Readable Volume

Master entry point for customizing an assigned `Readable Volume` in Stoa. Keep every edit strictly scoped to the user's single `<volume-id>`.

## Step 1 — Establish Scope & Branch

1. Read `docs/CONTRIBUTING_VOLUME.md` to confirm the user's assigned `<volume-id>` and verify they are on their own `dev/<name>` branch (never `main`, and never a `codex/` or `claude` branch name).
2. Lock all edits to these paths only:
   - `src/lib/catalog/readable/<volume-id>/design.ts`
   - `src/lib/catalog/readable/<volume-id>/content.ts`
   - `static/volumes/<volume-id>/` (optional local images only)
3. Never edit `src/lib/catalog/volumes.ts`, `Placeholder Volumes`, `src/lib/physics/`, or another teammate's `<volume-id>` folder.

## Step 2 — Route by Request Type

Read the matching operational skill(s) before answering or editing:

- **Code exploration ("what / where / how does X work?")** → Read `volume-explore/SKILL.md`. Stay read-only; do not edit files.
- **Visual design (covers, spines, finishes, artwork, endpapers, typography)** → Read `volume-design/SKILL.md` (which uses `grilling/SKILL.md` to settle open design choices before coding).
- **Literary content & metadata (title, author, source attribution, prose, verse, illustration plates)** → Read `volume-content/SKILL.md`.
- **Verification, troubleshooting, or PR prep** → Read `volume-verify/SKILL.md`.

If a task spans both design and content, run `volume-design` and `volume-content` in sequence, then finish with `volume-verify`.

## Completion Criterion

- For exploration: the user's question is answered with exact repo paths and canonical `GLOSSARY.md` terms.
- For coding tasks: `volume-verify` passes with `pnpm verify` green and `git status` showing changes only inside the user's `<volume-id>` scope.
