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

export interface FeedLoadOptions {
	signal?: AbortSignal;
}

function redditListingPath(sub: string, sort: Sort, topRange: TopRange, after?: string): string {
	const params = new URLSearchParams({ limit: '25' });
	if (sort === 'top') params.set('t', topRange);
	if (after) params.set('after', after);
	return `/r/${sub}/${sort}?${params.toString()}`;
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
	const settled = await mapLimit(subs, FEED_FETCH_CONCURRENCY, (sub) =>
		redditJson<Listing<RawPost>>(redditListingPath(sub, sort, topRange), {
			ttl: 60,
			signal: opts.signal
		}),
		opts.signal
	);

	const errors: FeedError[] = [];
	const afters: Record<string, string | null> = {};
	const sources: PostSource[] = [];

	settled.forEach((res, i) => {
		const sub = subs[i];
		if (res.status === 'fulfilled') {
			afters[sub] = res.value.data.after;
			sources.push({
				sub,
				posts: res.value.data.children
					.filter((c): c is RawPost => c.kind === 't3')
					.map(rawPostToView)
			});
		} else {
			afters[sub] = null;
			errors.push({ sub, message: errorMessage(res.reason) });
		}
	});

	return {
		posts: mergePostSources(sources, sort, limit),
		afters,
		errors
	};
}

export async function loadMergedFeedPage(
	afterEntries: Array<[string, string | null]>,
	sort: Sort,
	topRange: TopRange,
	opts: FeedLoadOptions = {}
): Promise<FeedResult> {
	const live = afterEntries.filter(([, after]) => after !== null) as Array<[string, string]>;
	const settled = await mapLimit(live, FEED_FETCH_CONCURRENCY, ([sub, after]) =>
		redditJson<Listing<RawPost>>(redditListingPath(sub, sort, topRange, after), {
			ttl: 60,
			signal: opts.signal
		}),
		opts.signal
	);

	const errors: FeedError[] = [];
	const afters: Record<string, string | null> = {};
	const sources: PostSource[] = [];
	for (const [sub] of afterEntries) afters[sub] = null;

	settled.forEach((res, i) => {
		const [sub, previousAfter] = live[i];
		if (res.status === 'fulfilled') {
			afters[sub] = res.value.data.after;
			sources.push({
				sub,
				posts: res.value.data.children
					.filter((c): c is RawPost => c.kind === 't3')
					.map(rawPostToView)
			});
		} else {
			afters[sub] = previousAfter;
			errors.push({ sub, message: errorMessage(res.reason) });
		}
	});

	return {
		posts: mergePostSources(sources, sort),
		afters,
		errors
	};
}
