import { json, error, type RequestHandler } from '@sveltejs/kit';
import { loadMergedFeedPage, parseFeedSourceCursors } from '$lib/server/feed';
import { abortedResponse, isAbortError } from '$lib/server/abort';
import { DEFAULT_TOP_RANGE, isSort, isTopRange, type Sort, type TopRange } from '$lib/feed';

const AFTER_RE = /^[a-z0-9_]{1,32}$/i;
const MAX_AFTER_ENTRIES = 200;

/**
 * Pagination endpoint for both merged feeds and single-subreddit pages. Merged
 * feeds pass source cursors keyed by `m:sub1+sub2+...`; single-subreddit pages
 * pass the subreddit name as the cursor key.
 *
 * Body shape:
 *   { sort: 'hot' | 'new' | 'top' | 'rising',
 *     topRange: 'day' | 'week' | 'month' | 'year' | 'all',
 *     afters: { [sourceKey: string]: string | null } }
 *
 * Response:
 *   { posts: PostView[],
 *     afters: { [sourceKey: string]: string | null },
 *     errors: { sub: string; message: string }[] }
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: { sort?: unknown; topRange?: unknown; afters?: unknown };
	try {
		body = await request.json();
	} catch (e) {
		if (isAbortError(e)) return abortedResponse();
		error(400, 'invalid JSON body');
	}

	const sort: Sort = isSort(typeof body.sort === 'string' ? body.sort : null)
		? (body.sort as Sort)
		: 'hot';
	const topRange: TopRange = isTopRange(typeof body.topRange === 'string' ? body.topRange : null)
		? (body.topRange as TopRange)
		: DEFAULT_TOP_RANGE;

	if (!body.afters || typeof body.afters !== 'object') {
		error(400, 'afters must be an object');
	}

	const rawAfters = Object.fromEntries(
		Object.entries(body.afters as Record<string, unknown>)
			.filter(([, after]) => after === null || (typeof after === 'string' && AFTER_RE.test(after)))
			.slice(0, MAX_AFTER_ENTRIES)
	);
	const afterEntries = parseFeedSourceCursors(rawAfters);

	if (afterEntries.length === 0) {
		return json({ posts: [], afters: {}, errors: [] });
	}

	try {
		const feed = await loadMergedFeedPage(afterEntries, sort, topRange, {
			signal: request.signal
		});
		return json(feed);
	} catch (e) {
		if (isAbortError(e)) return abortedResponse();
		throw e;
	}
};
