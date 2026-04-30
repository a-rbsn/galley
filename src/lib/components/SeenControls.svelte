<script lang="ts">
	import { clearSeen, seenState, setHideSeen } from '$lib/stores/seen.svelte';

	let {
		hidden = 0,
		placement = 'page'
	}: {
		hidden?: number;
		placement?: 'page' | 'footer';
	} = $props();
</script>

{#if seenState.hydrated && (seenState.ids.length > 0 || seenState.hideSeen)}
	<div class="seen-controls" class:footer={placement === 'footer'}>
		<button type="button" onclick={() => setHideSeen(!seenState.hideSeen)}>
			{seenState.hideSeen ? 'Show seen' : 'Hide seen'}
		</button>
		<span>
			{seenState.ids.length.toLocaleString('en-GB')} read{#if seenState.hideSeen && hidden > 0}
				· {hidden.toLocaleString('en-GB')} hidden
			{/if}
		</span>
		<button type="button" class="quiet" onclick={clearSeen}>Clear</button>
	</div>
{/if}

<style>
	.seen-controls {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 10px 0 0;
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--ink-4);
	}
	.seen-controls.footer {
		padding: 0;
		font-size: inherit;
		letter-spacing: inherit;
		color: inherit;
	}
	button {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--rule-strong);
		color: var(--ink-3);
		cursor: pointer;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		padding: 0 0 2px;
	}
	button:hover {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}
	.quiet {
		color: var(--ink-4);
	}

	@media (max-width: 760px) {
		.seen-controls {
			padding: 8px var(--page-pad-x-mobile) 0;
			font-size: 9px;
			gap: 8px;
			flex-wrap: wrap;
		}
		.seen-controls.footer {
			padding: 0;
			font-size: inherit;
		}
	}
</style>
