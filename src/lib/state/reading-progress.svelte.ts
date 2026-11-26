const STORAGE_KEY = 'stoa:reading-progress';

function readStoredProgress(): Record<string, number> {
	if (typeof window === 'undefined') return {};
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			const result: Record<string, number> = {};
			for (const [key, value] of Object.entries(parsed)) {
				if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
					result[key] = Math.floor(value);
				}
			}
			return result;
		}
	} catch {
		// Ignore malformed or blocked localStorage access
	}
	return {};
}

function writeStoredProgress(map: Record<string, number>): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
	} catch {
		// Ignore storage quota or private-mode errors
	}
}

/**
 * Reactive map of auto-saved reading progress keyed by Volume ID -> last-read Page index.
 * Stored separately from explicit Bookmark Ribbons (`stoa:bookmarks`) so closing and
 * reopening a Volume automatically resumes the reader's last-read Spread without
 * creating or modifying Bookmark Ribbons.
 */
let lastReadPages = $state<Record<string, number>>(readStoredProgress());

export function getLastReadPage(volumeId: string): number | undefined {
	return lastReadPages[volumeId];
}

export function setLastReadPage(volumeId: string, pageIndex: number): void {
	if (!Number.isFinite(pageIndex) || pageIndex < 0) return;
	const normalized = Math.floor(pageIndex);
	if (lastReadPages[volumeId] === normalized) return;
	lastReadPages = { ...lastReadPages, [volumeId]: normalized };
	writeStoredProgress(lastReadPages);
}

export function clearLastReadPage(volumeId: string): void {
	if (!Object.prototype.hasOwnProperty.call(lastReadPages, volumeId)) return;
	const next = { ...lastReadPages };
	delete next[volumeId];
	lastReadPages = next;
	writeStoredProgress(lastReadPages);
}
