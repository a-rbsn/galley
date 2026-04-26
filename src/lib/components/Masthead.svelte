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
			<a class="top-link cog-link" href="/settings" aria-label="Settings" title="Settings">
				<svg
					class="cog"
					viewBox="0 0 24 24"
					width="18"
					height="18"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="3" />
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
					/>
				</svg>
			</a>
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
		padding: 8px var(--page-pad-x) 6px;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
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
	.cog-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		align-self: center;
		padding: 8px;
		margin: 0 -8px 0 0;
		line-height: 0;
	}
	.cog {
		display: block;
	}

	@media (max-width: 760px) {
		.masthead-inner {
			grid-template-columns: auto auto;
			padding: 6px var(--page-pad-x-mobile) 4px;
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
