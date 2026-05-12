import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	redditJson,
	rawPostToView,
	RedditError,
	type Listing,
	type RawPost
} from '$lib/server/reddit';
import { DEFAULT_TOP_RANGE, isSort, isTopRange, type Sort, type TopRange } from '$lib/feed';

const SUBREDDIT_LISTING_TTL_SECONDS = 5 * 60;

export const load: PageServerLoad = async ({ params, url, request }) => {
	const sub = params.subreddit;
	if (!/^[a-z0-9_]{2,21}$/i.test(sub)) {
		error(400, `Not a valid subreddit name: ${sub}`);
	}

	const sortParam = url.searchParams.get('sort');
	const sort: Sort = isSort(sortParam) ? sortParam : 'hot';
	const topRangeParam = url.searchParams.get('t');
	const topRange: TopRange = isTopRange(topRangeParam) ? topRangeParam : DEFAULT_TOP_RANGE;

	const path = `/r/${sub.toLowerCase()}/${sort}?${new URLSearchParams({
		limit: '25',
		...(sort === 'top' ? { t: topRange } : {})
	}).toString()}`;

	try {
		const data = await redditJson<Listing<RawPost>>(path, {
			ttl: SUBREDDIT_LISTING_TTL_SECONDS,
			signal: request.signal
		});
		const posts = data.data.children
			.filter((c): c is RawPost => c.kind === 't3')
			.map(rawPostToView);
		return {
			sub: sub.toLowerCase(),
			sort,
			topRange,
			posts,
			after: data.data.after
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
