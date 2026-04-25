<script lang="ts">
	import type { PostView } from '$lib/types';
	import { relativeTime } from '$lib/util/time';
	import { formatScore, formatCount } from '$lib/util/format';
	import { placeholderBg, pickHero } from '$lib/util/thumb';
	import VideoPlayer from './VideoPlayer.svelte';
	import Gallery from './Gallery.svelte';

	let { post }: { post: PostView } = $props();

	const externalUrl = $derived(
		post.kind === 'link' && /^https?:\/\//.test(post.url) ? post.url : null
	);
	const heroUrl = $derived(pickHero(post));
	const heroBg = $derived(
		heroUrl
			? `url(${JSON.stringify(heroUrl)}) center/contain no-repeat`
			: placeholderBg(post.hueSeed ?? post.subreddit)
	);
	const canPlayVideo = $derived(
		post.kind === 'video' && (!!post.videoUrl || !!post.videoHlsUrl)
	);
	const canShowGallery = $derived(
		post.kind === 'gallery' && !!post.galleryItems && post.galleryItems.length > 0
	);
</script>

<article class="thread">
	<div class="kicker">
		<a class="sub" href="/r/{post.subreddit}">r/{post.subreddit}</a>
		{#if externalUrl}
			<a class="domain" href={externalUrl} target="_blank" rel="noopener noreferrer">
				{post.domain}
			</a>
		{/if}
	</div>

	<h1 class="title">{post.title}</h1>

	<div class="byline">
		<span class="author">u/{post.author}</span>
		<span class="sep">·</span>
		<span class="pts"><span class="num">{formatScore(post.score)}</span> pts</span>
		<span class="sep">·</span>
		<span><span class="num">{formatCount(post.numComments)}</span> comments</span>
		<span class="sep">·</span>
		<span class="time">{relativeTime(post.createdUtc)}</span>
	</div>

	{#if canPlayVideo}
		<VideoPlayer
			src={post.videoUrl}
			hlsUrl={post.videoHlsUrl}
			poster={post.videoPoster ?? heroUrl}
			isGif={post.videoIsGif}
			width={post.videoWidth}
			height={post.videoHeight}
		/>
	{:else if canShowGallery}
		<Gallery items={post.galleryItems ?? []} />
	{:else if post.kind === 'image' || post.kind === 'video' || post.kind === 'gallery'}
		<a class="hero" href={post.url} target="_blank" rel="noopener noreferrer" aria-label="Open media on Reddit">
			{#if heroUrl}
				<img class="hero-img" src={heroUrl} alt={post.title} loading="lazy" referrerpolicy="no-referrer" />
			{:else}
				<span class="hero-img hero-fallback" style:background={heroBg}></span>
			{/if}
			{#if post.kind === 'video'}
				<span class="play">▶</span>
				{#if post.videoDuration}
					<span class="duration">{post.videoDuration}</span>
				{/if}
				<span class="badge video">Video</span>
			{:else if post.kind === 'gallery'}
				<span class="badge">×{post.galleryCount ?? '·'}</span>
			{/if}
			<span class="hero-note">Open on Reddit</span>
		</a>
	{:else if externalUrl}
		<p class="link-out">
			<a href={externalUrl} target="_blank" rel="noopener noreferrer">
				{externalUrl} <span class="arrow">↗</span>
			</a>
		</p>
	{/if}

	{#if post.selftextHtml}
		<div class="selftext">{@html post.selftextHtml}</div>
	{/if}
</article>

<style>
	.thread {
		border-top: 3px double var(--ink);
		padding-top: 22px;
		padding-bottom: 18px;
		border-bottom: 1px solid var(--rule);
	}

	.kicker {
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--accent);
		margin-bottom: 8px;
		display: flex;
		align-items: baseline;
		gap: 12px;
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
	}
	.kicker .domain::before {
		content: '↗ ';
		color: var(--ink-4);
	}

	.title {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 32px;
		line-height: 1.16;
		letter-spacing: -0.014em;
		font-variation-settings: 'opsz' 60;
		margin: 0 0 12px;
		text-wrap: pretty;
		max-width: 32ch;
	}

	.byline {
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		color: var(--ink-3);
		display: flex;
		gap: 0;
		align-items: baseline;
		flex-wrap: wrap;
		font-feature-settings: 'kern', 'liga', 'onum';
		font-variant-numeric: oldstyle-nums;
	}
	.author {
		color: var(--ink-2);
		font-style: normal;
		font-weight: 500;
	}
	.sep {
		margin: 0 8px;
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
	.time {
		color: var(--ink-4);
	}

	.hero {
		display: block;
		position: relative;
		margin-top: 20px;
		background: var(--paper-2);
		text-decoration: none;
		max-height: 78vh;
		overflow: hidden;
	}
	.hero img.hero-img {
		display: block;
		width: 100%;
		max-height: 78vh;
		object-fit: contain;
		margin: 0 auto;
	}
	.hero span.hero-img.hero-fallback {
		display: block;
		width: 100%;
		aspect-ratio: 16 / 9;
		background-size: cover;
		background-position: center;
	}
	.hero-note {
		position: absolute;
		bottom: 8px;
		right: 10px;
		background: rgba(0, 0, 0, 0.62);
		color: var(--paper);
		font-family: var(--sans);
		font-size: 9px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		padding: 3px 7px;
	}
	.badge {
		position: absolute;
		bottom: 0;
		left: 0;
		background: var(--ink);
		color: var(--paper);
		font-family: var(--sans);
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.16em;
		padding: 3px 6px;
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
		font-size: 32px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
	}
	.duration {
		position: absolute;
		bottom: 6px;
		right: 8px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		font-family: var(--mono);
		font-size: 11px;
		padding: 2px 5px;
	}

	.link-out {
		margin-top: 18px;
		font-family: var(--sans);
		font-size: 12px;
		letter-spacing: 0.04em;
	}
	.link-out a {
		color: var(--accent);
		text-decoration: none;
		word-break: break-all;
	}
	.link-out a:hover {
		text-decoration: underline;
	}
	.link-out .arrow {
		color: var(--ink-4);
	}

	.selftext {
		margin-top: 20px;
		font-family: var(--serif);
		font-size: 17px;
		line-height: 1.55;
		color: var(--ink);
		max-width: 64ch;
	}
	.selftext :global(p) {
		margin: 0 0 14px;
	}
	.selftext :global(p:last-child) {
		margin-bottom: 0;
	}
	.selftext :global(a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.selftext :global(blockquote) {
		border-left: 2px solid var(--rule-strong);
		margin: 0 0 14px;
		padding-left: 14px;
		color: var(--ink-2);
		font-style: italic;
	}
	.selftext :global(code) {
		font-family: var(--mono);
		font-size: 14px;
		background: var(--paper-2);
		padding: 1px 5px;
	}
	.selftext :global(pre) {
		font-family: var(--mono);
		font-size: 13px;
		background: var(--paper-2);
		padding: 10px 12px;
		overflow-x: auto;
		line-height: 1.4;
	}
	.selftext :global(pre code) {
		background: transparent;
		padding: 0;
	}
	.selftext :global(ul),
	.selftext :global(ol) {
		padding-left: 24px;
		margin: 0 0 14px;
	}
	.selftext :global(li) {
		margin-bottom: 4px;
	}
	.selftext :global(h1),
	.selftext :global(h2),
	.selftext :global(h3) {
		font-family: var(--serif);
		font-weight: 500;
		margin: 18px 0 8px;
	}
	.selftext :global(h1) {
		font-size: 22px;
	}
	.selftext :global(h2) {
		font-size: 19px;
	}
	.selftext :global(h3) {
		font-size: 17px;
	}
	.selftext :global(figure.image-embed) {
		margin: 14px 0 18px;
		max-width: 100%;
	}
	.selftext :global(figure.image-embed a) {
		display: block;
		background: var(--paper-2);
		text-decoration: none;
	}
	.selftext :global(figure.image-embed img) {
		display: block;
		max-width: 100%;
		max-height: 600px;
		object-fit: contain;
		margin: 0 auto;
	}
	.selftext :global(img) {
		max-width: 100%;
		height: auto;
	}

	@media (max-width: 760px) {
		.thread {
			border-top: none;
			padding-top: 6px;
		}
		.title {
			font-size: 24px;
		}
		.selftext {
			font-size: 16px;
		}
	}
</style>
