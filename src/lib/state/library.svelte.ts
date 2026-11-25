import type { Volume } from '#lib/catalog/types.ts';

export type SceneMode = 'shelf' | 'inspect' | 'reading';
export type PeekSource = 'hover' | 'tap';

export interface PeekAnchor {
	readonly volume: Volume;
	readonly source: PeekSource;
	/** Screen-space X coordinate in CSS pixels for the floating cue. */
	readonly screenX: number;
	/** Screen-space Y coordinate in CSS pixels for the floating cue. */
	readonly screenY: number;
	/** Whether the projected Volume top is in front of the camera. */
	readonly visible: boolean;
}

/**
 * Shared reactive scene interaction state using Svelte 5 `$state` runes.
 * Owns the active SceneMode, the currently peeked Volume in Shelf Mode,
 * whether the user is actively panning/pinching the Bookcase, and the
 * screen-space anchor for the floating Peek cue.
 */
let sceneMode = $state<SceneMode>('shelf');
let peekedVolume = $state<Volume | null>(null);
let peekSource = $state<PeekSource | null>(null);
let peekAnchor = $state<PeekAnchor | null>(null);
let isShelfPanning = $state(false);

export function getSceneMode(): SceneMode {
	return sceneMode;
}

export function getPeekedVolume(): Volume | null {
	return peekedVolume;
}

export function getPeekedVolumeId(): string | null {
	return peekedVolume?.id ?? null;
}

export function getPeekSource(): PeekSource | null {
	return peekSource;
}

export function getPeekAnchor(): PeekAnchor | null {
	return peekAnchor;
}

export function getIsShelfPanning(): boolean {
	return isShelfPanning;
}

export function setShelfPanning(panning: boolean): void {
	if (isShelfPanning === panning) return;
	isShelfPanning = panning;
	// Clear any active Peek once the reader begins dragging/pinching the Bookcase.
	if (panning && peekedVolume) {
		clearPeek();
	}
}

export function setPeekedVolume(volume: Volume, source: PeekSource): void {
	if (sceneMode !== 'shelf' || isShelfPanning) return;
	peekedVolume = volume;
	peekSource = source;
}

export function clearPeek(volumeId?: string): void {
	if (volumeId && peekedVolume?.id !== volumeId) return;
	peekedVolume = null;
	peekSource = null;
	peekAnchor = null;
}

export function updatePeekAnchor(
	volume: Volume,
	screenX: number,
	screenY: number,
	visible: boolean
): void {
	if (peekedVolume?.id !== volume.id || !peekSource) return;
	peekAnchor = {
		volume,
		source: peekSource,
		screenX,
		screenY,
		visible
	};
}

/**
 * Selection gate for a Volume in Shelf Mode.
 * Placeholder Volumes never enter Inspect Mode; Readable Volumes are ready for #9.
 */
export function canSelectVolume(volume: Volume): boolean {
	return sceneMode === 'shelf' && volume.kind === 'readable';
}
