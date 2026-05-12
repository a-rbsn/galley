import { json, type RequestHandler } from '@sveltejs/kit';
import { redditJson, RedditError, type Listing, type RawSubreddit } from '$lib/server/reddit';
import { abortedResponse, isAbortError } from '$lib/server/abort';

const AUTOCOMPLETE_TTL_SECONDS = 60 * 60;

export const GET: RequestHandler = async ({ url, request }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 1 || !/^[a-z0-9_]{1,21}$/i.test(q)) {
		return json({ results: [] });
	}

	try {
		// Reddit gated /api/subreddit_autocomplete_v2 behind OAuth — anonymous
		// callers now get a 404. /subreddits/search is the public read endpoint
		// with the same listing shape and is suitable for typeahead.
		const data = await redditJson<Listing<RawSubreddit>>(
			`/subreddits/search?q=${encodeURIComponent(q)}&include_over_18=off&limit=10`,
			{ ttl: AUTOCOMPLETE_TTL_SECONDS, signal: request.signal }
		);

		const results = data.data.children
			.filter((c): c is RawSubreddit => c.kind === 't5')
			.map((c) => ({
				name: c.data.display_name,
				prefixed: c.data.display_name_prefixed,
				title: c.data.title,
				subscribers: c.data.subscribers,
				description: c.data.public_description,
				over18: c.data.over18
			}))
			.filter((r) => !r.over18);

		return json({ results });
	} catch (err) {
		if (isAbortError(err)) return abortedResponse();
		if (err instanceof RedditError) {
			return json({ results: [], error: err.message }, { status: err.status });
		}
		const msg = err instanceof Error ? err.message : 'unknown error';
		return json({ results: [], error: msg }, { status: 500 });
	}
};
