<script lang="ts">
	import AddSubreddit from '$lib/components/AddSubreddit.svelte';
	import { subsState, removeSub } from '$lib/stores/subs.svelte';
	import { page } from '$app/state';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const initial = $derived((form?.value as string | undefined) ?? data.current);

	const displayed = $derived(
		subsState.hydrated ? subsState.list : ((page.data.subs as string[] | undefined) ?? [])
	);
</script>

<svelte:head>
	<title>Galley — Set up</title>
</svelte:head>

<section class="setup">
	{#if data.step === 'username'}
		<h1>Welcome to Galley.</h1>
		<p class="lede">
			Before Galley can fetch from Reddit, it needs a Reddit username to identify this instance
			in the API requests it makes. Reddit's developer rules ask each app for a unique
			User-Agent with a contact handle — this is just the contact handle.
		</p>
		<p class="lede small">
			It is sent in the <code>User-Agent</code> header of outbound requests to Reddit and stored
			on this server in <code>.galley-config.json</code>. Nothing else is sent. You can change
			it later from Settings.
		</p>

		<form method="POST" class="form">
			<label for="username">Your Reddit username</label>
			<div class="input-row">
				<span class="prefix">u/</span>
				<input
					id="username"
					name="username"
					type="text"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					required
					value={initial}
					placeholder="username"
				/>
			</div>
			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}
			<div class="actions">
				<button type="submit">Continue →</button>
			</div>
		</form>
	{:else}
		<h1>Pick some subreddits.</h1>
		<p class="lede">
			Galley assembles your front page by reading these subreddits' public JSON endpoints. Add
			as many as you like — keep going until you're done, then click <strong>Continue</strong>
			at the bottom.
		</p>

		<div class="picker">
			<AddSubreddit />
		</div>

		<section class="picked">
			<h2>
				Following
				<span class="count">
					{displayed.length} subreddit{displayed.length === 1 ? '' : 's'}
				</span>
			</h2>
			{#if subsState.error}
				<p class="picked-error">{subsState.error}</p>
			{/if}
			{#if displayed.length === 0}
				<p class="picked-empty">
					<em>Nothing yet. Pick from the suggestions above, or search for one you already follow on Reddit.</em>
				</p>
			{:else}
				<ul>
					{#each displayed as sub (sub)}
						<li>
							<span class="name">r/{sub}</span>
							<button
								type="button"
								class="remove"
								onclick={() => void removeSub(sub)}
								aria-label="Remove r/{sub}"
							>
								Remove
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<div class="actions">
			<a class="primary" href="/">
				{displayed.length > 0 ? `Continue with ${displayed.length} →` : 'Skip for now →'}
			</a>
		</div>
	{/if}
</section>

<style>
	.setup {
		max-width: 60ch;
		padding-top: 24px;
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
		margin: 0 0 14px;
		text-wrap: pretty;
	}
	.lede.small {
		font-size: 14px;
		color: var(--ink-3);
		font-style: italic;
	}
	code {
		font-family: var(--mono);
		font-size: 0.9em;
		background: var(--paper-2);
		padding: 1px 5px;
	}
	.form {
		margin-top: 24px;
	}
	.form label {
		display: block;
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-3);
		margin-bottom: 8px;
	}
	.input-row {
		display: flex;
		align-items: stretch;
		border: 1px solid var(--rule-strong);
		max-width: 360px;
	}
	.prefix {
		display: inline-flex;
		align-items: center;
		padding: 0 10px;
		background: var(--paper-2);
		border-right: 1px solid var(--rule);
		font-family: var(--mono);
		font-size: 14px;
		color: var(--ink-3);
	}
	.input-row input {
		flex: 1;
		min-width: 0;
		border: none;
		background: var(--paper);
		padding: 8px 10px;
		font-family: var(--mono);
		font-size: 16px;
		color: var(--ink);
		outline: none;
	}
	.input-row:focus-within {
		border-color: var(--accent);
	}
	.error {
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		color: var(--accent-deep);
		margin: 10px 0 0;
	}

	.picker {
		margin-top: 24px;
	}

	.picked {
		margin-top: 32px;
		border-top: 1px solid var(--rule);
		padding-top: 18px;
	}
	.picked h2 {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-family: var(--sans);
		font-weight: 500;
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-3);
		margin: 0 0 10px;
	}
	.picked .count {
		font-weight: 400;
		color: var(--ink-4);
		letter-spacing: 0.16em;
	}
	.picked-empty {
		font-family: var(--serif);
		color: var(--ink-3);
		font-size: 14px;
		margin: 6px 0 0;
	}
	.picked-error {
		font-family: var(--serif);
		color: var(--accent-deep);
		font-size: 14px;
		font-style: italic;
		margin: 6px 0 10px;
	}
	.picked ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.picked li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 6px 0;
		border-bottom: 1px solid var(--rule);
	}
	.picked .name {
		font-family: var(--serif);
		font-size: 16px;
		color: var(--ink);
	}
	.picked .remove {
		background: transparent;
		border: none;
		color: var(--ink-3);
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		cursor: pointer;
		padding: 0;
	}
	.picked .remove:hover {
		color: var(--accent-deep);
	}

	.actions {
		margin-top: 24px;
	}
	.actions button,
	.actions .primary {
		display: inline-block;
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink);
		background: var(--paper);
		border: 1px solid var(--ink);
		padding: 8px 18px;
		cursor: pointer;
		text-decoration: none;
	}
	.actions button:hover,
	.actions .primary:hover {
		background: var(--ink);
		color: var(--paper);
	}

	@media (max-width: 760px) {
		.setup {
			padding: 24px var(--page-pad-x-mobile) 0;
		}
		h1 {
			font-size: 26px;
		}
		.lede {
			font-size: 16px;
		}
	}
</style>
