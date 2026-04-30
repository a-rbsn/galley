/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `galley-shell-${version}`;
const ASSETS = new Set([...build, ...files]);

function offlineResponse() {
	return new Response(
		`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Galley offline</title>
		<style>
			body {
				margin: 0;
				min-height: 100vh;
				display: grid;
				place-items: center;
				background: #f6f1e6;
				color: #28231f;
				font: 16px/1.5 Georgia, "Times New Roman", serif;
			}
			main { max-width: 36rem; padding: 2rem; }
			h1 { font-size: 2rem; font-weight: 400; margin: 0 0 0.75rem; }
			p { margin: 0; color: #665f57; }
		</style>
	</head>
	<body>
		<main>
			<h1>Galley is offline.</h1>
			<p>The app shell is cached, but this page needs a live Reddit fetch.</p>
		</main>
	</body>
</html>`,
		{
			status: 503,
			headers: { 'Content-Type': 'text/html; charset=utf-8' }
		}
	);
}

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([...ASSETS]))
			.then(() => worker.skipWaiting())
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => worker.clients.claim())
	);
});

worker.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== worker.location.origin) return;

	if (ASSETS.has(url.pathname)) {
		event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
		return;
	}

	if (event.request.mode === 'navigate') {
		event.respondWith(fetch(event.request).catch(() => offlineResponse()));
	}
});
