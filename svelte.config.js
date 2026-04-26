import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// adapter-node produces a self-contained Node server (build/index.js)
		// that runs anywhere Node 20+ is available, including the Docker image.
		adapter: adapter()
	}
};

export default config;
