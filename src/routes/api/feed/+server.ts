import { json, error, type RequestHandler } from '@sveltejs/kit';
import { loadMergedFeedPage } from '$lib/server/feed';
import { abortedResponse, isAbortError } from '$lib/server/abort';
import { DEFAULT_TOP_RANGE, isSort, isTopRange, type Sort, type TopRange } from '$lib/feed';

const SUB_RE = /^[a-z0-9_]{2,21}$/i;
const AFTER_RE = /^[a-z0-9_]{1,32}$/i;
const MAX_AFTER_ENTRIES = 200;

/**
 * Pagination endpoint for both the front page (multi-sub merge) and a single
 * subreddit page. The client passes the per-sub `after` cursors it already
 * holds, and we fetch the next page from each, merge, sort, and return — plus
 * the new cursor for each sub so the client can ask for another page later.
 *
 * Body shape:
 *   { sort: 'hot' | 'new' | 'top' | 'rising',
 *     topRange: 'day' | 'week' | 'month' | 'year' | 'all',
 *     afters: { [sub: string]: string | null } }
 *
 * Response:
 *   { posts: PostView[],
 *     afters: { [sub: string]: string | null },
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

	const afterEntries = Object.entries(body.afters as Record<string, unknown>)
		.filter(
			([sub, after]) =>
				SUB_RE.test(sub) &&
				(after === null || (typeof after === 'string' && AFTER_RE.test(after)))
		)
		.slice(0, MAX_AFTER_ENTRIES) as Array<[string, string | null]>;

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
