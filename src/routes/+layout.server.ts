import type { LayoutServerLoad } from './$types';
import { getCustomFeeds, getSubreddits, setSubreddits } from '$lib/server/config';

const LEGACY_COOKIE = 'galley_subs';

function parseLegacyCookie(raw: string | undefined): string[] {
	if (!raw) return [];
	const seen = new Set<string>();
	const out: string[] = [];
	for (const part of decodeURIComponent(raw).split(',')) {
		const s = part.trim().toLowerCase();
		if (!/^[a-z0-9_]{2,21}$/.test(s)) continue;
		if (seen.has(s)) continue;
		seen.add(s);
		out.push(s);
	}
	return out;
}

export const load: LayoutServerLoad = async ({ cookies }) => {
	let subs = getSubreddits();

	// One-time migration: if the disk config has no subs but the user had
	// some saved in the legacy cookie, lift them over so existing instances
	// don't lose state when upgrading.
	if (subs.length === 0) {
		const legacy = parseLegacyCookie(cookies.get(LEGACY_COOKIE));
		if (legacy.length > 0) {
			subs = setSubreddits(legacy);
			cookies.delete(LEGACY_COOKIE, { path: '/' });
		}
	}

	return { subs, feeds: getCustomFeeds() };
};
