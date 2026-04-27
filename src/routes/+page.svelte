<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import AddSubreddit from '$lib/components/AddSubreddit.svelte';
	import PostListItem from '$lib/components/PostListItem.svelte';
	import FeedHeader from '$lib/components/FeedHeader.svelte';
	import type { PostView } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const sortHref = (s: 'hot' | 'new' | 'top' | 'rising') => {
		const u = new URL(page.url);
		if (s === 'hot') u.searchParams.delete('sort');
		else u.searchParams.set('sort', s);
		return u.pathname + (u.search || '');
	};

	// Client-side accumulator for "Load more". Reset whenever the page data
	// changes (sort change, navigation, invalidate) by keying off `data`.
	let extraPosts = $state<PostView[]>([]);
	let extraErrors = $state<{ sub: string; message: string }[]>([]);
	// svelte-ignore state_referenced_locally
	let afters = $state<Record<string, string | null>>({ ...data.afters });
	// svelte-ignore state_referenced_locally
	let lastData = data;
	let loading = $state(false);

	$effect(() => {
		if (data !== lastData) {
			lastData = data;
			extraPosts = [];
			extraErrors = [];
			afters = { ...data.afters };
		}
	});

	const allPosts = $derived([...data.posts, ...extraPosts]);
	const allErrors = $derived([...data.errors, ...extraErrors]);
	const canLoadMore = $derived(Object.values(afters).some((a) => a !== null));

	async function loadMore() {
		if (loading || !canLoadMore) return;
		loading = true;
		try {
			const res = await fetch('/api/feed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sort: data.sort, afters })
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
			const msg = e instanceof Error ? e.message : 'network error';
			extraErrors = [...extraErrors, { sub: '·', message: msg }];
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Galley — Front page</title>
</svelte:head>

<section class="home">
	{#if data.subs.length === 0}
		<div class="onboarding">
			<h1>Welcome.</h1>
			<p class="lede">
				Galley is a reading interface for Reddit. There is no account and no algorithmic feed.
				Tell it which subreddits you want to follow and it will assemble a merged front page from
				them, using Reddit's public JSON endpoints.
			</p>
			<div class="picker">
				<AddSubreddit onAdded={() => void invalidateAll()} />
			</div>
			<p class="footnote">
				<em>You can rearrange or remove subreddits later from the
					<a href="/settings">settings page</a>.</em>
			</p>
		</div>
	{:else}
		<div class="feed">
			<FeedHeader title="Front page" count={allPosts.length} sort={data.sort} {sortHref} />

			{#if allErrors.length > 0}
				<div class="errors">
					{#each allErrors as err, i (i + ':' + err.sub)}
						<p>
							<em>r/{err.sub} couldn't be loaded — {err.message}</em>
						</p>
					{/each}
				</div>
			{/if}

			{#each allPosts as post (post.id)}
				<PostListItem {post} />
			{/each}

			{#if allPosts.length === 0 && allErrors.length === 0}
				<p class="empty">
					<em>No posts came back from Reddit for this combination of subreddits and sort.</em>
				</p>
			{/if}

			{#if canLoadMore}
				<p class="more">
					<button type="button" onclick={loadMore} disabled={loading}>
						{loading ? 'Loading…' : 'Load more ↓'}
					</button>
				</p>
			{/if}

			<p class="footnote">
				Following {data.subs.length} subreddit{data.subs.length === 1 ? '' : 's'}. Manage from
				<a href="/settings">settings</a>.
			</p>
		</div>
	{/if}
</section>

<style>
	.home {
		border-top: 3px double var(--ink);
	}
	.onboarding {
		max-width: 60ch;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 36px;
		font-variation-settings: 'opsz' 60;
		margin: 0 0 18px;
		letter-spacing: -0.02em;
	}
	.lede {
		font-family: var(--serif);
		font-size: 18px;
		line-height: 1.5;
		color: var(--ink-2);
		margin: 0 0 28px;
		text-wrap: pretty;
	}
	.picker {
		margin-bottom: 22px;
	}
	.footnote {
		font-family: var(--serif);
		font-size: 13px;
		color: var(--ink-3);
		font-style: italic;
		margin-top: 22px;
	}
	.footnote a {
		color: var(--accent);
		text-decoration: none;
	}
	.footnote a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
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
		.home {
			border-top: none;
			padding-top: 0;
		}
		.onboarding,
		.feed > .errors,
		.feed > .empty,
		.feed > .footnote,
		.feed > .more {
			padding-left: var(--page-pad-x-mobile);
			padding-right: var(--page-pad-x-mobile);
		}
		.onboarding {
			padding-top: 24px;
		}
		h1 {
			font-size: 26px;
		}
		.lede {
			font-size: 16px;
		}
	}
</style>
