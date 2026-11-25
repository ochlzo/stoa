---
status: accepted
---

# Procedural 3D with SvelteKit and Threlte

We will build the application with SvelteKit and Threlte (Three.js for Svelte), generating the bookshelf, books, and turning pages procedurally in code with dynamic textures rather than authoring static 3D models in Blender.

## Considered Options

- **SvelteKit + Threlte with procedural geometry (chosen)**: Zero external 3D software required; book thickness, cover art, spine titles, and real-time bending page geometry can be driven directly from book data.
- **Blender-authored GLTF/GLB assets (via Blender MCP)**: Allows richer hand-sculpted detail, but requires installing Blender locally and makes dynamic per-book dimensions and vertex-deformed page turning harder to maintain.
