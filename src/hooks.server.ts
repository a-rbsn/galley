import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { isConfigured } from '$lib/server/config';

/**
 * First-run gate. Until the operator has either set REDDIT_USER_AGENT or
 * saved a username via /setup, every page redirects to /setup. We let the
 * setup route itself + its form action through unconditionally; static
 * assets and SvelteKit internals (paths starting with /_app, /favicon, etc.)
 * are handled by the framework before this hook runs.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	// /api/autocomplete is allowed pre-configuration so the setup screen's
	// subreddit picker works during step 2.
	const allowed = path === '/setup' || path.startsWith('/api/autocomplete');
	if (!isConfigured() && !allowed) {
		throw redirect(303, '/setup');
	}
	return resolve(event);
};
