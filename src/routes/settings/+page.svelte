<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import AddSubreddit from '$lib/components/AddSubreddit.svelte';
	import { subsState, removeSub, moveSub, reorderSub } from '$lib/stores/subs.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const displayed = $derived(
		subsState.hydrated ? subsState.list : ((page.data.subs as string[] | undefined) ?? [])
	);

	const usernameValue = $derived(
		(form && 'value' in form ? (form.value as string) : undefined) ?? data.redditUsername
	);
	const usernameSaved = $derived(form && 'saved' in form && form.saved);
	const usernameError = $derived(form && 'error' in form ? (form.error as string) : null);
	const feedError = $derived(form && 'feedError' in form ? (form.feedError as string) : null);
	const feedNameValue = $derived(form && 'feedName' in form ? (form.feedName as string) : '');

	let dragIndex = $state<number | null>(null);
	let dropIndex = $state<number | null>(null);

	async function handleRemove(name: string) {
		if (await removeSub(name)) void invalidateAll();
	}

	async function handleMove(name: string, dir: -1 | 1) {
		if (await moveSub(name, dir)) void invalidateAll();
	}

	function handleDragStart(e: DragEvent, i: number) {
		dragIndex = i;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(i));
		}
	}

	function handleDragOver(e: DragEvent, i: number) {
		if (dragIndex === null) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropIndex = i;
	}

	async function handleDrop(e: DragEvent, i: number) {
		e.preventDefault();
		if (dragIndex === null) return;
		const from = dragIndex;
		dragIndex = null;
		dropIndex = null;
		if (from === i) return;
		if (await reorderSub(from, i)) void invalidateAll();
	}

	function handleDragEnd() {
		dragIndex = null;
		dropIndex = null;
	}
</script>

<svelte:head>
	<title>Galley — Settings</title>
</svelte:head>

<section class="settings">
	<h1>Settings</h1>

	<section class="block">
		<h2>Subreddits</h2>
		<p class="lede">
			Galley assembles your front page by reading these subreddits' public JSON endpoints. Reorder
			to set the priority Galley uses when ranking ties.
		</p>

		{#if displayed.length === 0}
			<p class="empty">
				<em>No subreddits yet. Add one below to start populating the front page.</em>
			</p>
		{:else}
			{#if subsState.error}
				<p class="save-error">{subsState.error}</p>
			{/if}
			<ol class="sub-list">
				{#each displayed as sub, i (sub)}
					<li
						draggable="true"
						class:dragging={dragIndex === i}
						class:drop-above={dropIndex === i && dragIndex !== null && dragIndex > i}
						class:drop-below={dropIndex === i && dragIndex !== null && dragIndex < i}
						ondragstart={(e) => handleDragStart(e, i)}
						ondragover={(e) => handleDragOver(e, i)}
						ondrop={(e) => handleDrop(e, i)}
						ondragend={handleDragEnd}
					>
						<span class="grip" aria-hidden="true">⋮⋮</span>
						<span class="index">{String(i + 1).padStart(2, '0')}</span>
						<a class="sub-name" href="/r/{sub}" draggable="false">r/{sub}</a>
						<div class="actions">
							<button
								type="button"
								class="arrow"
								disabled={i === 0}
								onclick={() => handleMove(sub, -1)}
								aria-label="Move r/{sub} up"
							>
								↑
							</button>
							<button
								type="button"
								class="arrow"
								disabled={i === displayed.length - 1}
								onclick={() => handleMove(sub, 1)}
								aria-label="Move r/{sub} down"
							>
								↓
							</button>
							<button
								type="button"
								class="remove"
								onclick={() => handleRemove(sub)}
								aria-label="Remove r/{sub}"
							>
								Remove
							</button>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<section class="block">
		<AddSubreddit onAdded={() => void invalidateAll()} />
	</section>

	<section class="block">
		<h2>Custom feeds</h2>
		<p class="lede">
			Group your followed subreddits into smaller front pages. Each custom feed uses the same
			balanced ranking as the main front page.
		</p>

		{#if data.customFeeds.length > 0}
			<ul class="feed-list">
				{#each data.customFeeds as feed (feed.id)}
					<li>
						<a class="feed-name" href="/f/{feed.id}">{feed.name}</a>
						<span class="feed-subs">
							{feed.subreddits.map((sub) => `r/${sub}`).join(', ')}
						</span>
						<form method="POST" action="?/deleteFeed">
							<input type="hidden" name="id" value={feed.id} />
							<button type="submit">Remove</button>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty"><em>No custom feeds yet.</em></p>
		{/if}

		<form method="POST" action="?/createFeed" class="feed-form">
			<label class="feed-name-field">
				<span>Name</span>
				<input
					name="name"
					type="text"
					value={feedNameValue}
					placeholder="Design, News, Weekend"
					required
				/>
			</label>

			{#if displayed.length > 0}
				<div class="feed-picker" aria-label="Choose subreddits">
					{#each displayed as sub (sub)}
						<label>
							<input type="checkbox" name="subs" value={sub} />
							<span>r/{sub}</span>
						</label>
					{/each}
				</div>
			{:else}
				<p class="empty"><em>Add subreddits before creating a custom feed.</em></p>
			{/if}

			{#if feedError}
				<p class="form-error">{feedError}</p>
			{/if}

			<button type="submit" disabled={displayed.length === 0}>Create feed</button>
		</form>
	</section>

	<section class="block">
		<h2>Reddit identity</h2>
		<p class="lede">
			Galley sends a User-Agent like <code>web:io.galley.app:v0.1.0 (by /u/your-name)</code>
			on every Reddit request — Reddit's API rules ask each app to identify itself with a
			contact handle. Setting your own keeps this instance in its own rate-limit bucket
			instead of sharing one with every other self-hoster.
		</p>
		{#if data.envOverride}
			<p class="notice">
				<em>
					This instance has <code>REDDIT_USER_AGENT</code> set as an environment variable, which
					overrides whatever you save here.
				</em>
			</p>
		{/if}
		<form method="POST" action="?/username" class="username-form">
			<div class="input-row">
				<span class="prefix">u/</span>
				<input
					name="username"
					type="text"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					required
					value={usernameValue}
					placeholder="username"
				/>
				<button type="submit">Save</button>
			</div>
			{#if usernameError}
				<p class="form-error">{usernameError}</p>
			{:else if usernameSaved}
				<p class="form-ok"><em>Saved.</em></p>
			{/if}
		</form>
	</section>

	<section class="block">
		<h2>About</h2>
		<p class="prose">
			Galley reads Reddit through the public <code>.json</code> endpoints. Nothing is mirrored or
			stored on the server beyond a response cache to keep request counts down. Your list of
			subreddits lives in this instance's server config file.
		</p>
		<p class="prose">
			There is no account, no voting, no commenting, no submitting. Galley is read-only by design.
		</p>
	</section>
</section>

<style>
	.settings {
		border-top: 3px double var(--ink);
		padding-top: 24px;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 32px;
		font-variation-settings: 'opsz' 60;
		letter-spacing: -0.018em;
		margin: 0 0 6px;
	}

	.block {
		margin-top: 32px;
	}
	.block + .block {
		border-top: 1px solid var(--rule);
		padding-top: 28px;
	}
	h2 {
		font-family: var(--sans);
		font-weight: 500;
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-3);
		margin: 0 0 12px;
	}
	.lede {
		font-family: var(--serif);
		font-style: italic;
		color: var(--ink-3);
		font-size: 14px;
		margin: 0 0 16px;
		max-width: 60ch;
	}
	.empty {
		font-family: var(--serif);
		color: var(--ink-3);
		font-size: 14px;
	}
	.save-error {
		font-family: var(--serif);
		color: var(--accent-deep);
		font-size: 14px;
		font-style: italic;
		margin: 0 0 10px;
	}

	.sub-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.sub-list li {
		display: grid;
		grid-template-columns: 16px 32px 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 5px 0;
		border-bottom: 1px solid var(--rule);
		cursor: grab;
		transition: background 120ms ease;
	}
	.sub-list li:active {
		cursor: grabbing;
	}
	.sub-list li:first-child {
		border-top: 1px solid var(--rule);
	}
	.sub-list li.dragging {
		opacity: 0.4;
	}
	.sub-list li.drop-above {
		box-shadow: inset 0 2px 0 0 var(--accent);
	}
	.sub-list li.drop-below {
		box-shadow: inset 0 -2px 0 0 var(--accent);
	}
	.grip {
		font-family: var(--mono);
		font-size: 12px;
		color: var(--ink-4);
		letter-spacing: -2px;
		user-select: none;
		cursor: grab;
	}
	.sub-list li:hover .grip {
		color: var(--ink-3);
	}
	.index {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--ink-4);
		letter-spacing: 0.04em;
	}
	.sub-name {
		font-family: var(--serif);
		font-size: 18px;
		color: var(--ink);
		text-decoration: none;
	}
	.sub-name:hover {
		color: var(--accent);
	}
	.actions {
		display: flex;
		gap: 16px;
		align-items: baseline;
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.actions button {
		background: transparent;
		border: none;
		color: var(--ink-3);
		cursor: pointer;
		padding: 0;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
	}
	.actions button:hover:not(:disabled) {
		color: var(--ink);
	}
	.actions button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.arrow {
		font-family: var(--serif);
		font-size: 14px;
		text-transform: none;
	}
	.remove {
		color: var(--ink-3);
	}
	.remove:hover {
		color: var(--accent-deep);
	}

	.feed-list {
		list-style: none;
		padding: 0;
		margin: 0 0 18px;
		border-top: 1px solid var(--rule);
	}
	.feed-list li {
		display: grid;
		grid-template-columns: minmax(120px, 0.35fr) minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 14px;
		padding: 8px 0;
		border-bottom: 1px solid var(--rule);
	}
	.feed-name {
		font-family: var(--serif);
		font-size: 17px;
		color: var(--ink);
		text-decoration: none;
	}
	.feed-name:hover {
		color: var(--accent);
	}
	.feed-subs {
		font-family: var(--serif);
		font-style: italic;
		font-size: 13px;
		color: var(--ink-3);
		overflow-wrap: anywhere;
	}
	.feed-list form {
		margin: 0;
	}
	.feed-list button,
	.feed-form button {
		background: transparent;
		border: none;
		color: var(--ink-3);
		cursor: pointer;
		padding: 0;
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.feed-list button:hover,
	.feed-form button:hover:not(:disabled) {
		color: var(--accent-deep);
	}
	.feed-form {
		margin-top: 18px;
		max-width: 58ch;
	}
	.feed-name-field {
		display: block;
	}
	.feed-name-field span {
		display: block;
		font-family: var(--sans);
		font-size: 9.5px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-3);
		margin-bottom: 6px;
	}
	.feed-name-field input {
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
	.feed-name-field input:focus {
		border-bottom-color: var(--accent);
	}
	.feed-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 14px;
		margin: 14px 0;
	}
	.feed-picker label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--serif);
		font-size: 14px;
		color: var(--ink-2);
	}
	.feed-picker input {
		accent-color: var(--accent);
	}
	.feed-form button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.prose {
		font-family: var(--serif);
		color: var(--ink-2);
		line-height: 1.55;
		font-size: 16px;
		max-width: 64ch;
		margin: 0 0 12px;
	}
	.prose code {
		font-family: var(--mono);
		font-size: 14px;
		background: var(--paper-2);
		padding: 1px 5px;
	}

	.lede code,
	.notice code {
		font-family: var(--mono);
		font-size: 12px;
		background: var(--paper-2);
		padding: 1px 5px;
	}
	.notice {
		font-family: var(--serif);
		color: var(--ink-3);
		font-size: 13px;
		padding: 8px 10px;
		border: 1px dashed var(--rule-strong);
		margin: 0 0 12px;
	}
	.username-form {
		margin-top: 4px;
	}
	.username-form .input-row {
		display: flex;
		align-items: stretch;
		border: 1px solid var(--rule-strong);
		max-width: 360px;
	}
	.username-form .prefix {
		display: inline-flex;
		align-items: center;
		padding: 0 10px;
		background: var(--paper-2);
		border-right: 1px solid var(--rule);
		font-family: var(--mono);
		font-size: 13px;
		color: var(--ink-3);
	}
	.username-form input {
		flex: 1;
		min-width: 0;
		border: none;
		background: var(--paper);
		padding: 7px 10px;
		font-family: var(--mono);
		font-size: 14px;
		color: var(--ink);
		outline: none;
	}
	.username-form .input-row:focus-within {
		border-color: var(--accent);
	}
	.username-form button {
		font-family: var(--sans);
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		background: var(--paper-2);
		border: none;
		border-left: 1px solid var(--rule);
		color: var(--ink-2);
		padding: 0 14px;
		cursor: pointer;
	}
	.username-form button:hover {
		background: var(--ink);
		color: var(--paper);
	}
	.form-error,
	.form-ok {
		font-family: var(--serif);
		font-size: 13px;
		margin: 8px 0 0;
	}
	.form-error {
		color: var(--accent-deep);
	}
	.form-ok {
		color: var(--ink-3);
	}

	@media (max-width: 760px) {
		.settings {
			border-top: none;
			padding: 16px var(--page-pad-x-mobile) 0;
		}
		h1 {
			font-size: 24px;
		}
	}
	@media (max-width: 480px) {
		.sub-list li {
			grid-template-columns: 16px 28px 1fr;
			grid-template-rows: auto auto;
			row-gap: 4px;
			align-items: baseline;
		}
		.actions {
			grid-column: 1 / -1;
			justify-content: flex-end;
			padding-top: 2px;
		}
		.feed-list li {
			grid-template-columns: 1fr auto;
		}
		.feed-subs {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
</style>
