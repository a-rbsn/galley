import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	redditJson,
	rawPostToView,
	RedditError,
	type Listing,
	type RawPost
} from '$lib/server/reddit';

export type Sort = 'hot' | 'new' | 'top' | 'rising';

function isSort(s: string | null): s is Sort {
	return s === 'hot' || s === 'new' || s === 'top' || s === 'rising';
}

export const load: PageServerLoad = async ({ params, url }) => {
	const sub = params.subreddit;
	if (!/^[a-z0-9_]{2,21}$/i.test(sub)) {
		error(400, `Not a valid subreddit name: ${sub}`);
	}

	const sortParam = url.searchParams.get('sort');
	const sort: Sort = isSort(sortParam) ? sortParam : 'hot';
	const after = url.searchParams.get('after');

	const qs = new URLSearchParams({ limit: '25' });
	if (after) qs.set('after', after);

	const path = `/r/${sub.toLowerCase()}/${sort}?${qs}`;

	try {
		const data = await redditJson<Listing<RawPost>>(path, { ttl: 60 });
		const posts = data.data.children
			.filter((c): c is RawPost => c.kind === 't3')
			.map(rawPostToView);
		return {
			sub: sub.toLowerCase(),
			sort,
			posts,
			after: data.data.after,
			before: data.data.before
		};
	} catch (e) {
		if (e instanceof RedditError) {
			if (e.status === 404) error(404, `r/${sub} could not be found.`);
			if (e.status === 403) error(403, `r/${sub} is private or has been quarantined.`);
			error(502, `Reddit responded ${e.status}: ${e.message}`);
		}
		throw e;
	}
};
