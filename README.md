# Stoa

An interactive 3D library web app for browsing classic literature on a bookcase and reading directly on turning 3D pages.

## Prerequisites

Install these tools before running the project:

1. **Git** — https://git-scm.com/downloads
2. **Node.js** (v22 or newer, LTS recommended) — https://nodejs.org/
3. **pnpm** (package manager) — install via Corepack (included with Node.js) or standalone:
   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```
   Or see https://pnpm.io/installation.

> **Note about Svelte & 3D libraries:** You do **not** need to install Svelte, SvelteKit, Three.js, Threlte, or Tailwind globally. They are declared in `package.json` and installed automatically in the next step.

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/ochlzo/stoa.git
   cd stoa
   ```

2. **Install dependencies** (Svelte, SvelteKit, Threlte, Three.js, Tailwind CSS, TypeScript)
   ```bash
   pnpm install
   ```

3. **Enable contributor Git hooks** (blocks accidental pushes to `main`)
   ```bash
   pnpm setup:hooks
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```
   Open the local URL printed in your terminal (by default `http://localhost:5173`).

## Contributing Rules

- **Never push directly to `main`.** All changes must go through a feature branch and a Pull Request.
- **Run `pnpm setup:hooks` once after cloning.** This configures Git to use the repository's `.githooks/` directory, which installs a `pre-push` hook that blocks pushes targeting `main`.
- **Standard branch workflow:**
  ```bash
  git checkout -b feat/your-branch-name
  # make changes and commit
  git push -u origin feat/your-branch-name
  ```
  Then open a Pull Request into `main`.

## Available Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start the local dev server with Hot Module Replacement (HMR). |
| `pnpm check` | Run `svelte-check` and TypeScript diagnostics. |
| `pnpm build` | Build the static production site into `build/`. |
| `pnpm preview` | Serve the production `build/` output locally to test it. |
| `pnpm setup:hooks` | Configure local Git hooks (blocks direct pushes to `main`). |
