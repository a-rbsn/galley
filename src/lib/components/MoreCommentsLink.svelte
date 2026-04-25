<script lang="ts">
	import type { CommentView, MoreCommentsView } from '$lib/types';

	let {
		more,
		sub,
		postId,
		onLoad
	}: {
		more: MoreCommentsView;
		sub: string;
		postId: string;
		onLoad: (replacement: Array<CommentView | MoreCommentsView>) => void;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	const cleanParentId = $derived(more.parentId.replace(/^t[1-9]_/, ''));

	async function load() {
		if (loading) return;
		loading = true;
		error = null;
		try {
			const url = `/api/expand?sub=${encodeURIComponent(sub)}&post=${encodeURIComponent(postId)}&parent=${encodeURIComponent(cleanParentId)}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as {
				replies?: Array<CommentView | MoreCommentsView>;
				error?: string;
			};
			if (data.error) throw new Error(data.error);
			onLoad(data.replies ?? []);
		} catch (e) {
			error = e instanceof Error ? e.message : 'failed to load';
			loading = false;
		}
	}
</script>

{#if loading}
	<p class="more loading"><em>Loading {more.count} {more.count === 1 ? 'reply' : 'replies'}…</em></p>
{:else if error}
	<p class="more error">
		<em>Couldn't load: {error}</em>
		<button type="button" onclick={load}>Retry</button>
	</p>
{:else}
	<p class="more">
		<button type="button" onclick={load}>
			Load {more.count > 0 ? `${more.count} more ${more.count === 1 ? 'reply' : 'replies'}` : 'thread continuation'} ↓
		</button>
	</p>
{/if}

<style>
	.more {
		margin: 6px 0;
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.06em;
	}
	button {
		background: transparent;
		border: none;
		color: var(--accent);
		font-family: inherit;
		font-size: inherit;
		letter-spacing: inherit;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	button:hover {
		color: var(--accent-deep);
	}
	.loading {
		color: var(--ink-3);
	}
	.error {
		color: var(--accent-deep);
	}
	.error button {
		margin-left: 8px;
	}
</style>
