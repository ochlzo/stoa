---
status: accepted
---

# 3D-Only Reading with Textured Deforming Pages

All reading happens directly on the 3D book's pages—rendered as high-DPI textures attached to deforming page geometry—with no 2D modal reader fallback.

## Consequences

- Text and illustrations bend and curl naturally with the physical page during drag-driven page turns, preserving the tactile illusion.
- Native browser features like DOM text selection, Ctrl+F, and dynamic CSS reflow are unavailable; readability relies on careful pagination, typography, high-DPI textures, and camera zoom.
