import type { Volume } from '#lib/catalog/types.ts';
import {
	clampSpreadIndex,
	getCanonicalPageIndexForSpread,
	getSpreadIndexForPage,
	getVolumeReadingModel,
	type PageSide
} from '#lib/catalog/reading.ts';
import type { InspectPhase } from '#lib/physics/inspect-volume.ts';
import type { ReadingPhase } from '#lib/physics/reading-volume.ts';
import { getLastReadPage, setLastReadPage } from '#lib/state/reading-progress.svelte.ts';

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
 * the inspected Volume & orbit state in Inspect Mode, and the active
 * Reading Mode phase, Spread index, and mobile single-Page focus side.
 */
let sceneMode = $state<SceneMode>('shelf');
let peekedVolume = $state<Volume | null>(null);
let peekSource = $state<PeekSource | null>(null);
let peekAnchor = $state<PeekAnchor | null>(null);
let isShelfPanning = $state(false);
let inspectedVolume = $state<Volume | null>(null);
let inspectPhase = $state<InspectPhase>('idle');
let isInspectOrbiting = $state(false);
let inspectShelfCleared = $state(false);

let readingPhase = $state<ReadingPhase>('idle');
let readingUnfolding = $state(false);
let currentSpreadIndex = $state(0);
let focusedPageSide = $state<PageSide>('right');

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

export function getInspectShelfCleared(): boolean {
	return inspectShelfCleared;
}

export function getReadingPhase(): ReadingPhase {
	return readingPhase;
}

export function getReadingUnfolding(): boolean {
	return readingUnfolding;
}

export function getCurrentSpreadIndex(): number {
	return currentSpreadIndex;
}

export function getFocusedPageSide(): PageSide {
	return focusedPageSide;
}

export function setInspectShelfCleared(cleared: boolean): void {
	if (inspectShelfCleared === cleared) return;
	inspectShelfCleared = cleared;
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
	inspectShelfCleared = false;
	readingPhase = 'idle';
	readingUnfolding = false;
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
	inspectShelfCleared = false;
}

/**
 * Completes the return flight once the Volume is seated flush in its Shelf slot.
 */
export function completeReturnToShelf(): void {
	inspectedVolume = null;
	inspectPhase = 'idle';
	isInspectOrbiting = false;
	inspectShelfCleared = false;
	readingPhase = 'idle';
	readingUnfolding = false;
	sceneMode = 'shelf';
}

/**
 * Transitions from Inspect Mode into Reading Mode for the inspected Readable Volume.
 * First open lands on Spread 0 (front title Spread); subsequent opens resume the
 * reader's last-read Spread from localStorage independently of Bookmark Ribbons.
 */
export function openReadingMode(): boolean {
	if (sceneMode !== 'inspect' || !inspectedVolume || inspectedVolume.kind !== 'readable') {
		return false;
	}
	if (inspectPhase === 'returning' || inspectPhase === 'idle') {
		return false;
	}

	const model = getVolumeReadingModel(inspectedVolume);
	const savedPage = getLastReadPage(inspectedVolume.id);

	if (savedPage === undefined) {
		currentSpreadIndex = 0;
		focusedPageSide = 'right';
		setLastReadPage(inspectedVolume.id, getCanonicalPageIndexForSpread(model, 0));
	} else {
		const resumedSpread = getSpreadIndexForPage(model, savedPage);
		currentSpreadIndex = resumedSpread;
		focusedPageSide = resumedSpread === 0 ? 'right' : savedPage % 2 === 1 ? 'right' : 'left';
	}

	isInspectOrbiting = false;
	readingUnfolding = false;
	readingPhase = 'opening';
	sceneMode = 'reading';
	return true;
}

export function setReadingUnfolding(unfolding: boolean): void {
	if (readingUnfolding === unfolding) return;
	readingUnfolding = unfolding;
}

export function completeReadingOpen(): void {
	if (sceneMode !== 'reading' || readingPhase !== 'opening') return;
	readingPhase = 'reading';
}

/**
 * Navigates to a specific Spread in Reading Mode and auto-saves the reader's
 * last-read Page in localStorage (separate from Bookmark Ribbons).
 */
export function setReadingSpread(spreadIndex: number): void {
	if (sceneMode !== 'reading' || !inspectedVolume) return;
	const model = getVolumeReadingModel(inspectedVolume);
	const clamped = clampSpreadIndex(model, spreadIndex);
	currentSpreadIndex = clamped;
	setLastReadPage(inspectedVolume.id, getCanonicalPageIndexForSpread(model, clamped));
}

export function stepReadingSpread(delta: -1 | 1): void {
	if (sceneMode !== 'reading' || !inspectedVolume) return;
	const model = getVolumeReadingModel(inspectedVolume);
	const next = clampSpreadIndex(model, currentSpreadIndex + delta);
	if (next === currentSpreadIndex) return;
	currentSpreadIndex = next;
	focusedPageSide = next === 0 ? 'right' : delta > 0 ? 'left' : 'right';
	setLastReadPage(inspectedVolume.id, getCanonicalPageIndexForSpread(model, next));
}

export function setFocusedPageSide(side: PageSide): void {
	if (focusedPageSide === side) return;
	focusedPageSide = side;
	if (sceneMode === 'reading' && inspectedVolume) {
		const model = getVolumeReadingModel(inspectedVolume);
		const spread = model.spreads[clampSpreadIndex(model, currentSpreadIndex)];
		if (spread) {
			const activePage = side === 'left' ? spread.leftPage : spread.rightPage;
			setLastReadPage(inspectedVolume.id, activePage.index);
		}
	}
}

/**
 * Requests folding the open Volume back into Inspect Mode.
 */
export function requestCloseToInspect(): void {
	if (sceneMode !== 'reading') return;
	if (readingPhase === 'closing-to-inspect' || readingPhase === 'closing-to-shelf') return;
	if (!readingUnfolding) {
		completeCloseToInspect();
		return;
	}
	readingPhase = 'closing-to-inspect';
}

export function completeCloseToInspect(): void {
	readingPhase = 'idle';
	readingUnfolding = false;
	sceneMode = 'inspect';
	inspectPhase = 'inspecting';
}

/**
 * Requests folding the open Volume shut and returning it directly to its Shelf slot.
 */
export function requestReturnToShelfFromReading(): void {
	if (sceneMode !== 'reading') return;
	if (readingPhase === 'closing-to-shelf') return;
	if (!readingUnfolding) {
		completeCloseToShelf();
		return;
	}
	readingPhase = 'closing-to-shelf';
}

export function completeCloseToShelf(): void {
	readingPhase = 'idle';
	readingUnfolding = false;
	sceneMode = 'inspect';
	inspectPhase = 'returning';
	isInspectOrbiting = false;
	inspectShelfCleared = false;
}
