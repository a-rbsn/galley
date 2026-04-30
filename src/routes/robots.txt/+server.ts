import { env } from '$env/dynamic/private';

export const GET = () => {
	const body =
		env.GALLEY_ALLOW_INDEXING === '1'
			? 'User-agent: *\nDisallow:\n'
			: 'User-agent: *\nDisallow: /\n';

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'max-age=3600'
		}
	});
};
