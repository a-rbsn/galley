<script lang="ts">
	import Comment from './Comment.svelte';
	import MoreCommentsLink from './MoreCommentsLink.svelte';
	import type { CommentView, MoreCommentsView } from '$lib/types';

	let {
		initial,
		sub,
		postId
	}: {
		initial: Array<CommentView | MoreCommentsView>;
		sub: string;
		postId: string;
	} = $props();

	// Local writable copy so MoreCommentsLink can splice replacements in place.
	// svelte-ignore state_referenced_locally
	let comments = $state<Array<CommentView | MoreCommentsView>>(structuredClone(initial));
	// svelte-ignore state_referenced_locally
	let lastInitial = initial;
	$effect(() => {
		if (initial !== lastInitial) {
			lastInitial = initial;
			comments = structuredClone(initial);
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

{#if comments.length === 0}
	<p class="empty"><em>No comments yet.</em></p>
{:else}
	{#each comments as item (item.id)}
		{#if item.kind === 't1'}
			<Comment comment={item} {sub} {postId} onReplaceMore={replaceMore} />
		{:else}
			<MoreCommentsLink
				more={item}
				{sub}
				{postId}
				onLoad={(rep) => replaceMore(comments, item.id, rep)}
			/>
		{/if}
	{/each}
{/if}

<style>
	.empty {
		font-family: var(--serif);
		color: var(--ink-3);
		padding: 18px 0;
	}
</style>
