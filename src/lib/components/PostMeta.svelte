<script lang="ts">
	import type { PostView } from '$lib/types';
	import { relativeTime } from '$lib/util/time';
	import { formatScore, formatCount } from '$lib/util/format';

	let { post }: { post: PostView } = $props();
</script>

<div class="byline">
	<span class="author">u/{post.author}</span>
	<span class="sep">·</span>
	<span class="pts"><span class="num">{formatScore(post.score)}</span> pts</span>
	<span class="sep">·</span>
	<a class="comments" href={post.permalink}>
		<span class="num">{formatCount(post.numComments)}</span> comments
	</a>
	<span class="sep">·</span>
	<span class="time">{relativeTime(post.createdUtc)}</span>
</div>

<style>
	.byline {
		margin-top: 6px;
		font-family: var(--serif);
		font-style: italic;
		font-size: 13px;
		color: var(--ink-3);
		display: flex;
		gap: 0;
		align-items: baseline;
		flex-wrap: wrap;
		line-height: 1.4;
		font-feature-settings: 'kern', 'liga', 'onum';
		font-variant-numeric: oldstyle-nums;
	}
	.author {
		color: var(--ink-2);
		font-style: normal;
		font-weight: 500;
	}
	.sep {
		margin: 0 5px;
		color: var(--ink-4);
		font-style: normal;
	}
	.pts {
		font-style: italic;
		color: var(--ink-3);
		font-variant-numeric: tabular-nums;
	}
	.pts .num {
		color: var(--ink-2);
		font-style: normal;
	}
	.comments {
		font-style: italic;
		color: var(--ink-3);
		text-decoration: none;
	}
	.comments:hover {
		color: var(--accent);
	}
	.comments .num {
		color: var(--ink-2);
		font-style: normal;
		font-variant-numeric: tabular-nums;
	}
	.time {
		font-style: italic;
		color: var(--ink-4);
	}

	@media (max-width: 760px) {
		.byline {
			display: block;
			margin-top: 2px;
			font-size: 11px;
			line-height: 1.2;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.sep {
			margin: 0 4px;
		}
		.comments {
			/* keep clickable but flow inline with the rest of the byline */
			display: inline;
		}
	}
</style>
