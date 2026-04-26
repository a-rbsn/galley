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

export interface InstanceConfig {
	redditUsername?: string;
}

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

export function setRedditUsername(username: string) {
	const next = { ...ensureLoaded(), redditUsername: username };
	cached = next;
	if (!CONFIG_PATH) return;
	try {
		const dir = dirname(CONFIG_PATH);
		if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
		writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
	} catch (e) {
		throw new Error(
			`Could not write config to ${CONFIG_PATH}: ${e instanceof Error ? e.message : String(e)}`
		);
	}
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
