import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getCustomFeed } from '$lib/server/config';
import { loadMergedFeed } from '$lib/server/feed';
import { DEFAULT_TOP_RANGE, isSort, isTopRange, type Sort, type TopRange } from '$lib/feed';
import type { PostView } from '$lib/types';

export const load: PageServerLoad = async ({ params, url, request }) => {
	const id = params.feed.toLowerCase();
	if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(id)) error(400, 'Invalid feed id.');

	const feed = getCustomFeed(id);
	if (!feed) error(404, 'Custom feed not found.');

	const sortParam = url.searchParams.get('sort');
	const sort: Sort = isSort(sortParam) ? sortParam : 'hot';
	const topRangeParam = url.searchParams.get('t');
	const topRange: TopRange = isTopRange(topRangeParam) ? topRangeParam : DEFAULT_TOP_RANGE;

	if (feed.subreddits.length === 0) {
		return {
			feed,
			posts: [] as PostView[],
			sort,
			topRange,
			errors: [] as { sub: string; message: string }[],
			afters: {} as Record<string, string | null>
		};
	}

	const result = await loadMergedFeed(feed.subreddits, sort, topRange, 50, {
		signal: request.signal
	});
	return { feed, ...result, sort, topRange };
};
