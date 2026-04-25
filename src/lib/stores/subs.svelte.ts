import { browser } from '$app/environment';

const STORAGE_KEY = 'galley:subs';

function readStorage(): string[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((x): x is string => typeof x === 'string' && x.length > 0)
			.map((s) => s.toLowerCase());
	} catch {
		return [];
	}
}

const COOKIE = 'galley_subs';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function writeStorage(list: string[]) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	} catch {
		// quota or disabled — ignore.
	}
	// Mirror to cookie so server-side load() can read the list.
	try {
		const value = encodeURIComponent(list.join(','));
		document.cookie = `${COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
	} catch {
		// ignore
	}
}

function normalise(name: string): string {
	return name.trim().replace(/^\/?r\//i, '').toLowerCase();
}

export const subsState = $state<{ list: string[]; hydrated: boolean }>({
	list: [],
	hydrated: false
});

export function hydrateSubs(serverSubs?: string[]) {
	if (subsState.hydrated) return;
	const fromStorage = readStorage();
	// Prefer the server-known list (from cookie); fall back to localStorage; if
	// they differ, mirror the server view to localStorage so the two agree.
	const list = serverSubs && serverSubs.length > 0 ? serverSubs : fromStorage;
	if (
		list !== fromStorage &&
		(list.length !== fromStorage.length || list.some((s, i) => s !== fromStorage[i]))
	) {
		writeStorage(list);
	}
	subsState.list = list;
	subsState.hydrated = true;
}

export function addSub(name: string): boolean {
	const n = normalise(name);
	if (!n || !/^[a-z0-9_]{2,21}$/i.test(n)) return false;
	if (subsState.list.includes(n)) return false;
	subsState.list = [...subsState.list, n];
	writeStorage(subsState.list);
	return true;
}

export function removeSub(name: string) {
	const n = normalise(name);
	subsState.list = subsState.list.filter((s) => s !== n);
	writeStorage(subsState.list);
}

export function moveSub(name: string, dir: -1 | 1) {
	const n = normalise(name);
	const idx = subsState.list.indexOf(n);
	if (idx < 0) return;
	const next = idx + dir;
	if (next < 0 || next >= subsState.list.length) return;
	const list = [...subsState.list];
	[list[idx], list[next]] = [list[next], list[idx]];
	subsState.list = list;
	writeStorage(subsState.list);
}

export function hasSubs(): boolean {
	return subsState.list.length > 0;
}
