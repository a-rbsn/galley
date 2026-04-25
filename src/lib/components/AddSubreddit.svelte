<script lang="ts">
	import { addSub, subsState } from '$lib/stores/subs.svelte';
	import { formatScore } from '$lib/util/format';
	import { invalidateAll } from '$app/navigation';

	interface Result {
		name: string;
		prefixed: string;
		title: string;
		subscribers: number;
		description: string;
	}

	let query = $state('');
	let results = $state<Result[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let abortCtrl: AbortController | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const q = query.trim();
		if (debounceTimer) clearTimeout(debounceTimer);
		if (q.length < 2) {
			results = [];
			error = null;
			loading = false;
			return;
		}
		debounceTimer = setTimeout(() => {
			void doSearch(q);
		}, 220);
	});

	async function doSearch(q: string) {
		if (abortCtrl) abortCtrl.abort();
		abortCtrl = new AbortController();
		loading = true;
		error = null;
		try {
			const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`, {
				signal: abortCtrl.signal
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as { results: Result[]; error?: string };
			results = data.results ?? [];
		} catch (e) {
			if (e instanceof Error && e.name !== 'AbortError') {
				error = e.message;
				results = [];
			}
		} finally {
			loading = false;
		}
	}

	function add(name: string) {
		const ok = addSub(name);
		if (ok) {
			query = '';
			results = [];
			error = null;
			void invalidateAll();
		} else {
			error = `Couldn't add r/${name}. Already added or invalid name.`;
		}
	}

	const filteredResults = $derived(
		results.filter((r) => !subsState.list.includes(r.name.toLowerCase()))
	);

	const trimmed = $derived(query.trim());
	const canAddDirectly = $derived(
		trimmed.length >= 2 && /^[a-z0-9_]{2,21}$/i.test(trimmed.replace(/^\/?r\//i, ''))
	);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const top = filteredResults[0];
			if (top) {
				add(top.name);
			} else if (canAddDirectly) {
				add(trimmed);
			}
		}
	}
</script>

<div class="add">
	<label class="field">
		<span class="label">Add a subreddit</span>
		<input
			type="text"
			bind:value={query}
			onkeydown={onKeydown}
			placeholder="e.g. typography, urbanism, askhistorians"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			autocorrect="off"
		/>
	</label>

	{#if loading}
		<div class="status"><em>Searching…</em></div>
	{:else if error}
		<div class="status error">{error}</div>
	{/if}

	{#if filteredResults.length > 0}
		<ul class="results">
			{#each filteredResults as r (r.name)}
				<li>
					<button type="button" onclick={() => add(r.name)}>
						<span class="name">r/{r.name}</span>
						{#if r.subscribers > 0}
							<span class="meta">{formatScore(r.subscribers)} members</span>
						{/if}
						{#if r.description}
							<span class="desc">{r.description}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{:else if !loading && !error && trimmed.length >= 2 && filteredResults.length === 0}
		{#if canAddDirectly}
			<p class="hint">
				No matches. Press <kbd>Enter</kbd> to add <em>r/{trimmed.replace(/^\/?r\//i, '')}</em>
				directly.
			</p>
		{:else}
			<p class="hint">
				<em>No matches. Subreddit names are 2 to 21 characters, letters/digits/underscore only.</em>
			</p>
		{/if}
	{/if}
</div>

<style>
	.add {
		max-width: 60ch;
	}
	.field {
		display: block;
	}
	.label {
		display: block;
		font-family: var(--sans);
		font-size: 9.5px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-3);
		margin-bottom: 6px;
	}
	input {
		width: 100%;
		border: none;
		border-bottom: 1px solid var(--ink);
		background: transparent;
		font-family: var(--serif);
		font-size: 18px;
		padding: 6px 0 8px;
		color: var(--ink);
		outline: none;
	}
	input:focus {
		border-bottom-color: var(--accent);
	}
	input::placeholder {
		color: var(--ink-4);
		font-style: italic;
	}

	.status {
		margin-top: 10px;
		font-family: var(--serif);
		font-style: italic;
		font-size: 13px;
		color: var(--ink-3);
	}
	.status.error {
		color: var(--accent-deep);
	}

	.results {
		list-style: none;
		margin: 14px 0 0;
		padding: 0;
		border-top: 1px solid var(--rule);
	}
	.results li {
		border-bottom: 1px solid var(--rule);
	}
	.results button {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		column-gap: 14px;
		align-items: baseline;
		width: 100%;
		text-align: left;
		background: transparent;
		border: none;
		padding: 10px 0;
		cursor: pointer;
		color: var(--ink);
	}
	.results button:hover {
		background: var(--paper-2);
	}
	.results .name {
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--accent);
	}
	.results .meta {
		font-family: var(--sans);
		font-size: 10px;
		color: var(--ink-3);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		justify-self: end;
	}
	.results .desc {
		grid-column: 1 / -1;
		font-family: var(--serif);
		font-size: 14px;
		color: var(--ink-2);
		font-style: italic;
		max-width: 60ch;
		line-height: 1.35;
		margin-top: 2px;
	}

	.hint {
		font-family: var(--serif);
		font-style: italic;
		color: var(--ink-3);
		font-size: 14px;
		margin-top: 12px;
	}
	.hint kbd {
		font-family: var(--mono);
		font-size: 11px;
		background: var(--paper-2);
		border: 1px solid var(--rule-strong);
		padding: 1px 5px;
		border-radius: 2px;
		color: var(--ink);
		font-style: normal;
	}
</style>
