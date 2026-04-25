<script lang="ts">
	import { page } from '$app/state';

	let { subs }: { subs: string[] } = $props();

	const path = $derived(page.url.pathname);
	const activeSub = $derived.by(() => {
		const m = path.match(/^\/r\/([^/]+)/);
		return m ? m[1].toLowerCase() : null;
	});
</script>

<aside class="rail" aria-label="Subreddits">
	<div class="rail-group">
		<h4>Reading</h4>
		<ul>
			<li class:active={path === '/'}>
				<a href="/" class="rail-name">Front page</a>
			</li>
			<li class:active={path.startsWith('/settings')}>
				<a href="/settings" class="rail-name">Settings</a>
			</li>
		</ul>
	</div>

	{#if subs.length > 0}
		<div class="rail-group">
			<h4>Subscribed</h4>
			<ul>
				{#each subs as sub (sub)}
					<li class:active={activeSub === sub}>
						<a href="/r/{sub}" class="rail-name">{sub}</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</aside>

<style>
	.rail {
		font-family: var(--sans);
		font-size: 12px;
		color: var(--ink-2);
		position: sticky;
		top: 124px;
		align-self: start;
		max-height: calc(100vh - 140px);
		overflow-y: auto;
		scrollbar-width: thin;
	}
	.rail h4 {
		margin: 0 0 8px;
		font-family: var(--sans);
		font-weight: 500;
		font-size: 9.5px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-4);
		border-bottom: 1px solid var(--rule);
		padding-bottom: 6px;
	}
	.rail-group + .rail-group {
		margin-top: 22px;
	}
	.rail ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.rail li {
		padding: 5px 0;
		display: flex;
		align-items: baseline;
		gap: 10px;
	}
	.rail-name {
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		color: var(--ink);
		transition: color 0.15s;
		text-decoration: none;
		display: block;
		flex: 1;
	}
	.rail li:hover .rail-name {
		color: var(--accent);
	}
	.rail li.active .rail-name {
		font-style: normal;
		font-weight: 600;
	}
	.rail li.active::before {
		content: '▸';
		margin-right: 4px;
		color: var(--accent);
		font-size: 10px;
		align-self: center;
	}

	@media (max-width: 1040px) {
		.rail {
			display: none;
		}
	}
</style>
