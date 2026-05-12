import { env } from '$env/dynamic/private';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

const DEFAULT_DISK_MAX_BYTES = 100 * 1024 * 1024;
const DEFAULT_MEMORY_MAX_BYTES = 32 * 1024 * 1024;
const DEFAULT_ENTRY_MAX_BYTES = 8 * 1024 * 1024;
const PRUNE_DEBOUNCE_MS = 1000;

interface CacheRow {
	key: string;
	fetched_at: number;
	expires_at: number;
	swr_until: number;
	last_accessed_at: number;
	size_bytes: number;
	body: Buffer;
}

interface MemoryEntry {
	fetchedAt: number;
	expiresAt: number;
	swrUntil: number;
	sizeBytes: number;
	data: unknown;
}

export interface CacheLookup<T = unknown> {
	status: 'fresh' | 'stale';
	data: T;
}

export interface CacheSetOptions {
	ttlSeconds: number;
	swrSeconds: number;
}

export interface RedditResponseCacheOptions {
	path: string | null;
	diskMaxBytes?: number;
	memoryMaxBytes?: number;
	entryMaxBytes?: number;
}

function parseBytes(value: string | undefined, fallback: number): number {
	if (!value) return fallback;
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function resolveCachePath(): string | null {
	const override = env.GALLEY_CACHE_PATH;
	if (override === 'none' || env.GALLEY_CACHE_DISABLE === '1') return null;
	return override ? resolve(override) : resolve('.galley-cache.sqlite');
}

function cacheOptionsFromEnv(): RedditResponseCacheOptions {
	return {
		path: resolveCachePath(),
		diskMaxBytes: parseBytes(env.GALLEY_CACHE_MAX_BYTES, DEFAULT_DISK_MAX_BYTES),
		memoryMaxBytes: parseBytes(
			env.GALLEY_CACHE_MEMORY_MAX_BYTES,
			DEFAULT_MEMORY_MAX_BYTES
		),
		entryMaxBytes: parseBytes(env.GALLEY_CACHE_ENTRY_MAX_BYTES, DEFAULT_ENTRY_MAX_BYTES)
	};
}

export class RedditResponseCache {
	private db: Database.Database | null = null;
	private dbDisabled = false;
	private pruneTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly memory = new Map<string, MemoryEntry>();
	private memoryBytes = 0;
	private readonly path: string | null;
	private readonly diskMaxBytes: number;
	private readonly memoryMaxBytes: number;
	private readonly entryMaxBytes: number;

	constructor(options: RedditResponseCacheOptions) {
		this.path = options.path;
		this.diskMaxBytes = options.diskMaxBytes ?? DEFAULT_DISK_MAX_BYTES;
		this.memoryMaxBytes = options.memoryMaxBytes ?? DEFAULT_MEMORY_MAX_BYTES;
		this.entryMaxBytes = options.entryMaxBytes ?? DEFAULT_ENTRY_MAX_BYTES;
	}

	get<T = unknown>(key: string, now = Date.now()): CacheLookup<T> | null {
		const memoryEntry = this.memory.get(key);
		if (memoryEntry) {
			if (memoryEntry.swrUntil <= now) {
				this.deleteMemory(key);
				this.deletePersistent(key);
				return null;
			}
			this.touchMemory(key, memoryEntry);
			return {
				status: memoryEntry.expiresAt > now ? 'fresh' : 'stale',
				data: memoryEntry.data as T
			};
		}

		const db = this.openDb();
		if (!db) return null;

		try {
			const row = db
				.prepare('select * from reddit_cache where key = ?')
				.get(key) as CacheRow | undefined;
			if (!row) return null;
			if (row.swr_until <= now) {
				this.deletePersistent(key);
				return null;
			}

			const data = JSON.parse(gunzipSync(row.body).toString('utf8')) as T;
			db.prepare('update reddit_cache set last_accessed_at = ? where key = ?').run(now, key);
			this.setMemory(
				key,
				{
					fetchedAt: row.fetched_at,
					expiresAt: row.expires_at,
					swrUntil: row.swr_until,
					sizeBytes: row.size_bytes,
					data
				},
				now
			);
			return {
				status: row.expires_at > now ? 'fresh' : 'stale',
				data
			};
		} catch {
			this.deletePersistent(key);
			return null;
		}
	}

	set(key: string, data: unknown, options: CacheSetOptions, now = Date.now()) {
		const json = JSON.stringify(data);
		const body = gzipSync(json);
		const sizeBytes = body.byteLength;
		const entry: MemoryEntry = {
			fetchedAt: now,
			expiresAt: now + options.ttlSeconds * 1000,
			swrUntil: now + (options.ttlSeconds + options.swrSeconds) * 1000,
			sizeBytes,
			data
		};

		this.setMemory(key, entry, now);

		if (sizeBytes > this.entryMaxBytes) {
			this.deletePersistent(key);
			return;
		}

		const db = this.openDb();
		if (!db) return;

		try {
			db.prepare(
				`insert into reddit_cache
					(key, fetched_at, expires_at, swr_until, last_accessed_at, size_bytes, body)
				 values (?, ?, ?, ?, ?, ?, ?)
				 on conflict(key) do update set
					fetched_at = excluded.fetched_at,
					expires_at = excluded.expires_at,
					swr_until = excluded.swr_until,
					last_accessed_at = excluded.last_accessed_at,
					size_bytes = excluded.size_bytes,
					body = excluded.body`
			).run(
				key,
				entry.fetchedAt,
				entry.expiresAt,
				entry.swrUntil,
				now,
				sizeBytes,
				body
			);
			this.schedulePrune();
		} catch {
			this.disableDb();
		}
	}

	prune(now = Date.now()) {
		this.pruneMemory(now);
		const db = this.openDb();
		if (!db) return;

		try {
			db.prepare('delete from reddit_cache where swr_until <= ?').run(now);
			let total = (
				db.prepare('select coalesce(sum(size_bytes), 0) as total from reddit_cache').get() as {
					total: number;
				}
			).total;

			while (total > this.diskMaxBytes) {
				const rows = db
					.prepare(
						'select key, size_bytes from reddit_cache order by last_accessed_at asc limit 100'
					)
					.all() as Array<{ key: string; size_bytes: number }>;
				if (rows.length === 0) break;
				const deleteMany = db.transaction((keys: string[]) => {
					const stmt = db.prepare('delete from reddit_cache where key = ?');
					for (const key of keys) stmt.run(key);
				});
				deleteMany(rows.map((row) => row.key));
				for (const row of rows) total -= row.size_bytes;
			}
		} catch {
			this.disableDb();
		}
	}

	close() {
		if (this.pruneTimer) {
			clearTimeout(this.pruneTimer);
			this.pruneTimer = null;
		}
		this.db?.close();
		this.db = null;
	}

	clearMemory() {
		this.memory.clear();
		this.memoryBytes = 0;
	}

	private openDb(): Database.Database | null {
		if (!this.path || this.dbDisabled) return null;
		if (this.db) return this.db;

		try {
			const dir = dirname(this.path);
			if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
			const db = new Database(this.path);
			db.pragma('journal_mode = WAL');
			db.pragma('synchronous = NORMAL');
			db.pragma('temp_store = MEMORY');
			db.exec(`
				create table if not exists reddit_cache (
					key text primary key,
					fetched_at integer not null,
					expires_at integer not null,
					swr_until integer not null,
					last_accessed_at integer not null,
					size_bytes integer not null,
					body blob not null
				);
				create index if not exists reddit_cache_expires_at_idx on reddit_cache(expires_at);
				create index if not exists reddit_cache_swr_until_idx on reddit_cache(swr_until);
				create index if not exists reddit_cache_last_accessed_at_idx on reddit_cache(last_accessed_at);
			`);
			this.db = db;
			return db;
		} catch {
			this.disableDb();
			return null;
		}
	}

	private disableDb() {
		try {
			this.db?.close();
		} catch {
			// Ignore close failures while disabling persistence.
		}
		this.db = null;
		this.dbDisabled = true;
	}

	private schedulePrune() {
		if (this.pruneTimer) return;
		this.pruneTimer = setTimeout(() => {
			this.pruneTimer = null;
			this.prune();
		}, PRUNE_DEBOUNCE_MS);
	}

	private setMemory(key: string, entry: MemoryEntry, now = Date.now()) {
		this.deleteMemory(key);
		if (entry.sizeBytes > this.memoryMaxBytes) return;
		this.memory.set(key, entry);
		this.memoryBytes += entry.sizeBytes;
		this.pruneMemory(now);
	}

	private touchMemory(key: string, entry: MemoryEntry) {
		this.memory.delete(key);
		this.memory.set(key, entry);
	}

	private deleteMemory(key: string) {
		const existing = this.memory.get(key);
		if (!existing) return;
		this.memory.delete(key);
		this.memoryBytes -= existing.sizeBytes;
	}

	private pruneMemory(now = Date.now()) {
		for (const [key, entry] of this.memory) {
			if (entry.swrUntil <= now) this.deleteMemory(key);
		}
		while (this.memoryBytes > this.memoryMaxBytes) {
			const oldest = this.memory.keys().next().value;
			if (oldest === undefined) break;
			this.deleteMemory(oldest);
		}
	}

	private deletePersistent(key: string) {
		const db = this.openDb();
		if (!db) return;
		try {
			db.prepare('delete from reddit_cache where key = ?').run(key);
		} catch {
			this.disableDb();
		}
	}
}

export const redditResponseCache = new RedditResponseCache(cacheOptionsFromEnv());
