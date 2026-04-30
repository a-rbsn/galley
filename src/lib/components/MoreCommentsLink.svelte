<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { onDestroy } from 'svelte';
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
	let loadController: AbortController | null = null;

	function abortLoad() {
		loadController?.abort();
		loadController = null;
	}

	beforeNavigate(() => {
		abortLoad();
	});

	onDestroy(() => {
		abortLoad();
	});

	const nested = $derived(more.depth > 0);

	async function load() {
		if (loading) return;
		loading = true;
		error = null;
		const ctrl = new AbortController();
		loadController = ctrl;
		try {
			const params = new URLSearchParams({
				sub,
				post: postId,
				parent: more.parentId
			});
			// Top-level "more" placeholders sit under the post (parent_id = t3_…),
			// which Reddit's branch endpoint can't expand — we hit /api/morechildren
			// instead, which needs the explicit child list.
			if (more.parentId.startsWith('t3_') && more.children.length > 0) {
				params.set('children', more.children.join(','));
			}
			const res = await fetch(`/api/expand?${params}`, {
				signal: ctrl.signal
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as {
				replies?: Array<CommentView | MoreCommentsView>;
				error?: string;
			};
			if (data.error) throw new Error(data.error);
			onLoad(data.replies ?? []);
		} catch (e) {
			if (e instanceof Error && e.name === 'AbortError') return;
			error = e instanceof Error ? e.message : 'failed to load';
		} finally {
			if (loadController === ctrl) loadController = null;
			loading = false;
		}
	}

	const label = $derived.by(() => {
		if (loading) return 'loading…';
		if (error) return 'retry';
		if (more.count <= 0) return 'continue thread';
		return `load ${more.count} more ${more.count === 1 ? 'reply' : 'replies'}`;
	});
</script>

<button
	type="button"
	class="more-button"
	class:nested
	class:loading
	class:error={!!error}
	disabled={loading}
	onclick={load}
	title={error ?? undefined}
>
	{label}
</button>

<style>
	.more-button {
		position: relative;
		display: block;
		margin: 4px 0;
		padding: 2px 10px;
		background: var(--paper);
		border: 1px solid var(--rule);
		border-radius: 999px;
		font-family: var(--sans);
		font-size: 9.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-3);
		cursor: pointer;
	}
	.more-button:hover:not(:disabled) {
		border-color: var(--ink-3);
		color: var(--ink);
	}
	.more-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.more-button.error {
		border-color: var(--accent-deep);
		color: var(--accent-deep);
	}
</style>
