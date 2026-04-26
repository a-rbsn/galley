import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import {
	getRedditUsername,
	isConfigured,
	normaliseUsername,
	setRedditUsername
} from '$lib/server/config';

export const load: PageServerLoad = async ({ url }) => {
	const step = url.searchParams.get('step') === 'subs' ? 'subs' : 'username';
	const configured = isConfigured();
	// /setup is a one-time flow. If they're already configured and didn't
	// just submit step 1, send them to the front page — re-picking subs is
	// what /settings is for.
	if (configured && step !== 'subs') throw redirect(303, '/');
	return {
		step,
		configured,
		current: getRedditUsername() ?? ''
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
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
		throw redirect(303, '/setup?step=subs');
	}
};
