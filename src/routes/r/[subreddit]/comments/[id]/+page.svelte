<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import Thread from '$lib/components/Thread.svelte';
	import CommentsList from '$lib/components/CommentsList.svelte';
	import { markSeen } from '$lib/stores/seen.svelte';
	import type { CommentView, MoreCommentsView } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Result =
		| { status: 'idle' }
		| { status: 'loading' }
		| { status: 'ok'; comments: Array<CommentView | MoreCommentsView> }
		| { status: 'error'; message: string };

	let result = $state<Result>({ status: 'idle' });
	let commentsController: AbortController | null = null;

	function abortComments() {
		commentsController?.abort();
		commentsController = null;
	}

	beforeNavigate(() => {
		abortComments();
	});

	onMount(() => {
		const onPageHide = () => abortComments();
		window.addEventListener('pagehide', onPageHide);
		return () => {
			window.removeEventListener('pagehide', onPageHide);
			abortComments();
		};
	});

	$effect(() => {
		const id = data.id;
		untrack(() => {
			markSeen(id);
			abortComments();
			result = { status: 'idle' };
		});
	});

	async function loadComments() {
		const { sub, id } = data;
		result = { status: 'loading' };
		abortComments();
		const ctrl = new AbortController();
		commentsController = ctrl;
		try {
			const res = await fetch(`/api/comments/${sub}/${id}`, {
				signal: ctrl.signal
			});
			const body = (await res.json()) as
				| { ok: true; comments: Array<CommentView | MoreCommentsView> }
				| { ok: false; error: string };
			if (ctrl.signal.aborted) return;
			if (body.ok) {
				result = { status: 'ok', comments: body.comments };
			} else {
				result = { status: 'error', message: body.error };
			}
		} catch (e) {
			if (e instanceof Error && e.name === 'AbortError') return;
			const message = e instanceof Error ? e.message : 'Failed to load comments';
			result = { status: 'error', message };
		} finally {
			if (commentsController === ctrl) commentsController = null;
		}
	}
</script>

<svelte:head>
	<title>Galley — {data.post.title.slice(0, 80)}</title>
</svelte:head>

<Thread post={data.post} />

<section class="comments" aria-label="Comments">
	<h2 class="comments-heading">
		{data.post.numComments.toLocaleString('en-GB')} comment{data.post.numComments === 1
			? ''
			: 's'}
	</h2>

	{#if result.status === 'idle'}
		<button type="button" class="load-comments" onclick={loadComments}>
			Load comments
		</button>
	{:else if result.status === 'loading'}
		<p class="loading"><em>Loading comments…</em></p>
	{:else if result.status === 'ok'}
		<CommentsList initial={result.comments} sub={data.sub} postId={data.id} />
	{:else}
		<p class="error"><em>{result.message}</em></p>
		<button type="button" class="load-comments retry" onclick={loadComments}>
			Retry comments
		</button>
	{/if}
</section>

<style>
	.comments {
		margin-top: 24px;
	}
	.comments-heading {
		font-family: var(--sans);
		font-size: 9.5px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-4);
		font-weight: 500;
		margin: 0 0 4px;
		padding-bottom: 6px;
	}
	.loading,
	.error {
		font-family: var(--serif);
		color: var(--ink-3);
		padding: 18px 0;
	}
	.error {
		color: var(--accent-deep);
	}
	.load-comments {
		margin: 14px 0 4px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--ink-3);
		padding: 0 0 2px;
		font-family: var(--sans);
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-2);
		cursor: pointer;
	}
	.load-comments:hover {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}
	.load-comments.retry {
		margin-top: 0;
	}
	@media (max-width: 760px) {
		.comments {
			padding-left: var(--page-pad-x-mobile);
			padding-right: var(--page-pad-x-mobile);
		}
	}
</style>
