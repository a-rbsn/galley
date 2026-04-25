<script lang="ts">
	let {
		items
	}: {
		items: Array<{ url: string; width: number; height: number; caption?: string }>;
	} = $props();
</script>

<div class="gallery" aria-label="Image gallery">
	{#each items as item, i (item.url)}
		<figure>
			<a href={item.url} target="_blank" rel="noopener noreferrer">
				<img
					src={item.url}
					alt={item.caption ?? `Image ${i + 1} of ${items.length}`}
					loading={i === 0 ? 'eager' : 'lazy'}
					referrerpolicy="no-referrer"
					width={item.width || undefined}
					height={item.height || undefined}
				/>
			</a>
			<figcaption>
				<span class="counter">{String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
				{#if item.caption}
					<span class="text">{item.caption}</span>
				{/if}
			</figcaption>
		</figure>
	{/each}
</div>

<style>
	.gallery {
		margin-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	figure {
		margin: 0;
		display: block;
	}
	a {
		display: block;
		background: var(--paper-2);
	}
	img {
		display: block;
		width: 100%;
		max-height: 78vh;
		object-fit: contain;
		margin: 0 auto;
	}
	figcaption {
		display: flex;
		gap: 14px;
		align-items: baseline;
		padding-top: 6px;
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-3);
	}
	.counter {
		font-family: var(--mono);
		color: var(--ink-4);
		text-transform: none;
		letter-spacing: 0.04em;
	}
	.text {
		font-family: var(--serif);
		font-style: italic;
		text-transform: none;
		letter-spacing: 0;
		font-size: 13px;
		color: var(--ink-2);
	}

	@media (max-width: 760px) {
		.gallery {
			gap: 18px;
		}
	}
</style>
