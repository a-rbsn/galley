import { json, error, type RequestHandler } from '@sveltejs/kit';
import {
	redditJson,
	redditMoreChildren,
	rawCommentToView,
	rawMoreToView,
	RedditError,
	type Listing,
	type RawComment,
	type RawMore,
	type RawPost
} from '$lib/server/reddit';
import { abortedResponse, isAbortError } from '$lib/server/abort';
import { renderMarkdown } from '$lib/server/markdown';
import type { CommentView, MoreCommentsView } from '$lib/types';

function annotateMarkdown(c: CommentView) {
	c.bodyHtml = renderMarkdown(c.body);
	for (const r of c.replies) {
		if (r.kind === 't1') annotateMarkdown(r);
	}
}

/**
 * Reassemble a flat morechildren response into a tree. The endpoint returns
 * a flat array of t1/more things; a comment's parent is identified by its
 * `parent_id`. Top-level results are the children of the post itself.
 */
function buildTreeFromFlat(
	things: Array<RawComment | RawMore>
): Array<CommentView | MoreCommentsView> {
	const rawByName = new Map<string, RawComment>();
	for (const t of things) {
		if (t.kind === 't1') rawByName.set(t.data.name, t);
	}

	const viewByName = new Map<string, CommentView>();
	const top: Array<CommentView | MoreCommentsView> = [];

	for (const t of things) {
		let view: CommentView | MoreCommentsView;
		if (t.kind === 't1') {
			// Strip nested replies — morechildren never inlines them; we attach
			// children below by walking parent_id.
			const stripped: RawComment = { ...t, data: { ...t.data, replies: '' } };
			const cv = rawCommentToView(stripped);
			viewByName.set(t.data.name, cv);
			view = cv;
		} else {
			view = rawMoreToView(t);
		}
		const parentRaw = rawByName.get(t.data.parent_id);
		if (parentRaw) {
			const parentView = viewByName.get(parentRaw.data.name);
			if (parentView) parentView.replies.push(view);
		} else {
			top.push(view);
		}
	}

	return top;
}

export const GET: RequestHandler = async ({ url, request }) => {
	const sub = (url.searchParams.get('sub') ?? '').toLowerCase();
	const postId = (url.searchParams.get('post') ?? '').toLowerCase();
	const parent = url.searchParams.get('parent') ?? '';

	if (!/^[a-z0-9_]{2,21}$/.test(sub)) error(400, 'invalid sub');
	if (!/^[a-z0-9]{1,12}$/.test(postId)) error(400, 'invalid post id');

	const parentMatch = /^(t[1-6])_([a-z0-9]{1,12})$/.exec(parent);
	if (!parentMatch) error(400, 'invalid parent');
	const parentKind = parentMatch[1];
	const parentRawId = parentMatch[2];

	try {
		let replies: Array<CommentView | MoreCommentsView>;

		if (parentKind === 't3') {
			// Top-level "more": the placeholder hangs off the post itself, so
			// Reddit's branch endpoint can't help — use morechildren with the
			// explicit child list the client passed through.
			const childrenParam = url.searchParams.get('children') ?? '';
			const children = childrenParam
				.split(',')
				.map((s) => s.trim())
				.filter((s) => /^[a-z0-9]{1,12}$/.test(s));
			if (children.length === 0) {
				return json({ replies: [] });
			}
			const things = await redditMoreChildren(`t3_${postId}`, children, {
				ttl: 60,
				signal: request.signal
			});
			replies = buildTreeFromFlat(things);
			for (const r of replies) {
				if (r.kind === 't1') annotateMarkdown(r);
			}
		} else if (parentKind === 't1') {
			// Nested "more" (or "continue thread"): the branch endpoint returns
			// the parent comment with its full reply subtree expanded.
			type Resp = [Listing<RawPost>, Listing<RawComment | RawMore>];
			const result = await redditJson<Resp>(
				`/r/${sub}/comments/${postId}/_/${parentRawId}`,
				{ ttl: 60, signal: request.signal }
			);
			const things = result[1]?.data?.children ?? [];
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
		} else {
			error(400, 'unsupported parent kind');
		}

		return json({ replies });
	} catch (e) {
		if (isAbortError(e)) return abortedResponse();
		if (e instanceof RedditError) {
			return json({ error: e.message }, { status: e.status });
		}
		const msg = e instanceof Error ? e.message : 'unknown';
		return json({ error: msg }, { status: 500 });
	}
};
