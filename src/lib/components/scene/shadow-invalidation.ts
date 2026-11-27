// Non-reactive shadow-map invalidation counter for demand-driven shadow updates.
// Static Shelf Mode, stationary Inspect Mode, and Reading Mode frames skip
// re-rendering the shadow map until a shadow-casting Volume moves or toggles visibility.
let shadowDirtyFrames = 2;

export function markShadowsDirty(frames = 1): void {
	if (frames > shadowDirtyFrames) {
		shadowDirtyFrames = frames;
	}
}

export function consumeShadowsDirty(): boolean {
	if (shadowDirtyFrames <= 0) return false;
	shadowDirtyFrames -= 1;
	return true;
}
