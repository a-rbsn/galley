<script lang="ts">
	import Thread from '$lib/components/Thread.svelte';
	import CommentsList from '$lib/components/CommentsList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Galley — {data.post.title.slice(0, 80)}</title>
</svelte:head>

<Thread post={data.post} />

<section class="comments" aria-label="Comments">
	<h2 class="comments-heading">
		{data.post.numComments.toLocaleString('en-GB')} comment{data.post.numComments === 1
			? ''
			: 's'}
	</h2>

	{#await data.comments}
		<p class="loading"><em>Loading comments…</em></p>
	{:then result}
		{#if result.ok}
			<CommentsList initial={result.comments} sub={data.sub} postId={data.id} />
		{:else}
			<p class="error"><em>{result.error}</em></p>
		{/if}
	{/await}
</section>

<style>
	.comments {
		margin-top: 24px;
	}
	.comments-heading {
		font-family: var(--sans);
		font-size: 9.5px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-4);
		font-weight: 500;
		margin: 0 0 4px;
		padding-bottom: 6px;
	}
	.loading,
	.error {
		font-family: var(--serif);
		color: var(--ink-3);
		padding: 18px 0;
	}
	.error {
		color: var(--accent-deep);
	}
	@media (max-width: 760px) {
		.comments {
			padding-left: var(--page-pad-x-mobile);
			padding-right: var(--page-pad-x-mobile);
		}
	}
</style>
