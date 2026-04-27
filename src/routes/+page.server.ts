import type { PageServerLoad } from './$types';
import {
	redditJson,
	rawPostToView,
	RedditError,
	type Listing,
	type RawPost
} from '$lib/server/reddit';
import { getSubreddits } from '$lib/server/config';
import type { PostView } from '$lib/types';

export type Sort = 'hot' | 'new' | 'top' | 'rising';

function isSort(s: string | null): s is Sort {
	return s === 'hot' || s === 'new' || s === 'top' || s === 'rising';
}

export const load: PageServerLoad = async ({ url }) => {
	const subs = getSubreddits();
	const sortParam = url.searchParams.get('sort');
	const sort: Sort = isSort(sortParam) ? sortParam : 'hot';

	if (subs.length === 0) {
		return {
			subs,
			posts: [] as PostView[],
			sort,
			errors: [] as { sub: string; message: string }[],
			afters: {} as Record<string, string | null>
		};
	}

	const settled = await Promise.allSettled(
		subs.map((s) =>
			redditJson<Listing<RawPost>>(`/r/${s}/${sort}?limit=25`, { ttl: 60 })
		)
	);

	const errors: { sub: string; message: string }[] = [];
	const afters: Record<string, string | null> = {};
	let posts: PostView[] = [];
	settled.forEach((res, i) => {
		const sub = subs[i];
		if (res.status === 'fulfilled') {
			afters[sub] = res.value.data.after;
			posts.push(
				...res.value.data.children
					.filter((c): c is RawPost => c.kind === 't3')
					.map(rawPostToView)
			);
		} else {
			afters[sub] = null;
			const msg =
				res.reason instanceof RedditError
					? `${res.reason.status}: ${res.reason.message}`
					: res.reason instanceof Error
						? res.reason.message
						: 'unknown error';
			errors.push({ sub, message: msg });
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

	return { subs, posts: posts.slice(0, 50), sort, errors, afters };
};
