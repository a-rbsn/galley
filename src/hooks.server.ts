import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isConfigured } from '$lib/server/config';

const ADMIN_REALM = 'Galley admin';

function needsAdmin(path: string): boolean {
	return path === '/setup' || path.startsWith('/settings') || path === '/api/subs';
}

function isAdminRequest(request: Request): boolean {
	const password = env.GALLEY_ADMIN_PASSWORD;
	if (!password) return true;

	const header = request.headers.get('authorization') ?? '';
	const match = /^Basic\s+(.+)$/i.exec(header);
	if (!match) return false;
	try {
		const decoded = atob(match[1]);
		const sep = decoded.indexOf(':');
		const supplied = sep >= 0 ? decoded.slice(sep + 1) : decoded;
		return supplied === password;
	} catch {
		return false;
	}
}

function adminRequired(): Response {
	return new Response('Authentication required', {
		status: 401,
		headers: {
			'WWW-Authenticate': `Basic realm="${ADMIN_REALM}", charset="UTF-8"`
		}
	});
}

/**
 * First-run gate. Until the operator has either set REDDIT_USER_AGENT or
 * saved a username via /setup, every page redirects to /setup. We let the
 * setup route itself + its form action through unconditionally; static
 * assets and SvelteKit internals (paths starting with /_app, /favicon, etc.)
 * are handled by the framework before this hook runs.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (needsAdmin(path) && !isAdminRequest(event.request)) {
		return adminRequired();
	}

	// /api/autocomplete is allowed pre-configuration so the setup screen's
	// subreddit picker works during step 2.
	const allowed = path === '/setup' || path.startsWith('/api/autocomplete');
	if (!isConfigured() && !allowed) {
		throw redirect(303, '/setup');
	}
	const response = await resolve(event);
	if (env.GALLEY_ALLOW_INDEXING !== '1') {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}
	return response;
};
