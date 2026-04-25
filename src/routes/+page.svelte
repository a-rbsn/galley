<script lang="ts">
	import { page } from '$app/state';
	import AddSubreddit from '$lib/components/AddSubreddit.svelte';
	import PostListItem from '$lib/components/PostListItem.svelte';
	import FeedHeader from '$lib/components/FeedHeader.svelte';
	import { subsState } from '$lib/stores/subs.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const sortHref = (s: 'hot' | 'new' | 'top' | 'rising') => {
		const u = new URL(page.url);
		if (s === 'hot') u.searchParams.delete('sort');
		else u.searchParams.set('sort', s);
		return u.pathname + (u.search || '');
	};
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
				<AddSubreddit />
			</div>
			<p class="footnote">
				<em>You can rearrange or remove subreddits later from the
					<a href="/settings">settings page</a>.</em>
			</p>
		</div>
	{:else}
		<div class="feed">
			<FeedHeader title="Front page" count={data.posts.length} sort={data.sort} {sortHref} />

			{#if data.errors.length > 0}
				<div class="errors">
					{#each data.errors as err (err.sub)}
						<p>
							<em>r/{err.sub} couldn't be loaded — {err.message}</em>
						</p>
					{/each}
				</div>
			{/if}

			{#each data.posts as post (post.id)}
				<PostListItem {post} />
			{/each}

			{#if data.posts.length === 0 && data.errors.length === 0}
				<p class="empty">
					<em>No posts came back from Reddit for this combination of subreddits and sort.</em>
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
		padding-top: 28px;
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

	.feed {
		padding-top: 4px;
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

	@media (max-width: 760px) {
		.home {
			border-top: none;
			padding-top: 6px;
		}
		.onboarding,
		.feed > .errors,
		.feed > .empty,
		.feed > .footnote {
			padding-left: var(--page-pad-x-mobile);
			padding-right: var(--page-pad-x-mobile);
		}
		h1 {
			font-size: 26px;
		}
		.lede {
			font-size: 16px;
		}
	}
</style>
