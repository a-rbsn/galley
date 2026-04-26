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
	let repliesExpanded = $state(false);

	function toggle() {
		collapsed = !collapsed;
	}

	function toggleReplies() {
		repliesExpanded = !repliesExpanded;
	}

	function handleMore(moreId: string, replacement: Array<CommentView | MoreCommentsView>) {
		onReplaceMore(comment.replies, moreId, replacement);
	}

	function countAllReplies(replies: Array<CommentView | MoreCommentsView>): number {
		let n = 0;
		for (const r of replies) {
			if (r.kind === 't1') n += 1 + countAllReplies(r.replies);
			else n += r.count;
		}
		return n;
	}

	const nested = $derived(comment.depth > 0);
	const hasReplies = $derived(comment.replies.length > 0);
	const totalReplies = $derived(countAllReplies(comment.replies));
</script>

<article
	class="comment"
	class:nested
	class:has-replies={hasReplies}
	class:replies-expanded={repliesExpanded}
	class:stickied={comment.stickied}
	class:collapsed
>
	<button
		type="button"
		class="toggle"
		onclick={toggle}
		aria-label={collapsed ? 'Expand' : 'Collapse'}
	>
		{collapsed ? '+' : '−'}
	</button>
	<header class="byline">
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
			{#if repliesExpanded}
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
				<button type="button" class="hide-replies" onclick={toggleReplies}>
					hide replies
				</button>
			{:else}
				<button type="button" class="show-replies" onclick={toggleReplies}>
					show more replies
				</button>
			{/if}
		{/if}
	{/if}
</article>

<style>
	.comment {
		position: relative;
		padding: 6px 0 4px 26px;
	}

	/* Vertical line on the left of comments with visible replies — runs from
	   under the toggle box down through the comment + replies block. */
	.comment.has-replies:not(.collapsed)::before {
		content: '';
		position: absolute;
		left: 8px;
		top: 26px;
		bottom: 4px;
		width: 1px;
		background: var(--rule);
	}
	/* Collapsed-replies state: line stops at the show-replies button's curve. */
	.comment.has-replies:not(.replies-expanded):not(.collapsed)::before {
		bottom: auto;
		height: calc(100% - 26px - 28px);
	}

	/* Curve hooking back to the parent's vertical line on nested comments —
	   ends at the child's toggle left edge. */
	.comment.nested::after {
		content: '';
		position: absolute;
		top: 0;
		left: -10px;
		width: 10px;
		height: 14px;
		border-left: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		border-bottom-left-radius: 10px;
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
		position: absolute;
		top: 6px;
		left: 0;
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--paper);
		border: 1px solid var(--rule-strong);
		color: var(--ink-3);
		font-family: var(--mono);
		font-size: 10px;
		line-height: 1;
		padding: 0;
		cursor: pointer;
		font-style: normal;
		z-index: 1;
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

	.show-replies {
		position: relative;
		margin: 6px 0;
		padding: 4px 12px;
		background: transparent;
		border: 1px solid var(--rule-strong);
		border-radius: 999px;
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-3);
		cursor: pointer;
	}
	.show-replies:hover {
		border-color: var(--ink);
		color: var(--ink);
	}
	.show-replies::before {
		content: '';
		position: absolute;
		top: 0;
		left: -10px;
		width: 10px;
		height: 14px;
		border-left: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		border-bottom-left-radius: 10px;
	}

	.hide-replies {
		position: relative;
		margin: 6px 0 4px;
		padding: 4px 0;
		background: transparent;
		border: none;
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-3);
		cursor: pointer;
	}
	.hide-replies:hover {
		color: var(--ink);
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
