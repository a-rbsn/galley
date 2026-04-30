import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	createCustomFeed,
	deleteCustomFeed,
	getCustomFeeds,
	getRedditUsername,
	normaliseUsername,
	setRedditUsername
} from '$lib/server/config';

export const load: PageServerLoad = async () => {
	return {
		redditUsername: getRedditUsername() ?? '',
		customFeeds: getCustomFeeds(),
		// When REDDIT_USER_AGENT is set as an env var (Docker/CI installs),
		// the username field is informational only — the env var wins.
		envOverride: !!env.REDDIT_USER_AGENT
	};
};

export const actions: Actions = {
	username: async ({ request }) => {
		const data = await request.formData();
		const raw = (data.get('username') ?? '').toString();
		const username = normaliseUsername(raw);
		if (!username) {
			return fail(400, {
				value: raw,
				error: 'Reddit usernames are 3–20 characters: letters, digits, underscore, hyphen.'
			});
		}
		try {
			setRedditUsername(username);
		} catch (e) {
			return fail(500, {
				value: raw,
				error: e instanceof Error ? e.message : 'Could not save the config file.'
			});
		}
		return { saved: true, value: username };
	},
	createFeed: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get('name') ?? '').toString();
		const subreddits = data
			.getAll('subs')
			.map((value) => value.toString())
			.filter(Boolean);
		try {
			const feed = createCustomFeed(name, subreddits);
			return { feedSaved: true, feedId: feed.id };
		} catch (e) {
			return fail(400, {
				feedName: name,
				feedError: e instanceof Error ? e.message : 'Could not create feed.'
			});
		}
	},
	deleteFeed: async ({ request }) => {
		const data = await request.formData();
		const id = (data.get('id') ?? '').toString();
		try {
			deleteCustomFeed(id);
			return { feedDeleted: true };
		} catch (e) {
			return fail(500, {
				feedError: e instanceof Error ? e.message : 'Could not delete feed.'
			});
		}
	}
};
