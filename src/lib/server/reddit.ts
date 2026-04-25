/**
 * Reddit JSON data layer (server-only).
 *
 * All Reddit access goes through redditJson(). Anywhere else in the app
 * that needs Reddit data should call this from a +page.server.ts /
 * +server.ts module so requests stay server-side and the cache is
 * shared across pages.
 */

import { env } from '$env/dynamic/private';
import type { CommentView, MoreCommentsView, PostKind, PostView } from '$lib/types';

const DEFAULT_USER_AGENT = 'web:io.galley.app:v0.1.0 (by /u/PLACEHOLDER)';

const cache = new Map<string, { at: number; data: unknown }>();
const MAX_CACHE_ENTRIES = 200;

export interface FetchOptions {
	ttl?: number; // seconds — default 60
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
	let queryPart = qIdx >= 0 ? p.slice(qIdx + 1) : '';

	if (!/\.json$/.test(pathPart)) {
		pathPart = pathPart.replace(/\/$/, '') + '.json';
	}
	const params = new URLSearchParams(queryPart);
	if (!params.has('raw_json')) params.set('raw_json', '1');
	const qs = params.toString();
	return `https://www.reddit.com${pathPart}${qs ? '?' + qs : ''}`;
}

function setCache(key: string, data: unknown) {
	cache.set(key, { at: Date.now(), data });
	if (cache.size > MAX_CACHE_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
}

export async function redditJson<T = unknown>(
	path: string,
	opts: FetchOptions = {}
): Promise<T> {
	const ttl = opts.ttl ?? 60;
	const url = buildUrl(path);

	const cached = cache.get(url);
	if (cached && (Date.now() - cached.at) / 1000 < ttl) {
		return cached.data as T;
	}

	const userAgent = env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT;
	const res = await fetch(url, {
		headers: {
			'User-Agent': userAgent,
			Accept: 'application/json'
		},
		signal: opts.signal
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
			`Reddit responded ${res.status} ${res.statusText} for ${path}`,
			res.status
		);
	}

	const data = (await res.json()) as T;
	setCache(url, data);
	return data;
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
	gallery_data?: { items: Array<{ media_id: string; id: number }> };
	media_metadata?: Record<
		string,
		{ e?: string; m?: string; s?: { u?: string; gif?: string } }
	>;
	media?: { reddit_video?: { duration: number } };
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

export function rawPostToView(post: RawPost): PostView {
	const d = post.data;
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
		videoDuration: d.media?.reddit_video?.duration
			? formatDuration(d.media.reddit_video.duration)
			: undefined,
		flair: d.link_flair_text ?? undefined,
		over18: d.over_18
	};
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
		body: d.body,
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
}
