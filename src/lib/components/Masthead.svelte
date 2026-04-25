<script lang="ts">
	function formatDate(d: Date): string {
		const day = d.toLocaleDateString('en-GB', { weekday: 'long' });
		const date = d.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
		return `${day} · ${date}`;
	}

	const today = formatDate(new Date());
</script>

<header class="masthead">
	<div class="masthead-inner">
		<div class="dateline">{today}</div>
		<a class="nameplate" href="/">Galley<span class="amp">.</span></a>
		<div class="top-actions">
			<a class="top-link" href="/settings">Settings</a>
		</div>
	</div>
</header>

<style>
	.masthead {
		border-bottom: 1px solid var(--ink);
		background: var(--paper);
		position: sticky;
		top: 0;
		z-index: 30;
	}
	.masthead-inner {
		max-width: var(--page-max);
		margin: 0 auto;
		padding: 14px var(--page-pad-x) 12px;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: end;
		gap: 24px;
	}
	.dateline {
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-3);
		font-variant-numeric: tabular-nums;
	}
	.nameplate {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 30px;
		letter-spacing: -0.01em;
		line-height: 1;
		font-variation-settings: 'opsz' 60;
		text-align: center;
		padding-bottom: 2px;
		text-decoration: none;
		color: var(--ink);
	}
	.nameplate .amp {
		font-style: italic;
		color: var(--accent);
		font-weight: 400;
	}
	.top-actions {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 22px;
		font-family: var(--sans);
		font-size: 12px;
		color: var(--ink-2);
	}
	.top-link {
		color: var(--ink-2);
		text-decoration: none;
	}
	.top-link:hover {
		color: var(--accent);
	}

	@media (max-width: 760px) {
		.masthead-inner {
			grid-template-columns: auto auto;
			padding: 10px var(--page-pad-x-mobile) 8px;
		}
		.dateline {
			display: none;
		}
		.nameplate {
			text-align: left;
			font-size: 22px;
		}
	}
</style>
