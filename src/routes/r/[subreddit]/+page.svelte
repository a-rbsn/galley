<script lang="ts">
	import { page } from '$app/state';
	import PostListItem from '$lib/components/PostListItem.svelte';
	import FeedHeader from '$lib/components/FeedHeader.svelte';
	import { addSub, subsState } from '$lib/stores/subs.svelte';
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

	const inFeed = $derived(subsState.list.includes(data.sub));
	// Suppress the button until the client store has hydrated, otherwise SSR
	// would render "add" for users who already have the sub saved.
	const showAdd = $derived(subsState.hydrated && !inFeed);
</script>

<svelte:head>
	<title>Galley — r/{data.sub}</title>
</svelte:head>

<section class="feed">
	<FeedHeader title="r/{data.sub}" sort={data.sort} {sortHref}>
		{#snippet titleAction()}
			{#if showAdd}
				<button
					type="button"
					class="add-button"
					title="Add r/{data.sub} to feed"
					aria-label="Add r/{data.sub} to feed"
					onclick={() => addSub(data.sub)}
				>
					<svg
						viewBox="0 0 24 24"
						width="12"
						height="12"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						aria-hidden="true"
					>
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
				</button>
			{/if}
		{/snippet}
	</FeedHeader>

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
	}
	.add-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-left: 10px;
		width: 22px;
		height: 22px;
		padding: 0;
		background: var(--paper);
		border: 1px solid var(--rule);
		border-radius: 50%;
		color: var(--ink-3);
		cursor: pointer;
		vertical-align: middle;
	}
	.add-button svg {
		display: block;
	}
	.add-button:hover {
		border-color: var(--accent);
		color: var(--accent);
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
