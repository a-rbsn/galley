import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const { rawPostToView, rawCommentToView } = await import('./reddit');
import type { RawComment, RawPost } from './reddit';

function makePost(overrides: Partial<RawPost['data']> = {}): RawPost {
	return {
		kind: 't3',
		data: {
			id: 'abc1',
			name: 't3_abc1',
			subreddit: 'Typography',
			subreddit_name_prefixed: 'r/Typography',
			title: 'Hello',
			author: 'someone',
			score: 14200,
			num_comments: 42,
			created_utc: 1700000000,
			permalink: '/r/Typography/comments/abc1/hello/',
			url: 'https://example.com/x',
			domain: 'example.com',
			is_self: false,
			selftext: '',
			selftext_html: null,
			thumbnail: 'https://b.thumbs.redditmedia.com/x.jpg',
			thumbnail_width: 140,
			thumbnail_height: 140,
			is_video: false,
			...overrides
		}
	} as RawPost;
}

describe('rawPostToView', () => {
	it('lowercases the subreddit', () => {
		const v = rawPostToView(makePost());
		expect(v.subreddit).toBe('typography');
	});

	it('detects a self/text post', () => {
		const v = rawPostToView(makePost({ is_self: true, selftext: 'hi' }));
		expect(v.kind).toBe('text');
	});

	it('detects an image post by url extension', () => {
		const v = rawPostToView(makePost({ url: 'https://i.redd.it/x.jpg', domain: 'i.redd.it' }));
		expect(v.kind).toBe('image');
	});

	it('detects a video post via media.reddit_video', () => {
		const v = rawPostToView(
			makePost({
				url: 'https://v.redd.it/abc',
				domain: 'v.redd.it',
				is_video: true,
				media: { reddit_video: { duration: 138 } }
			})
		);
		expect(v.kind).toBe('video');
		expect(v.videoDuration).toBe('2:18');
	});

	it('detects a gallery post', () => {
		const v = rawPostToView(
			makePost({ is_gallery: true, gallery_data: { items: [{ media_id: 'a', id: 1 }, { media_id: 'b', id: 2 }] } })
		);
		expect(v.kind).toBe('gallery');
		expect(v.galleryCount).toBe(2);
	});

	it('falls through to "link" when nothing else matches', () => {
		const v = rawPostToView(makePost({ url: 'https://news.example/foo', domain: 'news.example' }));
		expect(v.kind).toBe('link');
	});

	it('honours stickied/pinned for isPinned', () => {
		expect(rawPostToView(makePost({ stickied: true })).isPinned).toBe(true);
		expect(rawPostToView(makePost({ pinned: true })).isPinned).toBe(true);
		expect(rawPostToView(makePost()).isPinned).toBe(false);
	});

	it('strips html-encoded ampersands in preview thumbnail urls', () => {
		const v = rawPostToView(
			makePost({
				thumbnail: 'self',
				preview: {
					images: [
						{
							source: { url: 'x', width: 100, height: 100 },
							resolutions: [
								{
									url: 'https://preview.redd.it/x.png?width=140&amp;auto=webp',
									width: 140,
									height: 140
								}
							]
						}
					]
				}
			})
		);
		expect(v.thumbnail).toBe('https://preview.redd.it/x.png?width=140&auto=webp');
	});
});

describe('rawCommentToView', () => {
	const baseComment: RawComment = {
		kind: 't1',
		data: {
			id: 'c1',
			name: 't1_c1',
			parent_id: 't3_abc1',
			link_id: 't3_abc1',
			subreddit: 'typography',
			author: 'reader',
			body: 'hello',
			body_html: '<p>hello</p>',
			score: 5,
			created_utc: 1700000000,
			depth: 0,
			permalink: '/r/typography/comments/abc1/_/c1/',
			replies: ''
		}
	};

	it('flattens an empty replies field', () => {
		const v = rawCommentToView(baseComment);
		expect(v.replies).toEqual([]);
		expect(v.body).toBe('hello');
	});

	it('recurses through nested replies and more', () => {
		const nested: RawComment = {
			...baseComment,
			data: {
				...baseComment.data,
				id: 'c2',
				name: 't1_c2',
				parent_id: 't1_c1',
				replies: {
					kind: 'Listing',
					data: {
						after: null,
						before: null,
						children: [
							{
								kind: 'more',
								data: {
									id: '_',
									parent_id: 't1_c2',
									count: 4,
									depth: 1,
									children: ['c3', 'c4'],
									name: 't1__'
								}
							}
						]
					}
				}
			}
		};
		const parent: RawComment = {
			...baseComment,
			data: {
				...baseComment.data,
				replies: {
					kind: 'Listing',
					data: {
						after: null,
						before: null,
						children: [nested]
					}
				}
			}
		};
		const v = rawCommentToView(parent);
		expect(v.replies).toHaveLength(1);
		const child = v.replies[0];
		expect(child.kind).toBe('t1');
		if (child.kind === 't1') {
			expect(child.replies).toHaveLength(1);
			const more = child.replies[0];
			expect(more.kind).toBe('more');
			if (more.kind === 'more') {
				expect(more.count).toBe(4);
				expect(more.children).toEqual(['c3', 'c4']);
			}
		}
	});
});
