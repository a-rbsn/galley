<script lang="ts">
	import { page } from '$app/state';
	import PostListItem from '$lib/components/PostListItem.svelte';
	import FeedHeader from '$lib/components/FeedHeader.svelte';
	import type { PostView } from '$lib/types';

	const sub = $derived(page.params.subreddit ?? '');
	const sort = $derived(
		(page.url.searchParams.get('sort') as 'hot' | 'new' | 'top' | 'rising' | null) ?? 'hot'
	);

	const sortHref = (s: 'hot' | 'new' | 'top' | 'rising') => {
		const u = new URL(page.url);
		if (s === 'hot') u.searchParams.delete('sort');
		else u.searchParams.set('sort', s);
		return u.pathname + (u.search || '');
	};

	// Static fixture — replaced by load() data in a later step.
	// Times are seconds-ago offsets so relativeTime renders "7h", "2d", etc.
	const HOUR = 3600;
	const DAY = 86400;
	const now = Math.floor(Date.now() / 1000);

	const fixture: PostView[] = [
		{
			id: 'f1',
			subreddit: 'slatestarcodex',
			title: 'On the quiet death of the lurker, and what we lost when every reader became a poster',
			author: 'scott_a',
			score: 14200,
			numComments: 1847,
			createdUtc: now - 7 * HOUR,
			permalink: '/r/slatestarcodex/comments/f1',
			url: '/r/slatestarcodex/comments/f1',
			domain: 'self.slatestarcodex',
			isSelf: true,
			kind: 'text'
		},
		{
			id: 'f2',
			subreddit: 'urbanism',
			title:
				"Lisbon's experiment with car-free arteries is two years old. The data is unambiguous, the politics are not.",
			author: 'transit_planner_pt',
			score: 8914,
			numComments: 962,
			createdUtc: now - 11 * HOUR,
			permalink: '/r/urbanism/comments/f2',
			url: 'https://www.bloomberg.com/example',
			domain: 'bloomberg.com',
			isSelf: false,
			kind: 'link',
			hueSeed: 220
		},
		{
			id: 'f3',
			subreddit: 'AskHistorians',
			title:
				'When did ordinary people in medieval Europe first start owning books, as opposed to merely encountering them?',
			author: 'codex_curious',
			score: 3402,
			numComments: 214,
			createdUtc: now - 3 * HOUR,
			permalink: '/r/AskHistorians/comments/f3',
			url: '/r/AskHistorians/comments/f3',
			domain: 'self.AskHistorians',
			isSelf: true,
			kind: 'text'
		},
		{
			id: 'f4',
			subreddit: 'MachineLearning',
			title:
				'A 2.1B-parameter model trained only on textbooks matches GPT-3.5 on MMLU. The authors argue curriculum, not scale.',
			author: 'grad_descent',
			score: 6238,
			numComments: 487,
			createdUtc: now - 9 * HOUR,
			permalink: '/r/MachineLearning/comments/f4',
			url: 'https://arxiv.org/abs/example',
			domain: 'arxiv.org',
			isSelf: false,
			kind: 'link'
		},
		{
			id: 'f5',
			subreddit: 'ArchitecturePorn',
			title:
				'The reading room at the Stockholm Public Library, photographed at the moment the lights came on',
			author: 'ehrling_lens',
			score: 11700,
			numComments: 328,
			createdUtc: now - 14 * HOUR,
			permalink: '/r/ArchitecturePorn/comments/f5',
			url: 'https://i.redd.it/example.jpg',
			domain: 'i.redd.it',
			isSelf: false,
			kind: 'image',
			hueSeed: 50
		},
		{
			id: 'f6',
			subreddit: 'books',
			title:
				're-reading Middlemarch at thirty-eight is a different novel than the one I gave up on at twenty',
			author: 'eliotinmiddleage',
			score: 4156,
			numComments: 691,
			createdUtc: now - 5 * HOUR,
			permalink: '/r/books/comments/f6',
			url: '/r/books/comments/f6',
			domain: 'self.books',
			isSelf: true,
			kind: 'text'
		},
		{
			id: 'f7',
			subreddit: 'ArtisanVideos',
			title:
				'A Kyoto bookbinder repairs a 17th-century almanac in real time, narrated by his apprentice',
			author: 'slow_hands',
			score: 9341,
			numComments: 203,
			createdUtc: now - 4 * HOUR,
			permalink: '/r/ArtisanVideos/comments/f7',
			url: 'https://v.redd.it/example',
			domain: 'v.redd.it',
			isSelf: false,
			kind: 'video',
			videoDuration: '12:08',
			hueSeed: 15
		},
		{
			id: 'f8',
			subreddit: 'news',
			title:
				"Japan's population fell by 781,000 last year, the steepest decline on record; rural prefectures account for almost all of it.",
			author: 'wire_reader',
			score: 22400,
			numComments: 3204,
			createdUtc: now - 2 * HOUR,
			permalink: '/r/news/comments/f8',
			url: 'https://www.reuters.com/example',
			domain: 'reuters.com',
			isSelf: false,
			kind: 'link'
		},
		{
			id: 'f9',
			subreddit: 'fountainpens',
			title:
				"After eleven years of daily use, the nib on my Pelikan M400 has finally written itself into a shape that's mine",
			author: 'inkwell_thoughts',
			score: 847,
			numComments: 73,
			createdUtc: now - 6 * HOUR,
			permalink: '/r/fountainpens/comments/f9',
			url: 'https://i.redd.it/example2.jpg',
			domain: 'i.redd.it',
			isSelf: false,
			kind: 'image',
			hueSeed: 280
		},
		{
			id: 'f10',
			subreddit: 'AskHistorians',
			title: 'A reminder, gently — top-level answers must cite primary or peer-reviewed sources',
			author: 'mod_team',
			score: 0,
			numComments: 42,
			createdUtc: now - 2 * DAY,
			permalink: '/r/AskHistorians/comments/f10',
			url: '/r/AskHistorians/comments/f10',
			domain: 'self.AskHistorians',
			isSelf: true,
			kind: 'text',
			isPinned: true
		}
	];
</script>

<svelte:head>
	<title>Galley — r/{sub}</title>
</svelte:head>

<section class="feed">
	<FeedHeader title="r/{sub}" count={fixture.length} {sort} {sortHref} />

	{#each fixture as post (post.id)}
		<PostListItem {post} />
	{/each}

	<div class="break"><span class="ornament">— end of fixture —</span></div>
	<p class="hint">
		<em>This is a hardcoded fixture used to verify the post component against the mock. Real
		listings land here once the data layer is wired.</em>
	</p>
</section>

<style>
	.feed {
		border-top: 3px double var(--ink);
		padding-top: 20px;
	}

	.break {
		display: flex;
		align-items: center;
		gap: 14px;
		margin: 26px 0 6px;
		color: var(--ink-3);
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-weight: 500;
	}
	.break::before,
	.break::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--rule);
	}
	.break .ornament {
		font-family: var(--serif);
		font-style: italic;
		color: var(--ink-4);
		text-transform: none;
		letter-spacing: 0;
		font-size: 12px;
	}

	.hint {
		font-family: var(--serif);
		font-style: italic;
		color: var(--ink-3);
		font-size: 13px;
		max-width: 60ch;
		margin-top: 18px;
	}

	@media (max-width: 760px) {
		.feed {
			border-top: none;
			padding-top: 6px;
		}
	}
</style>
