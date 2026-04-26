<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		count,
		sort,
		sortHref,
		titleAction
	}: {
		title?: string;
		count?: number;
		sort: 'hot' | 'new' | 'top' | 'rising';
		sortHref: (s: 'hot' | 'new' | 'top' | 'rising') => string;
		titleAction?: Snippet;
	} = $props();
	const sorts: Array<'hot' | 'new' | 'top' | 'rising'> = ['hot', 'new', 'top', 'rising'];
</script>

<div class="feed-header">
	<h2 class="feed-title">
		{#if count != null}
			<strong class="count">{count}</strong>
			<em>entries{#if title} · {title}{/if}</em>
		{:else if title}
			<em>{title}</em>
		{/if}
		{#if titleAction}{@render titleAction()}{/if}
	</h2>
	<nav class="feed-sort" aria-label="Sort">
		{#each sorts as s (s)}
			<a href={sortHref(s)} class:active={sort === s}>
				{s.charAt(0).toUpperCase() + s.slice(1)}
			</a>
		{/each}
	</nav>
</div>

<style>
	.feed-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 14px 0;
		border-bottom: 1px solid var(--rule);
		gap: 18px;
	}
	.feed-title {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 22px;
		font-variation-settings: 'opsz' 36;
		letter-spacing: -0.005em;
		margin: 0;
	}
	.feed-title em {
		color: var(--ink-3);
		font-weight: 300;
		font-style: italic;
	}
	.feed-title .count {
		color: var(--ink);
		font-weight: 500;
		font-style: normal;
		margin-right: 4px;
	}
	.feed-sort {
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--ink-3);
		display: flex;
		gap: 14px;
	}
	.feed-sort a {
		color: inherit;
		text-decoration: none;
	}
	.feed-sort a.active {
		color: var(--ink);
		border-bottom: 1px solid var(--ink);
		padding-bottom: 2px;
	}
	.feed-sort a:hover {
		color: var(--ink);
	}

	@media (max-width: 760px) {
		.feed-header {
			padding: 10px var(--page-pad-x-mobile) 6px;
			background: var(--paper-2);
			border-bottom: 1px solid var(--rule);
			gap: 14px;
		}
		.feed-title {
			font-size: 12px;
			font-variation-settings: 'opsz' 12;
			letter-spacing: 0;
		}
		.feed-title .count {
			margin-right: 2px;
		}
		.feed-sort {
			font-size: 9.5px;
			letter-spacing: 0.14em;
			gap: 10px;
		}
		.feed-sort a.active {
			border-bottom: none;
			padding-bottom: 0;
		}
	}
</style>
