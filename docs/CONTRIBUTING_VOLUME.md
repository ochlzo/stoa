# Contributing a Readable Volume

Each teammate owns one isolated `Readable Volume` slot in Stoa's 3D `Bookcase`. You customize your book's cover, textures, endpapers, metadata, literary text, and illustrations **without touching shared scene or catalog code**, while `Placeholder Volumes` remain 100% procedural.

## 1. Teammate Assignments

| Classmate | Work | Author | `<volume-id>` | Shelf Location |
| --- | --- | --- | --- | --- |
| **Maintainer** | *The Odyssey* | Homer | `the-odyssey` | Shelf 2 (Left) |
| **Burac** | *The Road Not Taken* | Robert Frost | `the-road-not-taken` | Shelf 0 (Left) |
| **Alcovindas** | *Ilustrado* | Miguel Syjuco | `ilustrado` | Shelf 0 (Right) |
| **Omadto** | *The Color Purple* | Alice Walker | `the-color-purple` | Shelf 1 (Left) |
| **Chenie** | *The Merchant of Venice* | William Shakespeare | `the-merchant-of-venice` | Shelf 1 (Left) |
| **Alvarez** | *Don Quixote* | Miguel de Cervantes | `don-quixote` | Shelf 1 (Right) |
| **Briongos** | *Gulliver's Travels* | Jonathan Swift | `gullivers-travels` | Shelf 1 (Right) |
| **Licup** | *Sir Gawain and the Green Knight* | Anonymous | `sir-gawain-and-the-green-knight` | Shelf 2 (Left) |
| **Belgica** | *Your Laughter* | Pablo Neruda | `your-laughter` | Shelf 2 (Right) |
| **Lutaro** | *Life of Pi* | Yann Martel | `life-of-pi` | Shelf 3 (Left) |
| **Bone** | *Ode on a Grecian Urn* | John Keats | `ode-on-a-grecian-urn` | Shelf 3 (Right, leaning) |
| **Nedia** | *Oedipus Rex* | Sophocles | `oedipus-rex` | Shelf 4 (Right) |

## 2. Your Owned Files

Only edit files inside these paths for your assigned `<volume-id>`:

- `src/lib/catalog/readable/<volume-id>/design.ts` — 3D binding, finishes, cover artwork, foil/stamps, endpapers, interior typography, and optional eager cover/spine metadata (`title`, `author`, `sourceNote`).
- `src/lib/catalog/readable/<volume-id>/content.ts` — Lazy-loaded `Reading Mode` metadata overrides, source attribution, literary text (`prose` / `verse`), and `illustration` plates.
- `static/volumes/<volume-id>/` — Optional local images (`.webp`, `.png`, `.jpg`, `<= 1200px`, `<= 400 KB`; never external URLs).

## 3. Agent Skill Toolkit

Stoa ships a project-level, agent-agnostic skill toolkit registered identically in `.agents/skills/` (Antigravity & Codex) and `.claude/skills/` (Claude Code).

Start by invoking **`/contribute-volume`** — it locks your agent to your assigned `<volume-id>` and routes your request to the right operational skill:

| Skill | Purpose | Path |
| --- | --- | --- |
| **`contribute-volume`** | **Master router** (`/contribute-volume`): confirms `<volume-id>` + branch, locks edit scope, and routes to the right skill. | [SKILL.md](../.agents/skills/contribute-volume/SKILL.md) |
| **`volume-explore`** | **Read-only exploration**: answers *"what / where / how"* questions about Stoa's architecture and rendering pipeline. | [SKILL.md](../.agents/skills/volume-explore/SKILL.md) |
| **`volume-design`** | **Visual design (`design.ts`)**: complete cover, spine, finish, artwork, endpaper, and typography guide (runs `grilling` first). | [SKILL.md](../.agents/skills/volume-design/SKILL.md) |
| **`grilling`** | **Design-tree interview** (`/grilling`): settles open design choices in frontier rounds before writing code. | [SKILL.md](../.agents/skills/grilling/SKILL.md) |
| **`volume-content`** | **Literary content (`content.ts`)**: metadata overrides, source attribution, prose, verse stanzas, and illustration plates. | [SKILL.md](../.agents/skills/volume-content/SKILL.md) |
| **`volume-verify`** | **Standards, tests & PR**: scope audit, pure-TS lint checks, `pnpm verify`, visual QC, and PR checklist. | [SKILL.md](../.agents/skills/volume-verify/SKILL.md) |
| **`pr`** | **Pull request body** (`/pr`): structured Summary, Evidence, and Merge Danger PR template. | [SKILL.md](../.agents/skills/pr/SKILL.md) |

## 4. Quickstart & Git Workflow

1. Pull latest `main` and create your personal branch (`CONTRIBUTING.md` — never push directly to `main`, never use `codex/` or `claude` branch names):
   ```powershell
   git checkout main
   git pull origin main
   git checkout -b dev/<your-name>
   ```
2. Install dependencies and preview locally (`pnpm` only):
   ```powershell
   pnpm install
   pnpm dev
   ```
3. Before opening a PR into `main`, run the full verification suite:
   ```powershell
   pnpm verify
   ```
