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

function writeStorage(list: string[]) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	} catch {
		// quota or disabled — ignore.
	}
}

function normalise(name: string): string {
	return name.trim().replace(/^\/?r\//i, '').toLowerCase();
}

export const subsState = $state<{ list: string[]; hydrated: boolean }>({
	list: [],
	hydrated: false
});

export function hydrateSubs() {
	if (subsState.hydrated) return;
	subsState.list = readStorage();
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
