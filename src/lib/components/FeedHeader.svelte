<script lang="ts">
	import type { Snippet } from 'svelte';
	import { rangeLabel, SORTS, TOP_RANGES, type Sort, type TopRange } from '$lib/feed';

	let {
		title,
		count,
		sort,
		topRange,
		sortHref,
		topRangeHref,
		titleAction
	}: {
		title?: string;
		count?: number;
		sort: Sort;
		topRange?: TopRange;
		sortHref: (s: Sort) => string;
		topRangeHref?: (range: TopRange) => string;
		titleAction?: Snippet;
	} = $props();
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
	<div class="feed-controls">
		<nav class="feed-sort" aria-label="Sort">
			{#each SORTS as s (s)}
				<a href={sortHref(s)} class:active={sort === s}>
					{s.charAt(0).toUpperCase() + s.slice(1)}
				</a>
			{/each}
		</nav>
		{#if sort === 'top' && topRange && topRangeHref}
			<nav class="range-sort" aria-label="Top time range">
				{#each TOP_RANGES as range (range)}
					<a href={topRangeHref(range)} class:active={topRange === range}>
						{rangeLabel(range)}
					</a>
				{/each}
			</nav>
		{/if}
	</div>
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
	.feed-controls {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 7px;
	}
	.feed-sort,
	.range-sort {
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--ink-3);
		display: flex;
		gap: 14px;
	}
	.range-sort {
		font-size: 9.5px;
		letter-spacing: 0.14em;
		color: var(--ink-4);
		gap: 10px;
	}
	.feed-sort a,
	.range-sort a {
		color: inherit;
		text-decoration: none;
	}
	.feed-sort a.active,
	.range-sort a.active {
		color: var(--ink);
		border-bottom: 1px solid var(--ink);
		padding-bottom: 2px;
	}
	.feed-sort a:hover,
	.range-sort a:hover {
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
		.feed-controls {
			gap: 4px;
		}
		.feed-sort,
		.range-sort {
			font-size: 9.5px;
			letter-spacing: 0.14em;
			gap: 10px;
		}
		.range-sort {
			font-size: 8.5px;
		}
		.feed-sort a.active,
		.range-sort a.active {
			border-bottom: none;
			padding-bottom: 0;
		}
	}
</style>
