import type { Volume } from '#lib/catalog/types.ts';
import type { InspectPhase } from '#lib/physics/inspect-volume.ts';

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
 * the inspected Volume & orbit state in Inspect Mode, whether the user is
 * actively panning/pinching the Bookcase, and the screen-space anchor for
 * the floating Peek cue.
 */
let sceneMode = $state<SceneMode>('shelf');
let peekedVolume = $state<Volume | null>(null);
let peekSource = $state<PeekSource | null>(null);
let peekAnchor = $state<PeekAnchor | null>(null);
let isShelfPanning = $state(false);
let inspectedVolume = $state<Volume | null>(null);
let inspectPhase = $state<InspectPhase>('idle');
let isInspectOrbiting = $state(false);

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

export function getInspectedVolume(): Volume | null {
	return inspectedVolume;
}

export function getInspectedVolumeId(): string | null {
	return inspectedVolume?.id ?? null;
}

export function getInspectPhase(): InspectPhase {
	return inspectPhase;
}

export function getIsInspectOrbiting(): boolean {
	return isInspectOrbiting;
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
 * Placeholder Volumes never enter Inspect Mode; only Readable Volumes can be selected.
 */
export function canSelectVolume(volume: Volume): boolean {
	return sceneMode === 'shelf' && volume.kind === 'readable';
}

/**
 * Transitions from Shelf Mode into Inspect Mode for a Readable Volume.
 */
export function enterInspectMode(volume: Volume): boolean {
	if (!canSelectVolume(volume)) return false;
	clearPeek();
	isShelfPanning = false;
	inspectedVolume = volume;
	inspectPhase = 'entering';
	isInspectOrbiting = false;
	sceneMode = 'inspect';
	return true;
}

export function setInspectPhase(phase: InspectPhase): void {
	inspectPhase = phase;
}

export function setInspectOrbiting(orbiting: boolean): void {
	if (isInspectOrbiting === orbiting) return;
	isInspectOrbiting = orbiting;
}

/**
 * Requests a smooth return flight from Inspect Mode back into the Volume's Shelf slot.
 */
export function requestReturnToShelf(): void {
	if (sceneMode !== 'inspect' || inspectPhase === 'returning' || inspectPhase === 'idle') return;
	inspectPhase = 'returning';
	isInspectOrbiting = false;
}

/**
 * Completes the return flight once the Volume is seated flush in its Shelf slot.
 */
export function completeReturnToShelf(): void {
	inspectedVolume = null;
	inspectPhase = 'idle';
	isInspectOrbiting = false;
	sceneMode = 'shelf';
}

/**
 * Hook for Issue #11 (Reading Mode). Returns false until Reading Mode is implemented.
 */
export function openReadingMode(): boolean {
	return false;
}
