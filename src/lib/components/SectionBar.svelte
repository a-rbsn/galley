<script lang="ts">
	import { page } from '$app/state';

	let { subs }: { subs: string[] } = $props();

	const path = $derived(page.url.pathname);
	const activeSub = $derived.by(() => {
		const m = path.match(/^\/r\/([^/]+)/);
		return m ? m[1].toLowerCase() : null;
	});
</script>

<nav class="sectionbar" aria-label="Sections">
	<div class="sectionbar-inner">
		<a href="/" class:active={path === '/'}>Front Page</a>
		{#if subs.length > 0}
			<span class="sep">●</span>
			{#each subs as sub (sub)}
				<a href="/r/{sub}" class:active={activeSub === sub}>r/{sub}</a>
			{/each}
		{/if}
	</div>
</nav>

<style>
	.sectionbar {
		background: var(--paper);
		position: sticky;
		top: 59px;
		z-index: 25;
	}
	.sectionbar-inner {
		max-width: var(--page-max);
		margin: 0 auto;
		padding: 4px var(--page-pad-x);
		display: flex;
		align-items: center;
		gap: 22px;
		font-family: var(--sans);
		font-size: 10.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-3);
		overflow-x: auto;
		scrollbar-width: none;
	}
	.sectionbar-inner::-webkit-scrollbar {
		display: none;
	}
	.sectionbar a {
		color: inherit;
		text-decoration: none;
		white-space: nowrap;
		padding: 2px 0;
	}
	.sectionbar a:hover {
		color: var(--ink);
	}
	.sectionbar a.active {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 2px;
	}
	.sectionbar .sep {
		color: var(--ink-4);
		font-size: 9px;
	}

	@media (max-width: 760px) {
		.sectionbar {
			top: 41px;
		}
		.sectionbar-inner {
			padding: 4px var(--page-pad-x-mobile);
			gap: 14px;
			font-size: 10px;
		}
	}
</style>
