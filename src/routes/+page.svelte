<script lang="ts">
	import { subsState } from '$lib/stores/subs.svelte';
</script>

<svelte:head>
	<title>Galley — Front page</title>
</svelte:head>

<section class="placeholder">
	<h1>Front page</h1>
	{#if subsState.list.length === 0}
		<p class="empty">
			You haven't added any subreddits yet. Add a few from the
			<a href="/settings">settings page</a> to populate your front page.
		</p>
	{:else}
		<p class="empty">
			Following <strong>{subsState.list.length}</strong> subreddit{subsState.list.length === 1
				? ''
				: 's'}. The merged feed will land here next.
		</p>
	{/if}
</section>

<style>
	.placeholder {
		border-top: 3px double var(--ink);
		padding-top: 20px;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 22px;
		margin: 0 0 14px;
		font-variation-settings: 'opsz' 36;
	}
	.empty {
		font-family: var(--serif);
		color: var(--ink-3);
		font-style: italic;
		max-width: 50ch;
	}
	.empty a {
		color: var(--accent);
		text-decoration: none;
	}
	.empty a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
