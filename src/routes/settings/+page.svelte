<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import AddSubreddit from '$lib/components/AddSubreddit.svelte';
	import { subsState, removeSub, moveSub } from '$lib/stores/subs.svelte';

	const displayed = $derived(
		subsState.hydrated ? subsState.list : ((page.data.subs as string[] | undefined) ?? [])
	);

	function handleRemove(name: string) {
		removeSub(name);
		void invalidateAll();
	}

	function handleMove(name: string, dir: -1 | 1) {
		moveSub(name, dir);
		void invalidateAll();
	}
</script>

<svelte:head>
	<title>Galley — Settings</title>
</svelte:head>

<section class="settings">
	<h1>Settings</h1>

	<section class="block">
		<h2>Subreddits</h2>
		<p class="lede">
			Galley assembles your front page by reading these subreddits' public JSON endpoints. Reorder
			to set the priority Galley uses when ranking ties.
		</p>

		{#if displayed.length === 0}
			<p class="empty">
				<em>No subreddits yet. Add one below to start populating the front page.</em>
			</p>
		{:else}
			<ol class="sub-list">
				{#each displayed as sub, i (sub)}
					<li>
						<span class="index">{String(i + 1).padStart(2, '0')}</span>
						<a class="sub-name" href="/r/{sub}">r/{sub}</a>
						<div class="actions">
							<button
								type="button"
								class="arrow"
								disabled={i === 0}
								onclick={() => handleMove(sub, -1)}
								aria-label="Move r/{sub} up"
							>
								↑
							</button>
							<button
								type="button"
								class="arrow"
								disabled={i === displayed.length - 1}
								onclick={() => handleMove(sub, 1)}
								aria-label="Move r/{sub} down"
							>
								↓
							</button>
							<button
								type="button"
								class="remove"
								onclick={() => handleRemove(sub)}
								aria-label="Remove r/{sub}"
							>
								Remove
							</button>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<section class="block">
		<h2>Add a subreddit</h2>
		<AddSubreddit />
	</section>

	<section class="block">
		<h2>About</h2>
		<p class="prose">
			Galley reads Reddit through the public <code>.json</code> endpoints. Nothing is mirrored or
			stored on the server beyond a brief in-memory cache to keep request counts down. Your list
			of subreddits lives in this browser.
		</p>
		<p class="prose">
			There is no account, no voting, no commenting, no submitting. Galley is read-only by design.
		</p>
	</section>
</section>

<style>
	.settings {
		border-top: 3px double var(--ink);
		padding-top: 24px;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 32px;
		font-variation-settings: 'opsz' 60;
		letter-spacing: -0.018em;
		margin: 0 0 6px;
	}

	.block {
		margin-top: 32px;
	}
	.block + .block {
		border-top: 1px solid var(--rule);
		padding-top: 28px;
	}
	h2 {
		font-family: var(--sans);
		font-weight: 500;
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-3);
		margin: 0 0 12px;
	}
	.lede {
		font-family: var(--serif);
		font-style: italic;
		color: var(--ink-3);
		font-size: 14px;
		margin: 0 0 16px;
		max-width: 60ch;
	}
	.empty {
		font-family: var(--serif);
		color: var(--ink-3);
		font-size: 14px;
	}

	.sub-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.sub-list li {
		display: grid;
		grid-template-columns: 32px 1fr auto;
		align-items: baseline;
		gap: 14px;
		padding: 10px 0;
		border-bottom: 1px solid var(--rule);
	}
	.sub-list li:first-child {
		border-top: 1px solid var(--rule);
	}
	.index {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--ink-4);
		letter-spacing: 0.04em;
	}
	.sub-name {
		font-family: var(--serif);
		font-size: 18px;
		color: var(--ink);
		text-decoration: none;
	}
	.sub-name:hover {
		color: var(--accent);
	}
	.actions {
		display: flex;
		gap: 16px;
		align-items: baseline;
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.actions button {
		background: transparent;
		border: none;
		color: var(--ink-3);
		cursor: pointer;
		padding: 0;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
	}
	.actions button:hover:not(:disabled) {
		color: var(--ink);
	}
	.actions button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.arrow {
		font-family: var(--serif);
		font-size: 14px;
		text-transform: none;
	}
	.remove {
		color: var(--ink-3);
	}
	.remove:hover {
		color: var(--accent-deep);
	}

	.prose {
		font-family: var(--serif);
		color: var(--ink-2);
		line-height: 1.55;
		font-size: 16px;
		max-width: 64ch;
		margin: 0 0 12px;
	}
	.prose code {
		font-family: var(--mono);
		font-size: 14px;
		background: var(--paper-2);
		padding: 1px 5px;
	}

	@media (max-width: 760px) {
		.settings {
			border-top: none;
			padding: 6px var(--page-pad-x-mobile) 0;
		}
		h1 {
			font-size: 24px;
		}
		.sub-list li {
			grid-template-columns: 28px 1fr;
			grid-template-rows: auto auto;
			row-gap: 4px;
		}
		.actions {
			grid-column: 1 / -1;
			justify-content: flex-end;
			padding-top: 4px;
		}
	}
</style>
