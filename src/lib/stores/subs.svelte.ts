/**
 * Client-side mirror of the subreddit list. The persisted source of truth
 * lives on the server in .galley-config.json; this store exists for
 * optimistic UI updates so the list responds instantly to add/remove/move
 * actions without waiting for a server round-trip. Each mutation is
 * shadowed by a PUT to /api/subs.
 */

import { browser } from '$app/environment';

export const subsState = $state<{ list: string[]; hydrated: boolean; error: string | null }>({
	list: [],
	hydrated: false,
	error: null
});

export function hydrateSubs(serverSubs?: string[]) {
	if (subsState.hydrated) return;
	subsState.list = serverSubs ?? [];
	subsState.hydrated = true;
}

function normalise(name: string): string {
	return name.trim().replace(/^\/?r\//i, '').toLowerCase();
}

async function persist(list: string[]): Promise<string | null> {
	if (!browser) return null;
	try {
		const res = await fetch('/api/subs', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify({ subs: list })
		});
		if (res.ok) return null;
		try {
			const body = (await res.json()) as { error?: unknown };
			if (typeof body.error === 'string') return body.error;
		} catch {
			// Fall through to the status-based message.
		}
		return `Save failed (${res.status}).`;
	} catch (e) {
		return e instanceof Error ? e.message : 'Save failed.';
	}
}

export async function addSub(name: string): Promise<boolean> {
	const n = normalise(name);
	if (!n || !/^[a-z0-9_]{2,21}$/i.test(n)) return false;
	if (subsState.list.includes(n)) return false;
	const previous = subsState.list;
	subsState.list = [...subsState.list, n];
	const error = await persist(subsState.list);
	if (error) {
		subsState.list = previous;
		subsState.error = error;
		return false;
	}
	subsState.error = null;
	return true;
}

export async function removeSub(name: string): Promise<boolean> {
	const n = normalise(name);
	const previous = subsState.list;
	subsState.list = subsState.list.filter((s) => s !== n);
	const error = await persist(subsState.list);
	if (error) {
		subsState.list = previous;
		subsState.error = error;
		return false;
	}
	subsState.error = null;
	return true;
}

export async function moveSub(name: string, dir: -1 | 1): Promise<boolean> {
	const n = normalise(name);
	const idx = subsState.list.indexOf(n);
	if (idx < 0) return false;
	const next = idx + dir;
	if (next < 0 || next >= subsState.list.length) return false;
	const previous = subsState.list;
	const list = [...subsState.list];
	[list[idx], list[next]] = [list[next], list[idx]];
	subsState.list = list;
	const error = await persist(subsState.list);
	if (error) {
		subsState.list = previous;
		subsState.error = error;
		return false;
	}
	subsState.error = null;
	return true;
}

export async function reorderSub(from: number, to: number): Promise<boolean> {
	if (from === to) return false;
	if (from < 0 || from >= subsState.list.length) return false;
	if (to < 0 || to >= subsState.list.length) return false;
	const previous = subsState.list;
	const list = [...subsState.list];
	const [item] = list.splice(from, 1);
	list.splice(to, 0, item);
	subsState.list = list;
	const error = await persist(subsState.list);
	if (error) {
		subsState.list = previous;
		subsState.error = error;
		return false;
	}
	subsState.error = null;
	return true;
}

export function hasSubs(): boolean {
	return subsState.list.length > 0;
}
