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
	let paused = $state(true);

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

<div class="player" class:paused>
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
		onplay={() => (paused = false)}
		onpause={() => (paused = true)}
	></video>
	{#if !isGif}
		<button
			type="button"
			class="tap-to-play"
			aria-label="Play video"
			tabindex="-1"
			onclick={togglePlay}
		>
			<span class="play-icon" aria-hidden="true">▶</span>
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
	.tap-to-play {
		position: absolute;
		inset: 0 0 44px 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 0;
		padding: 0;
		cursor: pointer;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.15s ease;
	}
	.player.paused .tap-to-play {
		pointer-events: auto;
		opacity: 1;
	}
	.play-icon {
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		color: var(--paper);
		font-size: 24px;
		padding-left: 4px;
		border-radius: 50%;
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
