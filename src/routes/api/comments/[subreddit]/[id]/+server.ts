import { json, error, type RequestHandler } from '@sveltejs/kit';
import {
	redditJson,
	rawCommentToView,
	rawMoreToView,
	RedditError,
	type Listing,
	type RawComment,
	type RawMore,
	type RawPost
} from '$lib/server/reddit';
import { renderMarkdown } from '$lib/server/markdown';
import type { CommentView, MoreCommentsView } from '$lib/types';

function annotateMarkdown(c: CommentView) {
	c.bodyHtml = renderMarkdown(c.body);
	for (const r of c.replies) {
		if (r.kind === 't1') annotateMarkdown(r);
	}
}

/**
 * Comments fetch endpoint, called by the post page from the client after
 * mount. Pulled out of +page.server.ts so the page response stream closes as
 * soon as the post itself is rendered — otherwise back-navigation has to wait
 * for the streaming JSON chunk to finish.
 */
export const GET: RequestHandler = async ({ params }) => {
	const { subreddit, id } = params;
	if (!subreddit || !/^[a-z0-9_]{2,21}$/i.test(subreddit)) error(400, 'invalid subreddit');
	if (!id || !/^[a-z0-9]{1,12}$/i.test(id)) error(400, 'invalid post id');

	const sub = subreddit.toLowerCase();
	const postId = id.toLowerCase();

	type Resp = [Listing<RawPost>, Listing<RawComment | RawMore>];

	try {
		const result = await redditJson<Resp>(`/r/${sub}/comments/${postId}`, { ttl: 120 });
		const all: Array<CommentView | MoreCommentsView> = (
			result[1]?.data?.children ?? []
		).map((c) => {
			if (c.kind === 't1') return rawCommentToView(c);
			return rawMoreToView(c);
		});
		for (const c of all) {
			if (c.kind === 't1') annotateMarkdown(c);
		}
		return json({ ok: true, comments: all });
	} catch (e) {
		if (e instanceof RedditError) {
			return json(
				{ ok: false, error: `Reddit responded ${e.status}: ${e.message}` },
				{ status: e.status }
			);
		}
		const msg = e instanceof Error ? e.message : 'Failed to load comments';
		return json({ ok: false, error: msg }, { status: 500 });
	}
};
