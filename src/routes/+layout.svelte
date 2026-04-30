<script lang="ts">
	import '$lib/styles/tokens.css';
	import '$lib/styles/reset.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import Masthead from '$lib/components/Masthead.svelte';
	import SectionBar from '$lib/components/SectionBar.svelte';
	import SubList from '$lib/components/SubList.svelte';
	import Colophon from '$lib/components/Colophon.svelte';
	import { hydrateSubs } from '$lib/stores/subs.svelte';
	import { hydrateSeen } from '$lib/stores/seen.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// First-run setup is a chrome-less screen — none of the nav makes sense
	// before there's a configured instance, and every link would just redirect
	// back to /setup anyway.
	const isSetup = $derived(page.url.pathname === '/setup');

	onMount(() => {
		hydrateSubs(data.subs);
		hydrateSeen();

		if (import.meta.env.PROD && 'serviceWorker' in navigator) {
			void navigator.serviceWorker.register('/service-worker.js');
		}

		const masthead = document.querySelector('.masthead');
		if (!masthead) return;
		const root = document.documentElement;
		const update = () => {
			root.style.setProperty('--masthead-h', `${masthead.getBoundingClientRect().height}px`);
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(masthead);
		return () => ro.disconnect();
	});
</script>

<svelte:head>
	<title>Galley</title>
</svelte:head>

{#if isSetup}
	<main class="page setup-page">
		<section class="content">
			{@render children()}
		</section>
	</main>
{:else}
	<Masthead />
	<SectionBar subs={data.subs} feeds={data.feeds} />

	<main class="page">
		<SubList subs={data.subs} feeds={data.feeds} />
		<section class="content">
			{@render children()}
		</section>
		<div class="trail" aria-hidden="true"></div>
	</main>

	<Colophon />
{/if}

<style>
	.page {
		max-width: var(--page-max);
		margin: 0 auto;
		padding: 28px var(--page-pad-x) 60px;
		display: grid;
		grid-template-columns: var(--col-rail) minmax(0, var(--col-feed)) 1fr;
		gap: var(--gap);
	}
	.content {
		min-width: 0;
	}
	.page.setup-page {
		grid-template-columns: minmax(0, 1fr);
	}

	@media (max-width: 1040px) {
		.page {
			grid-template-columns: minmax(0, var(--col-feed)) 1fr;
			gap: 40px;
		}
	}
	@media (max-width: 760px) {
		.page {
			grid-template-columns: minmax(0, 1fr);
			padding: 0 0 40px;
			gap: 0;
		}
		.trail {
			display: none;
		}
	}
</style>
