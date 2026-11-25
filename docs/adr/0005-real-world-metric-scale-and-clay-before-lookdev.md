---
status: accepted
---

# Real-World Metric Scale and Clay-Before-Lookdev Workflow

All 3D scene dimensions use real-world metric units (`1 Three.js unit = 1 meter`), and each scene milestone is built and verified in a neutral clay geometry pass (scale, silhouettes, pivots, camera framing, and controls) before applying procedural textures, warm lighting, or atmospheric effects in a separate lookdev pass.

## Considered Options

- **Metric scale + Clay pass before Lookdev (chosen)**: Keeps camera FOV, shelf spacing, spring motion, and physically based lighting attenuation consistent as the library grows, and prevents lighting or textures from masking proportion, clipping, or silhouette defects.
- **Abstract arbitrary units + full lookdev in one pass**: Faster to sketch an initial demo, but causes compounding scale drift across volumes, cameras, and animations and makes geometry defects harder to spot and expensive to rework.

## Consequences

- Early commits and tickets intentionally render in neutral matte materials under flat studio lighting; this is a deliberate quality gate, not unfinished styling.
- Every `Bookcase` bay, `Shelf`, and `Volume` dimension must be expressed in meters (e.g., a classic hardcover `Volume` ~`0.23m` tall × `0.16m` deep × `0.04m` thick).
