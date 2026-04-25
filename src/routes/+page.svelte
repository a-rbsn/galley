<script lang="ts">
	import AddSubreddit from '$lib/components/AddSubreddit.svelte';
	import { subsState } from '$lib/stores/subs.svelte';
</script>

<svelte:head>
	<title>Galley — Front page</title>
</svelte:head>

<section class="home">
	{#if subsState.hydrated && subsState.list.length === 0}
		<div class="onboarding">
			<h1>Welcome.</h1>
			<p class="lede">
				Galley is a reading interface for Reddit. There is no account and no algorithmic feed.
				Tell it which subreddits you want to follow and it will assemble a merged front page from
				them, using Reddit's public JSON endpoints.
			</p>
			<div class="picker">
				<AddSubreddit />
			</div>
			<p class="footnote">
				<em>You can rearrange or remove subreddits later from the
					<a href="/settings">settings page</a>.</em>
			</p>
		</div>
	{:else if subsState.hydrated}
		<div class="placeholder">
			<h1>Front page</h1>
			<p>
				Following <strong>{subsState.list.length}</strong> subreddit{subsState.list.length === 1
					? ''
					: 's'}. The merged feed will land here next.
			</p>
		</div>
	{/if}
</section>

<style>
	.home {
		border-top: 3px double var(--ink);
		padding-top: 28px;
	}

	.onboarding {
		max-width: 60ch;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 36px;
		font-variation-settings: 'opsz' 60;
		margin: 0 0 18px;
		letter-spacing: -0.02em;
	}
	.lede {
		font-family: var(--serif);
		font-size: 18px;
		line-height: 1.5;
		color: var(--ink-2);
		margin: 0 0 28px;
		text-wrap: pretty;
	}
	.picker {
		margin-bottom: 22px;
	}
	.footnote {
		font-family: var(--serif);
		font-size: 13px;
		color: var(--ink-3);
	}
	.footnote a {
		color: var(--accent);
		text-decoration: none;
	}
	.footnote a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.placeholder h1 {
		font-size: 22px;
		margin-bottom: 14px;
	}
	.placeholder p {
		font-family: var(--serif);
		color: var(--ink-3);
		font-style: italic;
	}

	@media (max-width: 760px) {
		.home {
			border-top: none;
			padding-top: 6px;
		}
		h1 {
			font-size: 26px;
		}
		.lede {
			font-size: 16px;
		}
	}
</style>
