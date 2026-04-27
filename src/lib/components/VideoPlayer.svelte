<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let {
		src,
		hlsUrl,
		poster,
		isGif = false,
		width,
		height
	}: {
		src?: string;
		hlsUrl?: string;
		poster?: string;
		isGif?: boolean;
		width?: number;
		height?: number;
	} = $props();

	let videoEl: HTMLVideoElement | undefined = $state();
	let teardown: (() => void) | undefined;
	let mode: 'native-hls' | 'hls.js' | 'mp4' | 'none' = $state('none');
	let hasPlayed = $state(false);

	async function attach() {
		if (!videoEl) return;

		// Safari (and some other WebKit) plays HLS natively.
		if (hlsUrl && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
			videoEl.src = hlsUrl;
			mode = 'native-hls';
			return;
		}

		// Everything else: lazy-load hls.js so it isn't in the initial bundle.
		if (hlsUrl) {
			try {
				const { default: Hls } = await import('hls.js');
				if (Hls.isSupported()) {
					const hls = new Hls({ enableWorker: false });
					hls.loadSource(hlsUrl);
					hls.attachMedia(videoEl);
					teardown = () => hls.destroy();
					mode = 'hls.js';
					return;
				}
			} catch {
				// fall through to mp4
			}
		}

		// Last resort: the mp4 fallback. Reddit's fallback_url is video-only
		// for newer posts (audio lives in the HLS/DASH stream), so this path
		// plays silently for non-GIF clips.
		if (src) {
			videoEl.src = src;
			mode = 'mp4';
		}
	}

	onMount(() => {
		void attach();
	});

	onDestroy(() => {
		teardown?.();
	});

	const aspect = $derived(width && height && height > 0 ? width / height : null);

	function togglePlay() {
		if (!videoEl) return;
		if (videoEl.paused || videoEl.ended) void videoEl.play();
		else videoEl.pause();
	}
</script>

<div class="player">
	<video
		bind:this={videoEl}
		controls={!isGif}
		autoplay={isGif}
		loop={isGif}
		muted={isGif}
		playsinline
		preload="metadata"
		{poster}
		style:aspect-ratio={aspect ?? '16 / 9'}
		onclick={togglePlay}
		onplay={() => (hasPlayed = true)}
		onended={() => (hasPlayed = false)}
	></video>
	{#if !isGif && !hasPlayed}
		<!-- Mimics the native pre-play overlay mobile browsers render but desktop
		     ones don't. We make this the click target directly rather than
		     passing through to the video — the video's own click handler plus
		     the browser's built-in click-to-play on <video controls> can fight
		     each other. -->
		<button
			type="button"
			class="play-overlay"
			aria-label="Play video"
			onclick={() => void videoEl?.play()}
		>
			<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
				<circle cx="32" cy="32" r="30" fill="rgba(0,0,0,0.55)" />
				<path d="M26 20 L46 32 L26 44 Z" fill="white" />
			</svg>
		</button>
	{/if}
	{#if mode === 'mp4' && !isGif}
		<p class="note">
			<em>Inline playback is video-only. <a href={src} target="_blank" rel="noopener noreferrer"
					>Open with audio on Reddit</a
				>.</em>
		</p>
	{/if}
</div>

<style>
	.player {
		position: relative;
		margin-top: 20px;
	}
	video {
		display: block;
		width: 100%;
		max-height: 78vh;
		background: var(--ink);
		object-fit: contain;
		cursor: pointer;
	}
	.play-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
	}
	.play-overlay svg {
		display: block;
	}
	/* Mobile browsers render their own centered play button on <video> before
	   first play; ours would stack on top of theirs. Hide on touch devices. */
	@media (hover: none) and (pointer: coarse) {
		.play-overlay {
			display: none;
		}
	}
	.note {
		font-family: var(--serif);
		font-size: 12px;
		color: var(--ink-3);
		margin: 6px 0 0;
	}
	.note a {
		color: var(--accent);
		text-decoration: none;
	}
	.note a:hover {
		text-decoration: underline;
	}
</style>
