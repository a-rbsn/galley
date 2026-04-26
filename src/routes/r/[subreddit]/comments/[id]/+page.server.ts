import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	redditJson,
	rawPostToView,
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

export type CommentsResult =
	| { ok: true; comments: Array<CommentView | MoreCommentsView> }
	| { ok: false; error: string };

export const load: PageServerLoad = async ({ params }) => {
	const { subreddit, id } = params;
	if (!/^[a-z0-9_]{2,21}$/i.test(subreddit)) error(400, `Invalid subreddit: ${subreddit}`);
	if (!/^[a-z0-9]{1,12}$/i.test(id)) error(400, `Invalid post id: ${id}`);

	const sub = subreddit.toLowerCase();
	const postId = id.toLowerCase();

	type CommentsResp = [Listing<RawPost>, Listing<RawComment | RawMore>];

	// Fire both calls in parallel. The post-only endpoint is much faster than
	// /comments/<id> (no comment-tree assembly), so we await it for first
	// paint and stream comments in once they're ready.
	const postPromise = redditJson<Listing<RawPost>>(`/by_id/t3_${postId}`, {
		ttl: 300
	});
	const commentsRawPromise = redditJson<CommentsResp>(
		`/r/${sub}/comments/${postId}`,
		{ ttl: 120 }
	);

	let post;
	try {
		const postListing = await postPromise;
		const postRaw = postListing?.data?.children?.[0];
		if (!postRaw || postRaw.kind !== 't3') error(404, `Post ${id} not found in r/${sub}.`);
		post = rawPostToView(postRaw);
		post.selftextHtml = renderMarkdown(post.selftext);
	} catch (e) {
		if (e instanceof RedditError) {
			if (e.status === 404) error(404, `Post ${id} not found in r/${sub}.`);
			if (e.status === 403) error(403, `r/${sub} is private or quarantined.`);
			error(502, `Reddit responded ${e.status}: ${e.message}`);
		}
		throw e;
	}

	const comments: Promise<CommentsResult> = (async () => {
		try {
			const result = await commentsRawPromise;
			const all: Array<CommentView | MoreCommentsView> = (
				result[1]?.data?.children ?? []
			).map((c) => {
				if (c.kind === 't1') return rawCommentToView(c);
				return rawMoreToView(c);
			});
			for (const c of all) {
				if (c.kind === 't1') annotateMarkdown(c);
			}
			return { ok: true, comments: all };
		} catch (e) {
			const msg =
				e instanceof RedditError
					? `Reddit responded ${e.status}: ${e.message}`
					: e instanceof Error
						? e.message
						: 'Failed to load comments';
			return { ok: false, error: msg };
		}
	})();

	return {
		sub,
		id: postId,
		post,
		comments
	};
};
