import { json, type RequestHandler } from '@sveltejs/kit';
import { getSubreddits, setSubreddits } from '$lib/server/config';

export const GET: RequestHandler = async () => {
	return json({ subs: getSubreddits() });
};

export const PUT: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid json' }, { status: 400 });
	}
	if (!body || typeof body !== 'object' || !Array.isArray((body as { subs?: unknown }).subs)) {
		return json({ error: 'expected { subs: string[] }' }, { status: 400 });
	}
	try {
		const saved = setSubreddits((body as { subs: string[] }).subs);
		return json({ subs: saved });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'failed to save';
		return json({ error: msg }, { status: 500 });
	}
};
