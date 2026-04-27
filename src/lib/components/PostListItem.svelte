<script lang="ts">
	import type { PostView } from '$lib/types';
	import PostMeta from './PostMeta.svelte';
	import { placeholderBg, pickPreview } from '$lib/util/thumb';

	let { post }: { post: PostView } = $props();

	const hasThumb = $derived(
		post.kind === 'image' || post.kind === 'video' || post.kind === 'gallery'
	);
	// 88px display × 2 for retina = 176; pick the smallest preview at least
	// that wide so the thumbnail stays crisp without pulling a 1080px image.
	const realThumb = $derived(pickPreview(post, 176));
	const fallbackBg = $derived(placeholderBg(post.hueSeed ?? post.subreddit));
</script>

<article class="entry" class:no-thumb={!hasThumb} class:pinned={post.isPinned}>
	<div class="body">
		<div class="kicker">
			<a class="sub" href="/r/{post.subreddit}">r/{post.subreddit}</a>
			{#if post.kind === 'link' && post.domain && post.domain !== `self.${post.subreddit}`}
				<a class="domain" href={post.url} target="_blank" rel="noopener noreferrer">
					{post.domain}
				</a>
			{/if}
		</div>

		<h2 class="title">
			<a href={post.permalink} data-sveltekit-preload-data="hover">{post.title}</a>
		</h2>

		<PostMeta {post} />
	</div>

	{#if hasThumb}
		<a
			class="thumb"
			href={post.permalink}
			data-sveltekit-preload-data="hover"
			aria-hidden="true"
			tabindex="-1"
		>
			{#if realThumb}
				<img class="thumb-img" src={realThumb} alt="" loading="lazy" referrerpolicy="no-referrer" />
			{:else}
				<span class="thumb-img thumb-fallback" style:background={fallbackBg}></span>
			{/if}
			{#if post.kind === 'video'}
				<span class="play">▶</span>
				{#if post.videoDuration}
					<span class="duration">{post.videoDuration}</span>
				{/if}
				<span class="badge video">Video</span>
			{:else if post.kind === 'gallery'}
				<span class="badge">×{post.galleryCount ?? '·'}</span>
			{:else}
				<span class="badge">Photo</span>
			{/if}
		</a>
	{/if}
</article>

<style>
	.entry {
		display: grid;
		grid-template-columns: 1fr 72px;
		gap: 22px;
		padding: 0;
		border-bottom: 1px solid var(--rule);
		align-items: stretch;
		position: relative;
	}
	/* Stretched-link overlay: the title anchor expands to cover the whole
	   article so a tap anywhere on the row goes to the post. The kicker links
	   below sit above this overlay via z-index. */
	.title a::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 0;
	}
	.kicker,
	.thumb {
		position: relative;
		z-index: 1;
	}
	.entry.no-thumb {
		grid-template-columns: 1fr;
	}
	.entry:hover .title a {
		color: var(--accent);
	}

	.body {
		min-width: 0;
		align-self: center;
		padding: 14px 0;
	}

	.kicker {
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--accent);
		margin-bottom: 4px;
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-wrap: nowrap;
		line-height: 1.3;
	}
	.kicker .sub {
		color: var(--accent);
		text-decoration: none;
	}
	.kicker .sub:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.kicker .domain {
		color: var(--ink-3);
		text-transform: none;
		letter-spacing: 0.02em;
		font-size: 11px;
		font-weight: 500;
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.kicker .domain::before {
		content: '↗ ';
		color: var(--ink-4);
	}
	.kicker .domain:hover {
		color: var(--accent);
	}

	.title {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 22px;
		line-height: 1.18;
		letter-spacing: -0.012em;
		font-variation-settings: 'opsz' 32;
		margin: 0;
		text-wrap: pretty;
		max-width: 60ch;
	}
	.title a {
		color: var(--ink);
		text-decoration: none;
		transition: color 0.15s;
	}

	.thumb {
		position: relative;
		align-self: stretch;
		width: 72px;
		min-height: 72px;
		background: var(--paper-2);
		overflow: hidden;
		display: block;
		flex-shrink: 0;
	}
	img.thumb-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	span.thumb-img {
		position: absolute;
		inset: 0;
		display: block;
		background-size: cover;
		background-position: center;
	}
	.badge {
		position: absolute;
		bottom: 0;
		left: 0;
		background: var(--ink);
		color: var(--paper);
		font-family: var(--sans);
		font-size: 8px;
		font-weight: 600;
		letter-spacing: 0.16em;
		padding: 2px 5px;
		line-height: 1.2;
		text-transform: uppercase;
	}
	.badge.video {
		background: var(--accent);
	}
	.play {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--paper);
		font-size: 18px;
		line-height: 1;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
	}
	.duration {
		position: absolute;
		bottom: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		font-family: var(--mono);
		font-size: 9px;
		padding: 1px 4px;
		line-height: 1.2;
	}

	.entry.pinned .kicker {
		color: var(--accent);
	}
	.entry.pinned .title {
		font-style: italic;
	}

	@media (max-width: 760px) {
		.entry {
			gap: 10px;
			padding: 6px 0 7px var(--page-pad-x-mobile);
			grid-template-columns: 1fr 72px;
		}
		.entry:not(.no-thumb) {
			padding-right: 0;
			padding-top: 0;
			padding-bottom: 0;
		}
		.body {
			padding: 0;
		}
		.entry.no-thumb {
			padding-right: var(--page-pad-x-mobile);
		}
		.kicker {
			font-size: 8.5px;
			gap: 6px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.title {
			font-size: 15px;
			line-height: 1.2;
			margin-top: 2px;
			text-wrap: pretty;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
		.thumb {
			width: 72px;
			min-height: 72px;
		}
		.badge {
			font-size: 7px;
			padding: 1px 3px 1px 4px;
		}
		.play {
			font-size: 14px;
		}
	}
</style>
