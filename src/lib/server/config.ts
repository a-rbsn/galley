/**
 * Server-side instance config (Reddit username for User-Agent identification).
 *
 * Persisted to a JSON file on disk so it survives restarts. The username
 * itself is the only thing we store — Galley needs to identify itself to
 * Reddit's API per their developer rules, and a per-instance username keeps
 * each self-hoster in their own rate-limit bucket instead of all sharing
 * one templated default.
 */

import { env } from '$env/dynamic/private';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CustomFeedView } from '$lib/types';

export interface InstanceConfig {
	redditUsername?: string;
	subreddits?: string[];
	customFeeds?: CustomFeedView[];
}

const SUB_RE = /^[a-z0-9_]{2,21}$/;
const FEED_ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MAX_SUBS = 200;
const MAX_CUSTOM_FEEDS = 24;

const CONFIG_PATH = resolveConfigPath();
let cached: InstanceConfig | null = null;
let loaded = false;

function resolveConfigPath(): string | null {
	const override = env.GALLEY_CONFIG_PATH;
	if (override === 'none') return null;
	return override ? resolve(override) : resolve('.galley-config.json');
}

function ensureLoaded(): InstanceConfig {
	if (loaded) return cached ?? {};
	loaded = true;
	if (!CONFIG_PATH || !existsSync(CONFIG_PATH)) {
		cached = {};
		return cached;
	}
	try {
		const raw = readFileSync(CONFIG_PATH, 'utf8');
		const parsed = JSON.parse(raw) as InstanceConfig;
		cached = parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		cached = {};
	}
	return cached;
}

export function getConfig(): InstanceConfig {
	return ensureLoaded();
}

export function getRedditUsername(): string | undefined {
	return ensureLoaded().redditUsername;
}

/**
 * Whether the instance has been set up. True if the user has saved a
 * username, OR if `REDDIT_USER_AGENT` is provided as an env var (e.g.
 * Docker/CI installs that pre-configure their own UA).
 */
export function isConfigured(): boolean {
	if (env.REDDIT_USER_AGENT) return true;
	return !!getRedditUsername();
}

function writeConfig(next: InstanceConfig) {
	if (CONFIG_PATH) {
		try {
			const dir = dirname(CONFIG_PATH);
			if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
			writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
		} catch (e) {
			// If the write fails the in-memory cache must NOT be updated —
			// otherwise the operator looks "configured" for the lifetime of
			// the process, which masks the failure (the next container start
			// finds an empty file and bounces them back to /setup).
			throw new Error(
				`Could not write config to ${CONFIG_PATH}: ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}
	cached = next;
}

export function setRedditUsername(username: string) {
	writeConfig({ ...ensureLoaded(), redditUsername: username });
}

export function getSubreddits(): string[] {
	const list = ensureLoaded().subreddits ?? [];
	return list.filter((s): s is string => typeof s === 'string' && SUB_RE.test(s));
}

function cleanSubreddits(input: string[], max = MAX_SUBS): string[] {
	const seen = new Set<string>();
	const cleaned: string[] = [];
	for (const raw of input) {
		if (typeof raw !== 'string') continue;
		const s = raw.trim().toLowerCase();
		if (!SUB_RE.test(s)) continue;
		if (seen.has(s)) continue;
		seen.add(s);
		cleaned.push(s);
		if (cleaned.length >= max) break;
	}
	return cleaned;
}

/**
 * Replace the persisted subreddit list. Names are lowercased, trimmed,
 * deduplicated, and capped at MAX_SUBS. Invalid names are dropped silently
 * since the API endpoint already validates upstream.
 */
export function setSubreddits(input: string[]): string[] {
	const cleaned = cleanSubreddits(input);
	const allowed = new Set(cleaned);
	const customFeeds = getCustomFeeds()
		.map((feed) => ({
			...feed,
			subreddits: feed.subreddits.filter((sub) => allowed.has(sub))
		}))
		.filter((feed) => feed.subreddits.length > 0);
	writeConfig({ ...ensureLoaded(), subreddits: cleaned, customFeeds });
	return cleaned;
}

function slugifyFeedName(name: string): string | null {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);
	if (!FEED_ID_RE.test(slug)) return null;
	return slug;
}

function uniqueFeedId(base: string, feeds: CustomFeedView[]): string {
	const used = new Set(feeds.map((feed) => feed.id));
	if (!used.has(base)) return base;
	for (let i = 2; i < 100; i += 1) {
		const next = `${base.slice(0, Math.max(1, 38 - String(i).length))}-${i}`;
		if (!used.has(next)) return next;
	}
	return `${base.slice(0, 31)}-${Date.now().toString(36)}`;
}

function cleanFeed(feed: CustomFeedView): CustomFeedView | null {
	if (!feed || typeof feed !== 'object') return null;
	const id = typeof feed.id === 'string' && FEED_ID_RE.test(feed.id) ? feed.id : null;
	const name = typeof feed.name === 'string' ? feed.name.trim().slice(0, 60) : '';
	const subreddits = Array.isArray(feed.subreddits) ? cleanSubreddits(feed.subreddits, MAX_SUBS) : [];
	if (!id || !name || subreddits.length === 0) return null;
	return { id, name, subreddits };
}

export function getCustomFeeds(): CustomFeedView[] {
	const raw = ensureLoaded().customFeeds ?? [];
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>();
	const feeds: CustomFeedView[] = [];
	for (const feed of raw) {
		const cleaned = cleanFeed(feed);
		if (!cleaned || seen.has(cleaned.id)) continue;
		seen.add(cleaned.id);
		feeds.push(cleaned);
		if (feeds.length >= MAX_CUSTOM_FEEDS) break;
	}
	return feeds;
}

export function getCustomFeed(id: string): CustomFeedView | undefined {
	return getCustomFeeds().find((feed) => feed.id === id);
}

export function createCustomFeed(name: string, subreddits: string[]): CustomFeedView {
	const cleanName = name.trim().replace(/\s+/g, ' ').slice(0, 60);
	const baseId = slugifyFeedName(cleanName);
	if (!baseId || !cleanName) throw new Error('Feed names need at least one letter or number.');

	const existing = getCustomFeeds();
	if (existing.length >= MAX_CUSTOM_FEEDS) {
		throw new Error(`Custom feeds are capped at ${MAX_CUSTOM_FEEDS}.`);
	}

	const cleanedSubs = cleanSubreddits(subreddits);
	if (cleanedSubs.length === 0) throw new Error('Pick at least one subreddit for this feed.');

	const feed: CustomFeedView = {
		id: uniqueFeedId(baseId, existing),
		name: cleanName,
		subreddits: cleanedSubs
	};
	writeConfig({ ...ensureLoaded(), customFeeds: [...existing, feed] });
	return feed;
}

export function deleteCustomFeed(id: string): boolean {
	const existing = getCustomFeeds();
	const next = existing.filter((feed) => feed.id !== id);
	if (next.length === existing.length) return false;
	writeConfig({ ...ensureLoaded(), customFeeds: next });
	return true;
}

/**
 * Reddit usernames: 3–20 chars, letters/digits/underscore/hyphen. We strip
 * common prefixes the user might paste in (`u/`, `/u/`, `@`).
 */
export function normaliseUsername(input: string): string | null {
	const trimmed = input.trim().replace(/^@/, '').replace(/^\/?u\//i, '');
	if (!/^[A-Za-z0-9_-]{3,20}$/.test(trimmed)) return null;
	return trimmed;
}
