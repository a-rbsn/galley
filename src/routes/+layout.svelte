<script lang="ts">
	import '$lib/styles/tokens.css';
	import '$lib/styles/reset.css';
	import { onMount } from 'svelte';
	import Masthead from '$lib/components/Masthead.svelte';
	import SectionBar from '$lib/components/SectionBar.svelte';
	import SubList from '$lib/components/SubList.svelte';
	import Colophon from '$lib/components/Colophon.svelte';
	import { hydrateSubs } from '$lib/stores/subs.svelte';

	let { children } = $props();

	onMount(() => {
		hydrateSubs();
	});
</script>

<svelte:head>
	<title>Galley</title>
</svelte:head>

<Masthead />
<SectionBar />

<main class="page">
	<SubList />
	<section class="content">
		{@render children()}
	</section>
	<div class="trail" aria-hidden="true"></div>
</main>

<Colophon />

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

	@media (max-width: 1040px) {
		.page {
			grid-template-columns: minmax(0, var(--col-feed)) 1fr;
			gap: 40px;
		}
	}
	@media (max-width: 760px) {
		.page {
			grid-template-columns: minmax(0, 1fr);
			padding: 20px var(--page-pad-x-mobile) 40px;
			gap: 0;
		}
		.trail {
			display: none;
		}
	}
</style>
