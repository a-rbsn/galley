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
		| { status: 'loading' }
		| { status: 'ok'; comments: Array<CommentView | MoreCommentsView> }
		| { status: 'error'; message: string };

	let result = $state<Result>({ status: 'loading' });
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

	// Fetch comments on the client after the page itself has loaded. Keeping
	// this off the server response means the navigation stream closes once the
	// post is rendered, so back-navigation is not held open by an in-flight
	// streamed Promise.
	$effect(() => {
		const { sub, id } = data;
		untrack(() => markSeen(id));
		result = { status: 'loading' };
		abortComments();
		const ctrl = new AbortController();
		commentsController = ctrl;
		(async () => {
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
			}
		})();
		return () => {
			if (commentsController === ctrl) commentsController = null;
			ctrl.abort();
		};
	});
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

	{#if result.status === 'loading'}
		<p class="loading"><em>Loading comments…</em></p>
	{:else if result.status === 'ok'}
		<CommentsList initial={result.comments} sub={data.sub} postId={data.id} />
	{:else}
		<p class="error"><em>{result.message}</em></p>
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
	@media (max-width: 760px) {
		.comments {
			padding-left: var(--page-pad-x-mobile);
			padding-right: var(--page-pad-x-mobile);
		}
	}
</style>
