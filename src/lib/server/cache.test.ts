import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { GALLEY_CACHE_PATH: 'none' } }));

const { RedditResponseCache } = await import('./cache');

const tempDirs: string[] = [];

function tempDbPath(): string {
	const dir = mkdtempSync(join(tmpdir(), 'galley-cache-test-'));
	tempDirs.push(dir);
	return join(dir, 'cache.sqlite');
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe('RedditResponseCache', () => {
	it('returns fresh, stale, then expired entries from memory', () => {
		const cache = new RedditResponseCache({ path: null });
		cache.set('k', { value: 1 }, { ttlSeconds: 10, swrSeconds: 20 }, 1000);

		expect(cache.get('k', 5000)).toEqual({ status: 'fresh', data: { value: 1 } });
		expect(cache.get('k', 15000)).toEqual({ status: 'stale', data: { value: 1 } });
		expect(cache.get('k', 31000)).toBeNull();
		cache.close();
	});

	it('persists entries to SQLite across cache instances', () => {
		const path = tempDbPath();
		const first = new RedditResponseCache({ path });
		first.set('k', { value: 2 }, { ttlSeconds: 10, swrSeconds: 20 }, 1000);
		first.close();

		const second = new RedditResponseCache({ path });
		expect(second.get('k', 5000)).toEqual({ status: 'fresh', data: { value: 2 } });
		second.close();
	});

	it('prunes expired persistent entries', () => {
		const path = tempDbPath();
		const cache = new RedditResponseCache({ path });
		cache.set('k', { value: 3 }, { ttlSeconds: 1, swrSeconds: 1 }, 1000);
		cache.prune(4000);
		cache.close();

		const next = new RedditResponseCache({ path });
		expect(next.get('k', 4000)).toBeNull();
		next.close();
	});
});
