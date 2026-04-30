<script lang="ts">
	import { page } from '$app/state';
	import { beforeNavigate } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import FeedHeader from '$lib/components/FeedHeader.svelte';
	import PostListItem from '$lib/components/PostListItem.svelte';
	import { isSeen, seenState } from '$lib/stores/seen.svelte';
	import type { Sort, TopRange } from '$lib/feed';
	import type { PostView } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const sortHref = (s: Sort) => {
		const u = new URL(page.url);
		if (s === 'hot') u.searchParams.delete('sort');
		else u.searchParams.set('sort', s);
		if (s !== 'top') u.searchParams.delete('t');
		return u.pathname + (u.search || '');
	};

	const topRangeHref = (range: TopRange) => {
		const u = new URL(page.url);
		u.searchParams.set('sort', 'top');
		u.searchParams.set('t', range);
		return u.pathname + (u.search || '');
	};

	let extraPosts = $state<PostView[]>([]);
	let extraErrors = $state<{ sub: string; message: string }[]>([]);
	// svelte-ignore state_referenced_locally
	let afters = $state<Record<string, string | null>>({ ...data.afters });
	// svelte-ignore state_referenced_locally
	let lastData = data;
	let loading = $state(false);
	let loadMoreController: AbortController | null = null;

	function abortLoadMore() {
		loadMoreController?.abort();
		loadMoreController = null;
	}

	beforeNavigate(() => {
		abortLoadMore();
	});

	onDestroy(() => {
		abortLoadMore();
	});

	$effect(() => {
		if (data !== lastData) {
			lastData = data;
			extraPosts = [];
			extraErrors = [];
			afters = { ...data.afters };
		}
	});

	const allPosts = $derived([...data.posts, ...extraPosts]);
	const visiblePosts = $derived(
		seenState.hydrated && seenState.hideSeen ? allPosts.filter((p) => !isSeen(p.id)) : allPosts
	);
	const allErrors = $derived([...data.errors, ...extraErrors]);
	const canLoadMore = $derived(Object.values(afters).some((a) => a !== null));

	async function loadMore() {
		if (loading || !canLoadMore) return;
		loading = true;
		const ctrl = new AbortController();
		loadMoreController = ctrl;
		try {
			const res = await fetch('/api/feed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sort: data.sort, topRange: data.topRange, afters }),
				signal: ctrl.signal
			});
			if (!res.ok) {
				extraErrors = [
					...extraErrors,
					{ sub: '·', message: `Load more failed (${res.status}).` }
				];
				return;
			}
			const body = (await res.json()) as {
				posts: PostView[];
				afters: Record<string, string | null>;
				errors: { sub: string; message: string }[];
			};
			const seen = new Set(allPosts.map((p) => p.id));
			const fresh = body.posts.filter((p) => !seen.has(p.id));
			extraPosts = [...extraPosts, ...fresh];
			afters = { ...afters, ...body.afters };
			if (body.errors.length > 0) {
				extraErrors = [...extraErrors, ...body.errors];
			}
		} catch (e) {
			if (e instanceof Error && e.name === 'AbortError') return;
			const msg = e instanceof Error ? e.message : 'network error';
			extraErrors = [...extraErrors, { sub: '·', message: msg }];
		} finally {
			if (loadMoreController === ctrl) loadMoreController = null;
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Galley — {data.feed.name}</title>
</svelte:head>

<section class="feed">
	<FeedHeader
		title={data.feed.name}
		count={visiblePosts.length}
		sort={data.sort}
		topRange={data.topRange}
		{sortHref}
		{topRangeHref}
	/>

	<p class="feed-note">
		{data.feed.subreddits.map((sub) => `r/${sub}`).join(', ')}
	</p>

	{#if allErrors.length > 0}
		<div class="errors">
			{#each allErrors as err, i (i + ':' + err.sub)}
				<p><em>r/{err.sub} couldn't be loaded — {err.message}</em></p>
			{/each}
		</div>
	{/if}

	{#each visiblePosts as post (post.id)}
		<PostListItem {post} seen={isSeen(post.id)} />
	{/each}

	{#if visiblePosts.length === 0 && allErrors.length === 0}
		<p class="empty">
			<em>
				{allPosts.length > 0
					? 'All loaded posts are marked read.'
					: 'No posts came back from Reddit for this custom feed and sort.'}
			</em>
		</p>
	{/if}

	{#if canLoadMore}
		<p class="more">
			<button type="button" onclick={loadMore} disabled={loading}>
				{loading ? 'Loading...' : 'Load more'}
			</button>
		</p>
	{/if}
</section>

<style>
	.feed {
		border-top: 3px double var(--ink);
	}
	.feed-note {
		margin: 8px 0 12px;
		font-family: var(--serif);
		font-size: 13px;
		font-style: italic;
		color: var(--ink-3);
		overflow-wrap: anywhere;
	}
	.errors {
		font-family: var(--serif);
		color: var(--ink-3);
		font-size: 13px;
		padding: 8px 0 14px;
		border-bottom: 1px dashed var(--rule);
		margin-bottom: 14px;
	}
	.errors p {
		margin: 2px 0;
	}
	.empty {
		font-family: var(--serif);
		color: var(--ink-3);
		font-style: italic;
		padding: 22px 0;
	}
	.more {
		text-align: center;
		margin: 28px 0 12px;
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.more button {
		background: none;
		border: none;
		padding: 0 0 2px;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		color: var(--ink-2);
		border-bottom: 1px solid var(--ink-3);
		cursor: pointer;
	}
	.more button:hover:not(:disabled) {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}
	.more button:disabled {
		color: var(--ink-4);
		border-bottom-color: var(--ink-4);
		cursor: default;
	}
	@media (max-width: 760px) {
		.feed {
			border-top: none;
			padding-top: 0;
		}
		.feed-note,
		.feed > .empty,
		.feed > .errors,
		.feed > .more {
			padding-left: var(--page-pad-x-mobile);
			padding-right: var(--page-pad-x-mobile);
		}
	}
</style>
