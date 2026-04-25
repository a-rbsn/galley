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

export const load: PageServerLoad = async ({ params }) => {
	const { subreddit, id } = params;
	if (!/^[a-z0-9_]{2,21}$/i.test(subreddit)) error(400, `Invalid subreddit: ${subreddit}`);
	if (!/^[a-z0-9]{1,12}$/i.test(id)) error(400, `Invalid post id: ${id}`);

	type Resp = [Listing<RawPost>, Listing<RawComment | RawMore>];

	try {
		const result = await redditJson<Resp>(
			`/r/${subreddit.toLowerCase()}/comments/${id.toLowerCase()}`,
			{ ttl: 30 }
		);
		const postRaw = result[0]?.data?.children?.[0];
		if (!postRaw || postRaw.kind !== 't3') error(404, 'Post not found');

		const post = rawPostToView(postRaw);
		post.selftextHtml = renderMarkdown(post.selftext);

		const comments: Array<CommentView | MoreCommentsView> = (
			result[1]?.data?.children ?? []
		).map((c) => {
			if (c.kind === 't1') return rawCommentToView(c);
			return rawMoreToView(c);
		});
		for (const c of comments) {
			if (c.kind === 't1') annotateMarkdown(c);
		}

		return {
			sub: subreddit.toLowerCase(),
			id: id.toLowerCase(),
			post,
			comments
		};
	} catch (e) {
		if (e instanceof RedditError) {
			if (e.status === 404) error(404, `Post ${id} not found in r/${subreddit}.`);
			if (e.status === 403) error(403, `r/${subreddit} is private or quarantined.`);
			error(502, `Reddit responded ${e.status}: ${e.message}`);
		}
		throw e;
	}
};
