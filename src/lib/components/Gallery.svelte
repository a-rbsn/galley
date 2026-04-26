<script lang="ts">
	import { onMount } from 'svelte';

	let {
		items
	}: {
		items: Array<{ url: string; width: number; height: number; caption?: string }>;
	} = $props();

	let trackEl: HTMLDivElement | undefined = $state();
	let current = $state(0);

	const total = $derived(items.length);

	function scrollToIndex(i: number, smooth = true) {
		if (!trackEl) return;
		const w = trackEl.clientWidth;
		trackEl.scrollTo({ left: i * w, behavior: smooth ? 'smooth' : 'auto' });
	}

	function prev() {
		if (current === 0) return;
		current = current - 1;
		scrollToIndex(current);
	}

	function next() {
		if (current === total - 1) return;
		current = current + 1;
		scrollToIndex(current);
	}

	function onScroll() {
		if (!trackEl) return;
		const w = trackEl.clientWidth;
		if (w === 0) return;
		const idx = Math.round(trackEl.scrollLeft / w);
		if (idx !== current && idx >= 0 && idx < total) {
			current = idx;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			prev();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			next();
		}
	}

	onMount(() => {
		// On mount, ensure scrollLeft is at slide 0 (covers re-entry from cache).
		scrollToIndex(0, false);
	});

	const currentCaption = $derived(items[current]?.caption);
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="gallery"
	role="group"
	aria-roledescription="carousel"
	aria-label="Image gallery"
	tabindex="0"
	onkeydown={onKeydown}
>
	<div
		class="track"
		bind:this={trackEl}
		onscroll={onScroll}
		aria-live="polite"
	>
		{#each items as item, i (item.url)}
			<figure
				class="slide"
				data-index={i}
				role="group"
				aria-roledescription="slide"
				aria-label="{i + 1} of {total}"
			>
				<a href={item.url} target="_blank" rel="noopener noreferrer" tabindex="-1">
					<img
						src={item.url}
						alt={item.caption ?? `Image ${i + 1} of ${total}`}
						loading={i === 0 ? 'eager' : 'lazy'}
						referrerpolicy="no-referrer"
						width={item.width || undefined}
						height={item.height || undefined}
						draggable="false"
					/>
				</a>
			</figure>
		{/each}
	</div>

	<div class="controls" aria-label="Gallery controls">
		<div class="dots" aria-hidden="true">
			{#each items as item, i (item.url)}
				<button
					type="button"
					class="dot"
					class:active={i === current}
					onclick={() => {
						current = i;
						scrollToIndex(i);
					}}
					tabindex="-1"
					aria-label="Go to image {i + 1}"
				></button>
			{/each}
		</div>
	</div>

	{#if currentCaption}
		<p class="caption">{currentCaption}</p>
	{/if}
</div>

<style>
	.gallery {
		margin-top: 20px;
		outline: none;
	}
	.gallery:focus-visible {
		outline: 1px dashed var(--accent);
		outline-offset: 4px;
	}

	.track {
		display: flex;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scroll-behavior: smooth;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
		background: var(--paper-2);
	}
	.track::-webkit-scrollbar {
		display: none;
	}

	.slide {
		flex: 0 0 100%;
		scroll-snap-align: center;
		scroll-snap-stop: always;
		margin: 0;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.slide a {
		display: block;
		width: 100%;
	}
	.slide img {
		display: block;
		width: 100%;
		max-height: 78vh;
		object-fit: contain;
		margin: 0 auto;
		user-select: none;
		-webkit-user-drag: none;
	}

	.controls {
		display: flex;
		justify-content: center;
		padding-top: 10px;
	}

	.dots {
		display: flex;
		gap: 7px;
		justify-content: center;
		flex-wrap: wrap;
	}
	.dot {
		appearance: none;
		background: transparent;
		border: 1px solid var(--rule-strong);
		width: 8px;
		height: 8px;
		padding: 0;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.dot:hover {
		border-color: var(--ink-3);
	}
	.dot.active {
		background: var(--accent);
		border-color: var(--accent);
	}

	.caption {
		margin: 10px 0 0;
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		color: var(--ink-2);
		text-align: center;
		line-height: 1.4;
		max-width: 60ch;
		margin-left: auto;
		margin-right: auto;
	}

	@media (max-width: 760px) {
		.controls {
			gap: 10px;
		}
		.dots {
			gap: 5px;
		}
		.dot {
			width: 6px;
			height: 6px;
		}
	}
</style>
