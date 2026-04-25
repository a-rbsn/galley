<script lang="ts">
	import { page } from '$app/state';
	import PostListItem from '$lib/components/PostListItem.svelte';
	import FeedHeader from '$lib/components/FeedHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const sortHref = (s: 'hot' | 'new' | 'top' | 'rising') => {
		const u = new URL(page.url);
		u.searchParams.delete('after');
		if (s === 'hot') u.searchParams.delete('sort');
		else u.searchParams.set('sort', s);
		return u.pathname + (u.search || '');
	};

	const moreHref = $derived.by(() => {
		if (!data.after) return null;
		const u = new URL(page.url);
		u.searchParams.set('after', data.after);
		return u.pathname + (u.search || '');
	});
</script>

<svelte:head>
	<title>Galley — r/{data.sub}</title>
</svelte:head>

<section class="feed">
	<FeedHeader title="r/{data.sub}" sort={data.sort} {sortHref} />

	{#if data.posts.length === 0}
		<p class="empty">
			<em>No posts came back from Reddit for r/{data.sub} ({data.sort}).</em>
		</p>
	{:else}
		{#each data.posts as post (post.id)}
			<PostListItem {post} />
		{/each}

		{#if moreHref}
			<p class="more">
				<a href={moreHref}>Load more ↓</a>
			</p>
		{/if}
	{/if}
</section>

<style>
	.feed {
		border-top: 3px double var(--ink);
		padding-top: 20px;
	}
	.empty {
		font-family: var(--serif);
		font-style: italic;
		color: var(--ink-3);
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
	.more a {
		color: var(--ink-2);
		text-decoration: none;
		border-bottom: 1px solid var(--ink-3);
		padding-bottom: 2px;
	}
	.more a:hover {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}
	@media (max-width: 760px) {
		.feed {
			border-top: none;
			padding-top: 0;
		}
		.feed > .empty,
		.feed > .more {
			padding-left: var(--page-pad-x-mobile);
			padding-right: var(--page-pad-x-mobile);
		}
	}
</style>
