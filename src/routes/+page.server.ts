import type { PageServerLoad } from './$types';
import {
	redditJson,
	rawPostToView,
	RedditError,
	type Listing,
	type RawPost
} from '$lib/server/reddit';
import type { PostView } from '$lib/types';

const COOKIE = 'galley_subs';

export type Sort = 'hot' | 'new' | 'top' | 'rising';

function isSort(s: string | null): s is Sort {
	return s === 'hot' || s === 'new' || s === 'top' || s === 'rising';
}

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

export const load: PageServerLoad = async ({ cookies, url }) => {
	const subs = parseSubs(cookies.get(COOKIE));
	const sortParam = url.searchParams.get('sort');
	const sort: Sort = isSort(sortParam) ? sortParam : 'hot';

	if (subs.length === 0) {
		return { subs, posts: [] as PostView[], sort, errors: [] };
	}

	const settled = await Promise.allSettled(
		subs.map((s) =>
			redditJson<Listing<RawPost>>(`/r/${s}/${sort}?limit=25`, { ttl: 60 })
		)
	);

	const errors: { sub: string; message: string }[] = [];
	let posts: PostView[] = [];
	settled.forEach((res, i) => {
		if (res.status === 'fulfilled') {
			posts.push(
				...res.value.data.children
					.filter((c): c is RawPost => c.kind === 't3')
					.map(rawPostToView)
			);
		} else {
			const msg =
				res.reason instanceof RedditError
					? `${res.reason.status}: ${res.reason.message}`
					: res.reason instanceof Error
						? res.reason.message
						: 'unknown error';
			errors.push({ sub: subs[i], message: msg });
		}
	});

	const seen = new Set<string>();
	posts = posts.filter((p) => {
		if (seen.has(p.id)) return false;
		seen.add(p.id);
		return true;
	});

	if (sort === 'new') {
		posts.sort((a, b) => b.createdUtc - a.createdUtc);
	} else {
		// hot/top/rising: trust per-sub order, then re-rank by score
		posts.sort((a, b) => b.score - a.score);
	}

	return { subs, posts: posts.slice(0, 50), sort, errors };
};
