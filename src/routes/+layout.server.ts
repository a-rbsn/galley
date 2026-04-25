import type { LayoutServerLoad } from './$types';

const COOKIE = 'galley_subs';

function parseSubs(raw: string | undefined): string[] {
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
	return { subs: parseSubs(cookies.get(COOKIE)) };
};
