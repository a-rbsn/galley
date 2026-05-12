import { describe, expect, it } from 'vitest';
import { mergePostSources, parseFeedSourceCursors, type PostSource } from './feed';
import type { PostView } from '$lib/types';

function post(id: string, sub: string, createdUtc: number, score = 1): PostView {
	return {
		id,
		subreddit: sub,
		title: id,
		author: 'reader',
		score,
		numComments: 0,
		createdUtc,
		permalink: `/r/${sub}/comments/${id}`,
		url: 'https://example.com',
		domain: 'example.com',
		isSelf: false,
		kind: 'link'
	};
}

describe('mergePostSources', () => {
	it('interleaves non-new feeds by per-subreddit rank', () => {
		const sources: PostSource[] = [
			{ sub: 'big', posts: [post('b1', 'big', 1), post('b2', 'big', 1), post('b3', 'big', 1)] },
			{ sub: 'small', posts: [post('s1', 'small', 1)] }
		];
		expect(mergePostSources(sources, 'hot').map((p) => p.id)).toEqual([
			'b1',
			's1',
			'b2',
			'b3'
		]);
	});

	it('keeps new feeds sorted by recency across subreddits', () => {
		const sources: PostSource[] = [
			{ sub: 'a', posts: [post('old', 'a', 1)] },
			{ sub: 'b', posts: [post('new', 'b', 3), post('mid', 'b', 2)] }
		];
		expect(mergePostSources(sources, 'new').map((p) => p.id)).toEqual(['new', 'mid', 'old']);
	});

	it('deduplicates cross-posted ids while preserving first source priority', () => {
		const sources: PostSource[] = [
			{ sub: 'a', posts: [post('same', 'a', 2), post('a2', 'a', 1)] },
			{ sub: 'b', posts: [post('same', 'b', 3), post('b2', 'b', 1)] }
		];
		expect(mergePostSources(sources, 'top').map((p) => p.id)).toEqual(['same', 'a2', 'b2']);
	});
});

describe('parseFeedSourceCursors', () => {
	it('accepts single-subreddit and multi-subreddit cursor keys', () => {
		expect(
			parseFeedSourceCursors({
				typography: 't3_a',
				'm:design+webdev': 't3_b',
				'm:onlyone': 't3_c',
				'bad/key': 't3_d',
				javascript: null
			})
		).toEqual([
			{ key: 'typography', after: 't3_a' },
			{ key: 'm:design+webdev', after: 't3_b' },
			{ key: 'javascript', after: null }
		]);
	});
});
