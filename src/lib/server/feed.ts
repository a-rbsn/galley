import { mapLimit } from './concurrency';
import {
	redditJson,
	rawPostToView,
	RedditError,
	type Listing,
	type RawPost
} from './reddit';
import type { Sort, TopRange } from '$lib/feed';
import type { PostView } from '$lib/types';

const FEED_FETCH_CONCURRENCY = 6;
const FEED_LISTING_TTL_SECONDS = 5 * 60;
const MULTI_SUB_BATCH_SIZE = 25;
const REDDIT_LISTING_LIMIT = 50;
const SUB_RE = /^[a-z0-9_]{2,21}$/;
const VIRTUAL_SUBS = new Set(['all', 'popular']);

export interface FeedError {
	sub: string;
	message: string;
}

export interface FeedResult {
	posts: PostView[];
	afters: Record<string, string | null>;
	errors: FeedError[];
}

export interface PostSource {
	sub: string;
	posts: PostView[];
}

export interface FeedSourceCursor {
	key: string;
	after: string | null;
}

interface FeedSource {
	key: string;
	label: string;
	subs: string[];
}

export interface FeedLoadOptions {
	signal?: AbortSignal;
}

function redditListingPath(source: FeedSource, sort: Sort, topRange: TopRange, after?: string): string {
	const params = new URLSearchParams({ limit: String(REDDIT_LISTING_LIMIT) });
	if (sort === 'top') params.set('t', topRange);
	if (after) params.set('after', after);
	return `/r/${source.subs.join('+')}/${sort}?${params.toString()}`;
}

function sourceFromSubs(subs: string[]): FeedSource {
	const normalised = subs.map((sub) => sub.toLowerCase());
	if (normalised.length === 1) {
		return {
			key: normalised[0],
			label: normalised[0],
			subs: normalised
		};
	}
	return {
		key: `m:${normalised.join('+')}`,
		label: normalised.join('+'),
		subs: normalised
	};
}

function buildFeedSources(subs: string[]): FeedSource[] {
	const sources: FeedSource[] = [];
	let batch: string[] = [];

	function flushBatch() {
		if (batch.length > 0) {
			sources.push(sourceFromSubs(batch));
			batch = [];
		}
	}

	for (const sub of subs) {
		const normalised = sub.toLowerCase();
		if (!SUB_RE.test(normalised)) continue;
		if (VIRTUAL_SUBS.has(normalised)) {
			flushBatch();
			sources.push(sourceFromSubs([normalised]));
			continue;
		}
		batch.push(normalised);
		if (batch.length >= MULTI_SUB_BATCH_SIZE) flushBatch();
	}
	flushBatch();

	return sources;
}

export function parseFeedSourceCursors(
	afters: Record<string, unknown>
): FeedSourceCursor[] {
	const cursors: FeedSourceCursor[] = [];

	for (const [key, after] of Object.entries(afters)) {
		if (!(after === null || typeof after === 'string')) continue;
		let source: FeedSource | null = null;

		if (key.startsWith('m:')) {
			const subs = key
				.slice(2)
				.split('+')
				.map((sub) => sub.toLowerCase())
				.filter((sub) => SUB_RE.test(sub));
			if (subs.length >= 2 && subs.length <= MULTI_SUB_BATCH_SIZE) {
				source = sourceFromSubs(subs);
			}
		} else {
			const sub = key.toLowerCase();
			if (SUB_RE.test(sub)) source = sourceFromSubs([sub]);
		}

		if (source && source.key === key) {
			cursors.push({ key: source.key, after });
		}
	}

	return cursors;
}

function errorMessage(reason: unknown): string {
	if (reason instanceof RedditError) return `${reason.status}: ${reason.message}`;
	if (reason instanceof Error) return reason.message;
	return 'unknown error';
}

export function mergePostSources(sources: PostSource[], sort: Sort, limit?: number): PostView[] {
	const seen = new Set<string>();
	const out: PostView[] = [];

	if (sort === 'new') {
		for (const source of sources) {
			for (const post of source.posts) {
				if (seen.has(post.id)) continue;
				seen.add(post.id);
				out.push(post);
			}
		}
		out.sort((a, b) => b.createdUtc - a.createdUtc);
		return limit ? out.slice(0, limit) : out;
	}

	const maxLen = Math.max(0, ...sources.map((source) => source.posts.length));
	for (let rank = 0; rank < maxLen; rank += 1) {
		for (const source of sources) {
			const post = source.posts[rank];
			if (!post || seen.has(post.id)) continue;
			seen.add(post.id);
			out.push(post);
			if (limit && out.length >= limit) return out;
		}
	}
	return limit ? out.slice(0, limit) : out;
}

export async function loadMergedFeed(
	subs: string[],
	sort: Sort,
	topRange: TopRange,
	limit = 50,
	opts: FeedLoadOptions = {}
): Promise<FeedResult> {
	const feedSources = buildFeedSources(subs);
	const settled = await mapLimit(feedSources, FEED_FETCH_CONCURRENCY, (source) =>
		redditJson<Listing<RawPost>>(redditListingPath(source, sort, topRange), {
			ttl: FEED_LISTING_TTL_SECONDS,
			signal: opts.signal
		}),
		opts.signal
	);

	const errors: FeedError[] = [];
	const afters: Record<string, string | null> = {};
	const sources: PostSource[] = [];

	settled.forEach((res, i) => {
		const source = feedSources[i];
		if (res.status === 'fulfilled') {
			afters[source.key] = res.value.data.after;
			sources.push({
				sub: source.label,
				posts: res.value.data.children
					.filter((c): c is RawPost => c.kind === 't3')
					.map(rawPostToView)
			});
		} else {
			afters[source.key] = null;
			errors.push({ sub: source.label, message: errorMessage(res.reason) });
		}
	});

	return {
		posts: mergePostSources(sources, sort, limit),
		afters,
		errors
	};
}

export async function loadMergedFeedPage(
	cursorEntries: FeedSourceCursor[],
	sort: Sort,
	topRange: TopRange,
	opts: FeedLoadOptions = {}
): Promise<FeedResult> {
	const sourceEntries = cursorEntries.map((cursor) => ({
		source: sourceFromSubs(
			cursor.key.startsWith('m:') ? cursor.key.slice(2).split('+') : [cursor.key]
		),
		after: cursor.after
	}));
	const live = sourceEntries.filter(
		(entry): entry is { source: FeedSource; after: string } => entry.after !== null
	);
	const settled = await mapLimit(live, FEED_FETCH_CONCURRENCY, ({ source, after }) =>
		redditJson<Listing<RawPost>>(redditListingPath(source, sort, topRange, after), {
			ttl: FEED_LISTING_TTL_SECONDS,
			signal: opts.signal
		}),
		opts.signal
	);

	const errors: FeedError[] = [];
	const afters: Record<string, string | null> = {};
	const sources: PostSource[] = [];
	for (const { source } of sourceEntries) afters[source.key] = null;

	settled.forEach((res, i) => {
		const { source, after: previousAfter } = live[i];
		if (res.status === 'fulfilled') {
			afters[source.key] = res.value.data.after;
			sources.push({
				sub: source.label,
				posts: res.value.data.children
					.filter((c): c is RawPost => c.kind === 't3')
					.map(rawPostToView)
			});
		} else {
			afters[source.key] = previousAfter;
			errors.push({ sub: source.label, message: errorMessage(res.reason) });
		}
	});

	return {
		posts: mergePostSources(sources, sort),
		afters,
		errors
	};
}
