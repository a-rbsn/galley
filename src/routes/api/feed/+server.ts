import { json, error, type RequestHandler } from '@sveltejs/kit';
import {
	redditJson,
	rawPostToView,
	RedditError,
	type Listing,
	type RawPost
} from '$lib/server/reddit';
import type { PostView } from '$lib/types';

type Sort = 'hot' | 'new' | 'top' | 'rising';
function isSort(s: string | null): s is Sort {
	return s === 'hot' || s === 'new' || s === 'top' || s === 'rising';
}

const SUB_RE = /^[a-z0-9_]{2,21}$/i;
const AFTER_RE = /^[a-z0-9_]{1,32}$/i;

/**
 * Pagination endpoint for both the front page (multi-sub merge) and a single
 * subreddit page. The client passes the per-sub `after` cursors it already
 * holds, and we fetch the next page from each, merge, sort, and return — plus
 * the new cursor for each sub so the client can ask for another page later.
 *
 * Body shape:
 *   { sort: 'hot' | 'new' | 'top' | 'rising',
 *     afters: { [sub: string]: string | null } }
 *
 * Response:
 *   { posts: PostView[],
 *     afters: { [sub: string]: string | null },
 *     errors: { sub: string; message: string }[] }
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: { sort?: unknown; afters?: unknown };
	try {
		body = await request.json();
	} catch {
		error(400, 'invalid JSON body');
	}

	const sort: Sort = isSort(typeof body.sort === 'string' ? body.sort : null)
		? (body.sort as Sort)
		: 'hot';

	if (!body.afters || typeof body.afters !== 'object') {
		error(400, 'afters must be an object');
	}

	const afterEntries = Object.entries(body.afters as Record<string, unknown>).filter(
		([sub, after]) => SUB_RE.test(sub) && (after === null || (typeof after === 'string' && AFTER_RE.test(after)))
	) as Array<[string, string | null]>;

	if (afterEntries.length === 0) {
		return json({ posts: [], afters: {}, errors: [] });
	}

	// Subs whose `after` is null have already exhausted their feed — skip them.
	const live = afterEntries.filter(([, a]) => a !== null) as Array<[string, string]>;

	const settled = await Promise.allSettled(
		live.map(([sub, after]) =>
			redditJson<Listing<RawPost>>(`/r/${sub}/${sort}?limit=25&after=${after}`, { ttl: 60 })
		)
	);

	const errors: { sub: string; message: string }[] = [];
	const newAfters: Record<string, string | null> = {};
	for (const [sub] of afterEntries) newAfters[sub] = null;
	let posts: PostView[] = [];

	settled.forEach((res, i) => {
		const [sub] = live[i];
		if (res.status === 'fulfilled') {
			newAfters[sub] = res.value.data.after;
			posts.push(
				...res.value.data.children
					.filter((c): c is RawPost => c.kind === 't3')
					.map(rawPostToView)
			);
		} else {
			// Preserve the previous cursor on failure so the client can retry the
			// same window. Without this we'd advance past unread content.
			newAfters[sub] = live[i][1];
			const reason = res.reason;
			const msg =
				reason instanceof RedditError
					? `${reason.status}: ${reason.message}`
					: reason instanceof Error
						? reason.message
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
		posts.sort((a, b) => b.score - a.score);
	}

	return json({ posts, afters: newAfters, errors });
};
