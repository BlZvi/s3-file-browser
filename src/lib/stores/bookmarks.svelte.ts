export interface Bookmark {
	id: string;
	bucket: string;
	prefix: string; // '' for bucket root
	label: string; // Display name (auto-generated or user-set)
	createdAt: number;
	icon?: string; // Optional custom icon/emoji
}

export interface RecentItem {
	bucket: string;
	key: string;
	name: string;
	isFolder: boolean;
	accessedAt: number;
}

const BOOKMARKS_KEY = 'objectdock-bookmarks';
const RECENT_KEY = 'objectdock-recent';
const MAX_RECENT_ITEMS = 50;

// Module-level reactive state
let bookmarks = $state<Bookmark[]>([]);
let recentItems = $state<RecentItem[]>([]);

// --- Persistence helpers ---

function saveBookmarks(): void {
	try {
		localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
	} catch {
		// localStorage may be full or unavailable
	}
}

function saveRecent(): void {
	try {
		localStorage.setItem(RECENT_KEY, JSON.stringify(recentItems));
	} catch {
		// localStorage may be full or unavailable
	}
}

function loadFromStorage(): void {
	try {
		const storedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
		if (storedBookmarks) {
			const parsed = JSON.parse(storedBookmarks);
			if (Array.isArray(parsed)) {
				bookmarks = parsed;
			}
		}
	} catch {
		// Corrupt data — start fresh
		bookmarks = [];
	}

	try {
		const storedRecent = localStorage.getItem(RECENT_KEY);
		if (storedRecent) {
			const parsed = JSON.parse(storedRecent);
			if (Array.isArray(parsed)) {
				recentItems = parsed;
			}
		}
	} catch {
		// Corrupt data — start fresh
		recentItems = [];
	}
}

// Initialize from localStorage on module load
if (typeof window !== 'undefined') {
	loadFromStorage();
}

// --- Bookmark CRUD ---

export function getBookmarks(): Bookmark[] {
	return bookmarks;
}

export function addBookmark(bucket: string, prefix: string, label?: string): void {
	// Don't add duplicates
	if (isBookmarked(bucket, prefix)) return;

	const autoLabel = prefix ? `${bucket} / ${prefix}` : bucket;
	const bookmark: Bookmark = {
		id: `bm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		bucket,
		prefix,
		label: label || autoLabel,
		createdAt: Date.now(),
	};
	bookmarks = [...bookmarks, bookmark];
	saveBookmarks();
}

export function removeBookmark(id: string): void {
	bookmarks = bookmarks.filter((b) => b.id !== id);
	saveBookmarks();
}

export function updateBookmarkLabel(id: string, label: string): void {
	bookmarks = bookmarks.map((b) => (b.id === id ? { ...b, label } : b));
	saveBookmarks();
}

export function isBookmarked(bucket: string, prefix: string): boolean {
	return bookmarks.some((b) => b.bucket === bucket && b.prefix === prefix);
}

export function toggleBookmark(bucket: string, prefix: string, label?: string): void {
	const existing = bookmarks.find((b) => b.bucket === bucket && b.prefix === prefix);
	if (existing) {
		removeBookmark(existing.id);
	} else {
		addBookmark(bucket, prefix, label);
	}
}

// --- Recent items ---

export function getRecentItems(): RecentItem[] {
	return recentItems;
}

export function addRecentItem(item: Omit<RecentItem, 'accessedAt'>): void {
	// Remove existing entry for same bucket+key (dedup)
	const filtered = recentItems.filter(
		(r) => !(r.bucket === item.bucket && r.key === item.key)
	);

	// Add new entry at the front (most recent first)
	const newItem: RecentItem = {
		...item,
		accessedAt: Date.now(),
	};

	recentItems = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
	saveRecent();
}

export function clearRecentItems(): void {
	recentItems = [];
	saveRecent();
}
