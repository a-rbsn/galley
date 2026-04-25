<footer class="colophon">
	<div><em>Galley</em></div>
	<div>
		© {new Date().getFullYear()} · <a href="/settings">Settings</a>
	</div>
</footer>

<style>
	.colophon {
		margin: 60px auto 0;
		max-width: var(--col-feed);
		padding: 20px var(--page-pad-x) 40px;
		border-top: 1px solid var(--ink);
		font-family: var(--sans);
		font-size: 10.5px;
		letter-spacing: 0.06em;
		color: var(--ink-3);
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.colophon em {
		font-family: var(--serif);
		font-style: italic;
		font-size: 12px;
		color: var(--ink-2);
		letter-spacing: 0;
	}
	.colophon a {
		color: inherit;
		text-decoration: none;
	}
	.colophon a:hover {
		color: var(--accent);
	}

	@media (max-width: 760px) {
		.colophon {
			padding: 20px var(--page-pad-x-mobile) 28px;
		}
	}
</style>
