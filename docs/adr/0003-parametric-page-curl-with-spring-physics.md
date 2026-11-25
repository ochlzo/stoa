---
status: accepted
---

# Parametric Page-Curl Deformation with Spring Physics

Page turning will use a parametric cylindrical/conical vertex deformation driven by pointer drag, coupled with spring-damper settle physics on release, rather than a general-purpose soft-body cloth physics engine.

## Considered Options

- **Parametric curl + spring physics (chosen)**: Guarantees smooth 60fps performance on mobile GPUs, prevents adjacent leaves from clipping through each other or the book block, and still feels tactile and responsive to drag position and flick velocity.
- **Full Verlet / soft-body cloth simulation**: Allows arbitrary crumpling, but is computationally expensive on mobile and prone to self-intersection and distorted typography.
