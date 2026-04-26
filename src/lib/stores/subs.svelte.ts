/**
 * Client-side mirror of the subreddit list. The persisted source of truth
 * lives on the server in .galley-config.json; this store exists for
 * optimistic UI updates so the list responds instantly to add/remove/move
 * actions without waiting for a server round-trip. Each mutation is
 * shadowed by a PUT to /api/subs.
 */

import { browser } from '$app/environment';

export const subsState = $state<{ list: string[]; hydrated: boolean }>({
	list: [],
	hydrated: false
});

export function hydrateSubs(serverSubs?: string[]) {
	if (subsState.hydrated) return;
	subsState.list = serverSubs ?? [];
	subsState.hydrated = true;
}

function normalise(name: string): string {
	return name.trim().replace(/^\/?r\//i, '').toLowerCase();
}

async function persist(list: string[]) {
	if (!browser) return;
	try {
		await fetch('/api/subs', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ subs: list })
		});
	} catch {
		// Best-effort; if the server is unreachable the user will see their
		// optimistic change and the next page load will reconcile from disk.
	}
}

export async function addSub(name: string): Promise<boolean> {
	const n = normalise(name);
	if (!n || !/^[a-z0-9_]{2,21}$/i.test(n)) return false;
	if (subsState.list.includes(n)) return false;
	subsState.list = [...subsState.list, n];
	await persist(subsState.list);
	return true;
}

export async function removeSub(name: string): Promise<void> {
	const n = normalise(name);
	subsState.list = subsState.list.filter((s) => s !== n);
	await persist(subsState.list);
}

export async function moveSub(name: string, dir: -1 | 1): Promise<void> {
	const n = normalise(name);
	const idx = subsState.list.indexOf(n);
	if (idx < 0) return;
	const next = idx + dir;
	if (next < 0 || next >= subsState.list.length) return;
	const list = [...subsState.list];
	[list[idx], list[next]] = [list[next], list[idx]];
	subsState.list = list;
	await persist(subsState.list);
}

export async function reorderSub(from: number, to: number): Promise<void> {
	if (from === to) return;
	if (from < 0 || from >= subsState.list.length) return;
	if (to < 0 || to >= subsState.list.length) return;
	const list = [...subsState.list];
	const [item] = list.splice(from, 1);
	list.splice(to, 0, item);
	subsState.list = list;
	await persist(subsState.list);
}

export function hasSubs(): boolean {
	return subsState.list.length > 0;
}
