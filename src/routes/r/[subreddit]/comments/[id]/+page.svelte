<script lang="ts">
	import Thread from '$lib/components/Thread.svelte';
	import Comment from '$lib/components/Comment.svelte';
	import MoreCommentsLink from '$lib/components/MoreCommentsLink.svelte';
	import type { CommentView, MoreCommentsView } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Local mutable copy so MoreCommentsLink can splice replacements in place.
	// Initialised synchronously for SSR; an $effect re-syncs on navigation.
	// svelte-ignore state_referenced_locally
	let comments = $state<Array<CommentView | MoreCommentsView>>(structuredClone(data.comments));
	let lastDataRef: typeof data.comments = data.comments;
	$effect(() => {
		if (data.comments !== lastDataRef) {
			lastDataRef = data.comments;
			comments = structuredClone(data.comments);
		}
	});

	function replaceMore(
		list: Array<CommentView | MoreCommentsView>,
		moreId: string,
		replacement: Array<CommentView | MoreCommentsView>
	) {
		const idx = list.findIndex((x) => x.kind === 'more' && x.id === moreId);
		if (idx >= 0) {
			list.splice(idx, 1, ...replacement);
		}
	}
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

	{#if comments.length === 0}
		<p class="empty"><em>No comments yet.</em></p>
	{:else}
		{#each comments as item (item.id)}
			{#if item.kind === 't1'}
				<Comment comment={item} sub={data.sub} postId={data.id} onReplaceMore={replaceMore} />
			{:else}
				<MoreCommentsLink
					more={item}
					sub={data.sub}
					postId={data.id}
					onLoad={(rep) => replaceMore(comments, item.id, rep)}
				/>
			{/if}
		{/each}
	{/if}
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
	.empty {
		font-family: var(--serif);
		color: var(--ink-3);
		padding: 18px 0;
	}
</style>
