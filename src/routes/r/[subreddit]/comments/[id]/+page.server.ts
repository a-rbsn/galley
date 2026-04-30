import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	redditJson,
	rawPostToView,
	RedditError,
	type Listing,
	type RawPost
} from '$lib/server/reddit';
import { renderMarkdown } from '$lib/server/markdown';

export const load: PageServerLoad = async ({ params, request }) => {
	const { subreddit, id } = params;
	if (!/^[a-z0-9_]{2,21}$/i.test(subreddit)) error(400, `Invalid subreddit: ${subreddit}`);
	if (!/^[a-z0-9]{1,12}$/i.test(id)) error(400, `Invalid post id: ${id}`);

	const sub = subreddit.toLowerCase();
	const postId = id.toLowerCase();

	try {
		const postListing = await redditJson<Listing<RawPost>>(`/by_id/t3_${postId}`, {
			ttl: 300,
			signal: request.signal
		});
		const postRaw = postListing?.data?.children?.[0];
		if (!postRaw || postRaw.kind !== 't3') error(404, `Post ${id} not found in r/${sub}.`);
		const post = rawPostToView(postRaw);
		post.selftextHtml = renderMarkdown(post.selftext);
		return { sub, id: postId, post };
	} catch (e) {
		if (e instanceof RedditError) {
			if (e.status === 404) error(404, `Post ${id} not found in r/${sub}.`);
			if (e.status === 403) error(403, `r/${sub} is private or quarantined.`);
			error(502, `Reddit responded ${e.status}: ${e.message}`);
		}
		throw e;
	}
};
