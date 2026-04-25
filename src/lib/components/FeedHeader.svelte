<script lang="ts">
	let {
		title,
		count,
		sort,
		sortHref
	}: {
		title?: string;
		count?: number;
		sort: 'hot' | 'new' | 'top' | 'rising';
		sortHref: (s: 'hot' | 'new' | 'top' | 'rising') => string;
	} = $props();
	const sorts: Array<'hot' | 'new' | 'top' | 'rising'> = ['hot', 'new', 'top', 'rising'];
</script>

<div class="feed-header">
	<h2 class="feed-title">
		{#if title}
			{title}{#if count != null}<span class="dim"> · {count} entries</span>{/if}
		{:else if count != null}
			<em>{count} entries</em>
		{/if}
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
		padding-bottom: 14px;
		border-bottom: 1px solid var(--rule);
		margin-bottom: 18px;
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
	}
	.feed-title .dim {
		color: var(--ink-3);
		font-weight: 300;
		font-size: 14px;
		font-style: italic;
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
			padding: 0 0 10px;
		}
		.feed-title {
			font-size: 17px;
		}
	}
</style>
