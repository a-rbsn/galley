import { browser } from '$app/environment';

const SEEN_KEY = 'galley_seen_posts';
const HIDE_KEY = 'galley_hide_seen';
const MAX_SEEN = 2000;

export const seenState = $state<{
	ids: string[];
	hideSeen: boolean;
	hydrated: boolean;
}>({
	ids: [],
	hideSeen: false,
	hydrated: false
});

function save() {
	if (!browser) return;
	try {
		localStorage.setItem(SEEN_KEY, JSON.stringify(seenState.ids.slice(0, MAX_SEEN)));
		localStorage.setItem(HIDE_KEY, seenState.hideSeen ? '1' : '0');
	} catch {
		// Private browsing / storage-disabled environments still get in-memory state.
	}
}

export function hydrateSeen() {
	if (!browser || seenState.hydrated) return;
	try {
		const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as unknown;
		seenState.ids = Array.isArray(parsed)
			? parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_SEEN)
			: [];
		seenState.hideSeen = localStorage.getItem(HIDE_KEY) === '1';
	} catch {
		seenState.ids = [];
		seenState.hideSeen = false;
	}
	seenState.hydrated = true;
}

export function markSeen(id: string) {
	if (!id) return;
	if (browser && !seenState.hydrated) hydrateSeen();
	if (seenState.ids.includes(id)) return;
	seenState.ids = [id, ...seenState.ids].slice(0, MAX_SEEN);
	save();
}

export function isSeen(id: string): boolean {
	return seenState.ids.includes(id);
}

export function setHideSeen(value: boolean) {
	seenState.hideSeen = value;
	save();
}

export function clearSeen() {
	seenState.ids = [];
	save();
}
