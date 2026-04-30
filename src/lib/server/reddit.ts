/**
 * Reddit JSON data layer (server-only).
 *
 * All Reddit access goes through redditJson(). Anywhere else in the app
 * that needs Reddit data should call this from a +page.server.ts /
 * +server.ts module so requests stay server-side and the cache is
 * shared across pages.
 *
 * The cache is stale-while-revalidate: within `ttl` we serve cached
 * values directly; past `ttl` but inside `swr` we serve the stale value
 * immediately and kick off a background refresh; past `ttl + swr` we
 * fetch fresh and block. Survives restarts via a JSON file on disk.
 */

import { env } from '$env/dynamic/private';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { abortable, throwIfAborted } from './abort';
import { getRedditUsername } from './config';
import type { CommentView, MoreCommentsView, PostKind, PostView } from '$lib/types';

const FALLBACK_USER_AGENT = 'web:io.galley.app:v0.1.0 (self-hosted)';
const FETCH_TIMEOUT_MS = 8000;

/**
 * Build the User-Agent string Reddit's API rules expect. Priority:
 *   1. REDDIT_USER_AGENT env var (Docker/CI installs that bring their own)
 *   2. Username from .galley-config.json (set via the /setup flow)
 *   3. Generic fallback — works, but groups all unconfigured instances into
 *      one shared rate-limit bucket. The /setup screen exists to avoid this.
 */
function buildUserAgent(): string {
	if (env.REDDIT_USER_AGENT) return env.REDDIT_USER_AGENT;
	const username = getRedditUsername();
	if (username) return `web:io.galley.app:v0.1.0 (by /u/${username})`;
	return FALLBACK_USER_AGENT;
}
const MAX_CACHE_ENTRIES = 500;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PERSIST_DEBOUNCE_MS = 1000;

type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const CACHE_PATH = resolveCachePath();

function resolveCachePath(): string | null {
	const override = env.GALLEY_CACHE_PATH;
	if (override === 'none' || env.GALLEY_CACHE_DISABLE === '1') return null;
	return override ? resolve(override) : resolve('.galley-cache.json');
}

let persistDisabled = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function loadCacheFromDisk() {
	if (!CACHE_PATH || !existsSync(CACHE_PATH)) return;
	try {
		const raw = readFileSync(CACHE_PATH, 'utf8');
		const parsed = JSON.parse(raw) as Array<[string, CacheEntry]>;
		if (!Array.isArray(parsed)) return;
		const cutoff = Date.now() - MAX_CACHE_AGE_MS;
		const entries = parsed
			.filter(
				(entry): entry is [string, CacheEntry] =>
					Array.isArray(entry) &&
					typeof entry[0] === 'string' &&
					!!entry[1] &&
					typeof entry[1].at === 'number' &&
					entry[1].at >= cutoff
			)
			.sort((a, b) => a[1].at - b[1].at)
			.slice(-MAX_CACHE_ENTRIES);
		for (const [k, v] of entries) {
			cache.set(k, v);
		}
	} catch {
		// Corrupt cache file — ignore, we'll rewrite on next persist.
	}
}

function pruneCache() {
	const cutoff = Date.now() - MAX_CACHE_AGE_MS;
	for (const [key, entry] of cache) {
		if (entry.at < cutoff) cache.delete(key);
	}
	while (cache.size > MAX_CACHE_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest === undefined) break;
		cache.delete(oldest);
	}
}

function schedulePersist() {
	if (!CACHE_PATH || persistDisabled) return;
	if (persistTimer) return;
	persistTimer = setTimeout(() => {
		persistTimer = null;
		let tmpPath: string | null = null;
		try {
			pruneCache();
			const dir = dirname(CACHE_PATH);
			if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
			tmpPath = `${CACHE_PATH}.${process.pid}.${Date.now()}.tmp`;
			writeFileSync(tmpPath, JSON.stringify([...cache]));
			renameSync(tmpPath, CACHE_PATH);
		} catch {
			if (tmpPath) {
				try {
					unlinkSync(tmpPath);
				} catch {
					// Best-effort cleanup only.
				}
			}
			// Probably read-only filesystem (some serverless hosts). Stop trying.
			persistDisabled = true;
		}
	}, PERSIST_DEBOUNCE_MS);
}

loadCacheFromDisk();

export interface FetchOptions {
	/**
	 * Cache freshness, in seconds. Within this window the cached value is
	 * served directly without a network call. Default: 60.
	 */
	ttl?: number;
	/**
	 * How long past `ttl` we'll still serve a stale cached value while a
	 * background refresh runs. Default: 1800 (30 minutes).
	 */
	swr?: number;
	/** Skip cache lookup for this call (used by background revalidation). */
	skipCache?: boolean;
	/** Abort waiting for this response when the caller no longer needs it. */
	signal?: AbortSignal;
}

export class RedditError extends Error {
	status: number;
	retryAfter?: number;

	constructor(message: string, status: number, retryAfter?: number) {
		super(message);
		this.name = 'RedditError';
		this.status = status;
		this.retryAfter = retryAfter;
	}
}

function buildUrl(path: string): string {
	const p = path.startsWith('/') ? path : '/' + path;
	const qIdx = p.indexOf('?');
	let pathPart = qIdx >= 0 ? p.slice(0, qIdx) : p;
	const queryPart = qIdx >= 0 ? p.slice(qIdx + 1) : '';

	// /api/* endpoints (e.g. morechildren, autocomplete) shouldn't get a
	// .json suffix — only listing-style paths.
	if (!/\.json$/.test(pathPart) && !pathPart.startsWith('/api/')) {
		pathPart = pathPart.replace(/\/$/, '') + '.json';
	}
	const params = new URLSearchParams(queryPart);
	if (!params.has('raw_json')) params.set('raw_json', '1');
	const qs = params.toString();
	return `https://www.reddit.com${pathPart}${qs ? '?' + qs : ''}`;
}

function setCache(key: string, data: unknown) {
	if (cache.has(key)) cache.delete(key);
	cache.set(key, { at: Date.now(), data });
	pruneCache();
	schedulePersist();
}

async function fetchFresh<T>(url: string): Promise<T> {
	const existing = inflight.get(url) as Promise<T> | undefined;
	if (existing) return existing;

	const userAgent = buildUserAgent();
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	const promise = (async () => {
		try {
			const res = await fetch(url, {
				headers: { 'User-Agent': userAgent, Accept: 'application/json' },
				signal: controller.signal
			});
			if (res.status === 429) {
				const retryHeader = res.headers.get('Retry-After');
				const retryAfter = retryHeader ? Number(retryHeader) : undefined;
				throw new RedditError(
					`Reddit rate-limited the request${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
					429,
					retryAfter
				);
			}
			if (!res.ok) {
				throw new RedditError(
					`Reddit responded ${res.status} ${res.statusText}`,
					res.status
				);
			}
			const data = (await res.json()) as T;
			setCache(url, data);
			return data;
		} catch (e) {
			if (e instanceof Error && e.name === 'AbortError') {
				throw new RedditError(`Reddit request timed out after ${FETCH_TIMEOUT_MS}ms`, 504);
			}
			throw e;
		} finally {
			clearTimeout(timeoutId);
			inflight.delete(url);
		}
	})();

	inflight.set(url, promise);
	return promise;
}

function revalidate(url: string) {
	if (inflight.has(url)) return;
	void fetchFresh(url).catch(() => {
		// Background refresh failures are silent — caller already got stale data.
	});
}

export async function redditJson<T = unknown>(
	path: string,
	opts: FetchOptions = {}
): Promise<T> {
	const ttl = opts.ttl ?? 60;
	const swr = opts.swr ?? 1800;
	const url = buildUrl(path);
	throwIfAborted(opts.signal);

	if (!opts.skipCache) {
		const cached = cache.get(url);
		if (cached) {
			const ageSec = (Date.now() - cached.at) / 1000;
			if (ageSec < ttl) return cached.data as T;
			if (ageSec < ttl + swr) {
				revalidate(url);
				return cached.data as T;
			}
		}
	}

	return abortable(fetchFresh<T>(url), opts.signal);
}

/**
 * Reddit's `/api/morechildren` endpoint. Used to expand a top-level "load
 * more" placeholder — the branch endpoint (`/r/<sub>/comments/<id>/_/<cid>`)
 * only works when the parent is a real comment, not the post itself.
 *
 * Returns a flat list of t1/more things; callers reassemble the tree via
 * `parent_id`. Reddit caps each call at ~100 child IDs, so we batch.
 */
interface MoreChildrenResp {
	json?: {
		errors?: unknown[];
		data?: {
			things?: Array<RawComment | RawMore>;
		};
	};
}

export async function redditMoreChildren(
	linkId: string,
	children: string[],
	opts: FetchOptions = {}
): Promise<Array<RawComment | RawMore>> {
	if (children.length === 0) return [];
	const out: Array<RawComment | RawMore> = [];
	const BATCH = 100;
	for (let i = 0; i < children.length; i += BATCH) {
		const batch = children.slice(i, i + BATCH);
		const path = `/api/morechildren?api_type=json&link_id=${encodeURIComponent(
			linkId
		)}&children=${batch.join(',')}&limit_children=false`;
		const resp = await redditJson<MoreChildrenResp>(path, opts);
		const things = resp?.json?.data?.things ?? [];
		out.push(...things);
	}
	return out;
}

/* --------------------------------------------------------------------- *
 *  Reddit raw response types — only the fields Galley reads
 * --------------------------------------------------------------------- */

export interface Thing<K extends string, D> {
	kind: K;
	data: D;
}

export interface ListingData<T> {
	after: string | null;
	before: string | null;
	children: T[];
	modhash?: string;
	dist?: number;
}

export type Listing<T> = Thing<'Listing', ListingData<T>>;

export interface RawPostData {
	id: string;
	name: string;
	subreddit: string;
	subreddit_name_prefixed: string;
	title: string;
	author: string;
	score: number;
	num_comments: number;
	created_utc: number;
	permalink: string;
	url: string;
	url_overridden_by_dest?: string;
	domain: string;
	is_self: boolean;
	selftext: string;
	selftext_html: string | null;
	thumbnail: string;
	thumbnail_width: number | null;
	thumbnail_height: number | null;
	preview?: {
		images: Array<{
			source: { url: string; width: number; height: number };
			resolutions: Array<{ url: string; width: number; height: number }>;
		}>;
	};
	is_video: boolean;
	is_gallery?: boolean;
	gallery_data?: { items: Array<{ media_id: string; id: number; caption?: string }> };
	media_metadata?: Record<
		string,
		{
			e?: string;
			m?: string;
			s?: { u?: string; gif?: string; mp4?: string; x?: number; y?: number };
			p?: Array<{ u: string; x: number; y: number }>;
		}
	>;
	media?: {
		reddit_video?: {
			duration: number;
			fallback_url?: string;
			hls_url?: string;
			dash_url?: string;
			height?: number;
			width?: number;
			is_gif?: boolean;
		};
	};
	post_hint?: string;
	link_flair_text?: string | null;
	stickied?: boolean;
	pinned?: boolean;
	over_18?: boolean;
	spoiler?: boolean;
	removed_by_category?: string | null;
}

export type RawPost = Thing<'t3', RawPostData>;

export interface RawCommentData {
	id: string;
	name: string;
	parent_id: string;
	link_id: string;
	subreddit: string;
	author: string;
	body: string;
	body_html: string;
	score: number;
	created_utc: number;
	depth: number;
	permalink: string;
	stickied?: boolean;
	is_submitter?: boolean;
	distinguished?: 'moderator' | 'admin' | null;
	media_metadata?: Record<
		string,
		{
			e?: string;
			m?: string;
			s?: { u?: string; gif?: string; mp4?: string; x?: number; y?: number };
		}
	>;
	replies?: Listing<RawComment | RawMore> | '' | null;
}

export type RawComment = Thing<'t1', RawCommentData>;

export interface RawMoreData {
	id: string;
	parent_id: string;
	count: number;
	depth: number;
	children: string[];
	name: string;
}

export type RawMore = Thing<'more', RawMoreData>;

export interface RawSubredditData {
	display_name: string;
	display_name_prefixed: string;
	title: string;
	public_description: string;
	description: string;
	subscribers: number;
	created_utc: number;
	over18: boolean;
	url: string;
}

export type RawSubreddit = Thing<'t5', RawSubredditData>;

export type RawListingChild = RawPost | RawComment | RawMore | RawSubreddit;

/* --------------------------------------------------------------------- *
 *  Normalisers: raw → frontend views
 * --------------------------------------------------------------------- */

function determineKind(d: RawPostData): PostKind {
	if (d.is_self) return 'text';
	if (d.is_gallery) return 'gallery';
	if (d.is_video || d.media?.reddit_video) return 'video';
	const hint = (d.post_hint ?? '').toLowerCase();
	if (hint === 'image') return 'image';
	if (hint === 'hosted:video' || hint === 'rich:video') return 'video';
	if (/\.(jpe?g|png|gif|webp)(\?|$)/i.test(d.url ?? '')) return 'image';
	return 'link';
}

function pickThumbnail(d: RawPostData): string | undefined {
	const previews = d.preview?.images?.[0]?.resolutions;
	if (previews && previews.length > 0) {
		const m = previews.find((r) => r.width >= 176) ?? previews[previews.length - 1];
		return m.url.replace(/&amp;/g, '&');
	}
	if (d.thumbnail && /^https?:/.test(d.thumbnail)) return d.thumbnail;
	return undefined;
}

function pickPreviewImages(
	d: RawPostData
): Array<{ url: string; width: number; height: number }> | undefined {
	const img = d.preview?.images?.[0];
	if (!img) return undefined;
	const all = [...(img.resolutions ?? []), img.source].filter(
		(r): r is { url: string; width: number; height: number } => !!r && typeof r.url === 'string'
	);
	if (all.length === 0) return undefined;
	return all
		.map((r) => ({
			url: r.url.replace(/&amp;/g, '&'),
			width: r.width,
			height: r.height
		}))
		.sort((a, b) => a.width - b.width);
}

function formatDuration(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	const m = Math.floor(total / 60);
	const s = (total % 60).toString().padStart(2, '0');
	return `${m}:${s}`;
}

const GALLERY_TARGET_WIDTH = 1080;

function pickGalleryItems(d: RawPostData): PostView['galleryItems'] {
	if (!d.is_gallery || !d.gallery_data || !d.media_metadata) return undefined;
	const items = d.gallery_data.items
		.map((item) => {
			const m = d.media_metadata?.[item.media_id];
			if (!m?.s) return null;
			// Prefer the smallest p[] preview at least 1080px wide; fall back to
			// the largest preview, then the source. Animations (gifs) don't have
			// a useful preview so they always use the source.
			const sourceUrl = (m.s.u ?? m.s.gif ?? '').replace(/&amp;/g, '&');
			const previews = (m.p ?? [])
				.filter((p) => p && typeof p.u === 'string')
				.sort((a, b) => a.x - b.x);
			const isAnimated = !!m.s.gif && !m.s.u;
			let url = sourceUrl;
			let width = m.s.x ?? 0;
			let height = m.s.y ?? 0;
			if (!isAnimated && previews.length > 0) {
				const pick =
					previews.find((p) => p.x >= GALLERY_TARGET_WIDTH) ??
					previews[previews.length - 1];
				url = pick.u.replace(/&amp;/g, '&');
				width = pick.x;
				height = pick.y;
			}
			if (!url) return null;
			return {
				url,
				width,
				height,
				caption: item.caption
			};
		})
		.filter((x): x is NonNullable<typeof x> => x !== null);
	return items.length > 0 ? items : undefined;
}

function pickVideoPoster(d: RawPostData): string | undefined {
	const previews = d.preview?.images?.[0]?.resolutions;
	if (previews && previews.length > 0) {
		const p = previews[previews.length - 1];
		return p.url.replace(/&amp;/g, '&');
	}
	const src = d.preview?.images?.[0]?.source?.url;
	if (src) return src.replace(/&amp;/g, '&');
	return undefined;
}

export function rawPostToView(post: RawPost): PostView {
	const d = post.data;
	const rv = d.media?.reddit_video;
	return {
		id: d.id,
		subreddit: d.subreddit.toLowerCase(),
		title: d.title,
		author: d.author,
		score: d.score,
		numComments: d.num_comments,
		createdUtc: d.created_utc,
		// Galley-internal permalink — strips Reddit's title slug so it matches
		// the /r/[subreddit]/comments/[id] route shape. Always lowercase.
		permalink: `/r/${d.subreddit.toLowerCase()}/comments/${d.id}`,
		url: d.url,
		domain: d.domain,
		isSelf: d.is_self,
		thumbnail: pickThumbnail(d),
		previewImages: pickPreviewImages(d),
		selftext: d.selftext || undefined,
		selftextHtml: d.selftext_html ?? undefined,
		kind: determineKind(d),
		isPinned: d.stickied || d.pinned || false,
		galleryCount: d.is_gallery ? d.gallery_data?.items?.length : undefined,
		galleryItems: pickGalleryItems(d),
		videoUrl: rv?.fallback_url,
		videoHlsUrl: rv?.hls_url,
		videoPoster: rv ? pickVideoPoster(d) : undefined,
		videoWidth: rv?.width,
		videoHeight: rv?.height,
		videoIsGif: rv?.is_gif,
		videoDuration: rv?.duration ? formatDuration(rv.duration) : undefined,
		flair: d.link_flair_text ?? undefined,
		over18: d.over_18
	};
}

/**
 * Reddit encodes inline media (gifs, image emotes) in comment markdown as
 * `![alt](media_id)` where media_id is a key into media_metadata. Without
 * substitution the markdown renderer emits an <img> with a non-http src,
 * which our sanitiser strips — leaving the alt text ("gif") with broken-image
 * styling. Resolve the ref to the real media URL up front so the gif renders.
 *
 * Two ref shapes need handling:
 *   1. media_metadata-resolvable refs (Reddit-hosted media). When the entry
 *      has a valid `s` block we use its gif/u/mp4 URL.
 *   2. `giphy|<id>[|...]` refs. Reddit often returns status: "invalid" for
 *      these (no `s` block), but the id alone is enough to build a working
 *      i.giphy.com URL — so we always rewrite giphy refs.
 */
function resolveInlineMedia(
	body: string,
	metadata: RawCommentData['media_metadata']
): string {
	if (!body) return body;
	return body.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, ref) => {
		const m = metadata?.[ref];
		const metaUrl = (m?.s?.gif ?? m?.s?.u ?? m?.s?.mp4 ?? '').replace(/&amp;/g, '&');
		if (metaUrl && /^https?:\/\//.test(metaUrl)) {
			return `![${alt}](${metaUrl})`;
		}
		const giphy = /^giphy\|([A-Za-z0-9]+)/.exec(ref);
		if (giphy) {
			return `![${alt}](https://i.giphy.com/media/${giphy[1]}/giphy.gif)`;
		}
		return match;
	});
}

export function rawCommentToView(c: RawComment): CommentView {
	const d = c.data;
	const replies =
		d.replies && typeof d.replies === 'object' && d.replies.kind === 'Listing'
			? d.replies.data.children.map((child) => {
					if (child.kind === 't1') return rawCommentToView(child);
					if (child.kind === 'more') return rawMoreToView(child);
					throw new RedditError(
						`Unexpected child kind in comment thread: ${(child as { kind: string }).kind}`,
						500
					);
				})
			: [];
	return {
		id: d.id,
		author: d.author,
		body: resolveInlineMedia(d.body, d.media_metadata),
		bodyHtml: d.body_html,
		score: d.score,
		createdUtc: d.created_utc,
		depth: d.depth,
		permalink: d.permalink,
		stickied: d.stickied,
		replies,
		kind: 't1'
	};
}

export function rawMoreToView(m: RawMore): MoreCommentsView {
	return {
		id: m.data.id,
		parentId: m.data.parent_id,
		count: m.data.count,
		depth: m.data.depth,
		children: m.data.children,
		kind: 'more'
	};
}

/**
 * Test-only helper to clear the in-memory cache. Not used at runtime.
 */
export function _clearCache() {
	cache.clear();
	inflight.clear();
}
