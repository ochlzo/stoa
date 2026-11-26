import { parseClayModeParam } from '#lib/catalog/lookdev.ts';

function readInitialClayMode(): boolean {
	if (typeof window === 'undefined') return false;
	return parseClayModeParam(window.location.search);
}

/**
 * Shared reactive Lookdev state using Svelte 5 `$state`.
 * When `clayMode` is true (`?clay=1`), lighting, procedural IBL, and Lookdev materials
 * cleanly fall back to the neutral Clay pass (ADR 0005) for side-by-side visual QC.
 */
let clayMode = $state<boolean>(readInitialClayMode());

export function isClayMode(): boolean {
	return clayMode;
}

export function setClayMode(enabled: boolean): void {
	clayMode = enabled;
}
