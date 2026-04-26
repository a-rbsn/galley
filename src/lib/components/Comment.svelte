<script lang="ts">
	import type { CommentView, MoreCommentsView } from '$lib/types';
	import { relativeTime } from '$lib/util/time';
	import { formatScore } from '$lib/util/format';
	import Self from './Comment.svelte';
	import MoreCommentsLink from './MoreCommentsLink.svelte';

	let {
		comment,
		sub,
		postId,
		onReplaceMore
	}: {
		comment: CommentView;
		sub: string;
		postId: string;
		onReplaceMore: (
			parentList: Array<CommentView | MoreCommentsView>,
			moreId: string,
			replacement: Array<CommentView | MoreCommentsView>
		) => void;
	} = $props();

	let collapsed = $state(false);

	function toggle() {
		collapsed = !collapsed;
	}

	function handleMore(moreId: string, replacement: Array<CommentView | MoreCommentsView>) {
		onReplaceMore(comment.replies, moreId, replacement);
	}

	const nested = $derived(comment.depth > 0);
	const hasReplies = $derived(comment.replies.length > 0);
</script>

<article
	class="comment"
	class:nested
	class:has-replies={hasReplies}
	class:stickied={comment.stickied}
	class:collapsed
>
	<header class="byline">
		<button type="button" class="toggle" onclick={toggle} aria-label={collapsed ? 'Expand' : 'Collapse'}>
			{collapsed ? '+' : '−'}
		</button>
		<span class="author">u/{comment.author}</span>
		<span class="sep">·</span>
		<span class="score">{formatScore(comment.score)} pts</span>
		<span class="sep">·</span>
		<span class="time">{relativeTime(comment.createdUtc)}</span>
		{#if comment.stickied}
			<span class="sep">·</span>
			<span class="pinned">pinned</span>
		{/if}
	</header>

	{#if !collapsed}
		<div class="body">
			{#if comment.bodyHtml}
				{@html comment.bodyHtml}
			{:else}
				<p>{comment.body}</p>
			{/if}
		</div>

		{#if hasReplies}
			<div class="replies">
				{#each comment.replies as reply (reply.id)}
					{#if reply.kind === 't1'}
						<Self comment={reply} {sub} {postId} {onReplaceMore} />
					{:else}
						<MoreCommentsLink
							more={reply}
							{sub}
							{postId}
							onLoad={(rep) => handleMore(reply.id, rep)}
						/>
					{/if}
				{/each}
			</div>
		{/if}
	{/if}
</article>

<style>
	.comment {
		position: relative;
		padding: 8px 0 4px 18px;
	}

	/* Vertical line on the left of comments that have visible replies */
	.comment.has-replies:not(.collapsed)::before {
		content: '';
		position: absolute;
		left: 6px;
		top: 22px;
		bottom: 4px;
		width: 1px;
		background: var(--rule);
	}

	/* Curve hooking back to the parent's vertical line — only on nested comments */
	.comment.nested::after {
		content: '';
		position: absolute;
		top: 0;
		left: -12px;
		width: 18px;
		height: 18px;
		border-left: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		border-bottom-left-radius: 14px;
	}

	.comment.stickied {
		background: linear-gradient(to right, var(--accent-soft), transparent 200px);
	}

	.byline {
		font-family: var(--serif);
		font-style: italic;
		font-size: 13px;
		color: var(--ink-3);
		display: flex;
		align-items: baseline;
		gap: 0;
		flex-wrap: wrap;
		font-feature-settings: 'kern', 'liga', 'onum';
		font-variant-numeric: oldstyle-nums;
	}
	.toggle {
		background: transparent;
		border: 1px solid var(--rule-strong);
		color: var(--ink-3);
		font-family: var(--mono);
		font-size: 11px;
		width: 18px;
		height: 18px;
		line-height: 1;
		padding: 0;
		margin-right: 8px;
		cursor: pointer;
		font-style: normal;
	}
	.toggle:hover {
		border-color: var(--ink);
		color: var(--ink);
	}
	.author {
		color: var(--ink-2);
		font-style: normal;
		font-weight: 500;
	}
	.sep {
		margin: 0 6px;
		color: var(--ink-4);
		font-style: normal;
	}
	.score {
		font-variant-numeric: tabular-nums;
		font-style: italic;
	}
	.time {
		color: var(--ink-4);
	}
	.pinned {
		color: var(--accent);
		font-family: var(--sans);
		font-style: normal;
		text-transform: uppercase;
		font-size: 10px;
		letter-spacing: 0.14em;
	}

	.body {
		margin: 4px 0 6px;
		font-family: var(--serif);
		font-size: 15.5px;
		line-height: 1.5;
		color: var(--ink);
	}
	.body :global(p) {
		margin: 0 0 8px;
	}
	.body :global(p:last-child) {
		margin-bottom: 0;
	}
	.body :global(a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.body :global(blockquote) {
		border-left: 2px solid var(--rule-strong);
		margin: 0 0 8px;
		padding-left: 12px;
		color: var(--ink-2);
		font-style: italic;
	}
	.body :global(code) {
		font-family: var(--mono);
		font-size: 13px;
		background: var(--paper-2);
		padding: 1px 4px;
	}
	.body :global(pre) {
		font-family: var(--mono);
		font-size: 12.5px;
		background: var(--paper-2);
		padding: 8px 10px;
		overflow-x: auto;
	}
	.body :global(pre code) {
		background: transparent;
		padding: 0;
	}
	.body :global(ul),
	.body :global(ol) {
		padding-left: 22px;
		margin: 0 0 8px;
	}
	.body :global(figure.image-embed) {
		margin: 8px 0 12px;
		max-width: 520px;
	}
	.body :global(figure.image-embed a) {
		display: block;
		text-decoration: none;
		background: var(--paper-2);
	}
	.body :global(figure.image-embed img) {
		display: block;
		max-width: 100%;
		max-height: 480px;
		object-fit: contain;
	}
	.body :global(img) {
		max-width: 100%;
		height: auto;
	}

	.replies {
		margin-top: 4px;
	}

	@media (max-width: 760px) {
		.body {
			font-size: 14.5px;
		}
		.byline {
			font-size: 12px;
		}
	}
</style>
