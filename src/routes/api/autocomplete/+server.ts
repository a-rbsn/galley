import { json, type RequestHandler } from '@sveltejs/kit';
import { redditJson, RedditError, type Listing, type RawSubreddit } from '$lib/server/reddit';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 1 || !/^[a-z0-9_]{1,21}$/i.test(q)) {
		return json({ results: [] });
	}

	try {
		const data = await redditJson<Listing<RawSubreddit>>(
			`/api/subreddit_autocomplete_v2?query=${encodeURIComponent(
				q
			)}&include_over_18=false&include_profiles=false&typeahead_active=true&limit=10`,
			{ ttl: 600 }
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
		if (err instanceof RedditError) {
			return json({ results: [], error: err.message }, { status: err.status });
		}
		const msg = err instanceof Error ? err.message : 'unknown error';
		return json({ results: [], error: msg }, { status: 500 });
	}
};
