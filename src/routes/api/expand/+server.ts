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

export const GET: RequestHandler = async ({ url }) => {
	const sub = (url.searchParams.get('sub') ?? '').toLowerCase();
	const postId = (url.searchParams.get('post') ?? '').toLowerCase();
	const parentId = (url.searchParams.get('parent') ?? '').toLowerCase();

	if (!/^[a-z0-9_]{2,21}$/.test(sub)) error(400, 'invalid sub');
	if (!/^[a-z0-9]{1,12}$/.test(postId)) error(400, 'invalid post id');
	if (!/^[a-z0-9]{1,12}$/.test(parentId)) error(400, 'invalid parent id');

	type Resp = [Listing<RawPost>, Listing<RawComment | RawMore>];

	try {
		const result = await redditJson<Resp>(`/r/${sub}/comments/${postId}/_/${parentId}`, {
			ttl: 30
		});
		const things = result[1]?.data?.children ?? [];

		// The branch endpoint returns the parent comment with its replies. We
		// surface the parent's replies directly — that's what replaces the
		// "load more" placeholder. If the parent itself isn't there (rare),
		// fall back to whatever the listing gave us.
		let replies: Array<CommentView | MoreCommentsView>;
		const top = things[0];
		if (top?.kind === 't1') {
			const view = rawCommentToView(top);
			annotateMarkdown(view);
			replies = view.replies;
		} else {
			replies = things.map((t) => {
				if (t.kind === 't1') {
					const v = rawCommentToView(t);
					annotateMarkdown(v);
					return v;
				}
				return rawMoreToView(t as RawMore);
			});
		}

		return json({ replies });
	} catch (e) {
		if (e instanceof RedditError) {
			return json({ error: e.message }, { status: e.status });
		}
		const msg = e instanceof Error ? e.message : 'unknown';
		return json({ error: msg }, { status: 500 });
	}
};
