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
	const nested = $derived(more.depth > 0);

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
		margin: 4px 0 4px 26px;
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

	/* Single-element rail+corner for nested placeholders, mirroring the
	   show-replies pill's connector. */
	.more-button.nested::before {
		content: '';
		position: absolute;
		top: -10px;
		left: -18px;
		width: 18px;
		height: 20px;
		border-left: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		border-bottom-left-radius: 14px;
		pointer-events: none;
	}
</style>
