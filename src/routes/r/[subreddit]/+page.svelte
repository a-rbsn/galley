<script lang="ts">
	import { page } from '$app/state';
	import PostListItem from '$lib/components/PostListItem.svelte';
	import FeedHeader from '$lib/components/FeedHeader.svelte';
	import { addSub, subsState } from '$lib/stores/subs.svelte';
	import type { PostView } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const sortHref = (s: 'hot' | 'new' | 'top' | 'rising') => {
		const u = new URL(page.url);
		if (s === 'hot') u.searchParams.delete('sort');
		else u.searchParams.set('sort', s);
		return u.pathname + (u.search || '');
	};

	let extraPosts = $state<PostView[]>([]);
	let extraErrors = $state<{ sub: string; message: string }[]>([]);
	// svelte-ignore state_referenced_locally
	let after = $state<string | null>(data.after);
	// svelte-ignore state_referenced_locally
	let lastData = data;
	let loading = $state(false);

	$effect(() => {
		if (data !== lastData) {
			lastData = data;
			extraPosts = [];
			extraErrors = [];
			after = data.after;
		}
	});

	const allPosts = $derived([...data.posts, ...extraPosts]);

	async function loadMore() {
		if (loading || after === null) return;
		loading = true;
		try {
			const res = await fetch('/api/feed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sort: data.sort, afters: { [data.sub]: after } })
			});
			if (!res.ok) {
				extraErrors = [
					...extraErrors,
					{ sub: data.sub, message: `Load more failed (${res.status}).` }
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
			after = body.afters[data.sub] ?? null;
			if (body.errors.length > 0) {
				extraErrors = [...extraErrors, ...body.errors];
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'network error';
			extraErrors = [...extraErrors, { sub: data.sub, message: msg }];
		} finally {
			loading = false;
		}
	}

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
					onclick={() => void addSub(data.sub)}
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

	{#if extraErrors.length > 0}
		<div class="errors">
			{#each extraErrors as err, i (i + ':' + err.sub)}
				<p><em>r/{err.sub} couldn't be loaded — {err.message}</em></p>
			{/each}
		</div>
	{/if}

	{#if allPosts.length === 0}
		<p class="empty">
			<em>No posts came back from Reddit for r/{data.sub} ({data.sort}).</em>
		</p>
	{:else}
		{#each allPosts as post (post.id)}
			<PostListItem {post} />
		{/each}

		{#if after !== null}
			<p class="more">
				<button type="button" onclick={loadMore} disabled={loading}>
					{loading ? 'Loading…' : 'Load more ↓'}
				</button>
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
		.feed > .empty,
		.feed > .errors,
		.feed > .more {
			padding-left: var(--page-pad-x-mobile);
			padding-right: var(--page-pad-x-mobile);
		}
	}
</style>
