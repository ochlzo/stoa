const STORAGE_KEY = 'stoa:bookmarks';

function readStoredBookmarks(): Record<string, number> {
	if (typeof window === 'undefined') return {};
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			const result: Record<string, number> = {};
			for (const [key, value] of Object.entries(parsed)) {
				if (typeof value === 'number' && Number.isFinite(value)) {
					result[key] = value;
				}
			}
			return result;
		}
	} catch {
		// Ignore malformed or blocked localStorage access
	}
	return {};
}

function writeStoredBookmarks(map: Record<string, number>): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
	} catch {
		// Ignore storage quota or private-mode errors
	}
}

/**
 * Reactive map of user-placed bookmarks keyed by Volume ID -> bookmarked Page index.
 * Persists locally in localStorage so Bookmark Ribbons appear only on Volumes the
 * reader has actively bookmarked.
 */
let bookmarks = $state<Record<string, number>>(readStoredBookmarks());

export function hasBookmark(volumeId: string): boolean {
	return Object.prototype.hasOwnProperty.call(bookmarks, volumeId);
}

export function getBookmarkedPage(volumeId: string): number | undefined {
	return bookmarks[volumeId];
}

export function setBookmark(volumeId: string, pageIndex: number): void {
	bookmarks = { ...bookmarks, [volumeId]: pageIndex };
	writeStoredBookmarks(bookmarks);
}

export function clearBookmark(volumeId: string): void {
	if (!hasBookmark(volumeId)) return;
	const next = { ...bookmarks };
	delete next[volumeId];
	bookmarks = next;
	writeStoredBookmarks(bookmarks);
}

export function toggleBookmark(volumeId: string, pageIndex = 0): boolean {
	if (hasBookmark(volumeId)) {
		clearBookmark(volumeId);
		return false;
	}
	setBookmark(volumeId, pageIndex);
	return true;
}
