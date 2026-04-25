# Galley

Galley is a personal, non-commercial web client for reading Reddit.

It is a [SvelteKit](https://kit.svelte.dev) application that signs each
user in through Reddit's OAuth 2.0 authorisation code flow and renders
that user's own Reddit account — front page, subscribed subreddits,
threads, profile, saved history — through a custom interface focused on
legibility and information density.

The visual direction is contemporary editorial. Newspaper-influenced
typography, hairline rules in place of cards, a serif for headlines and
body text, a restrained sans for metadata.

## Status

Early. The interface design is settled and lives as static mocks under
`mock/`. The SvelteKit application is being built out from those mocks.
Expect rough edges and missing views.

## How it works

Galley is a thin client.

A user signs in with their own Reddit account. The application receives
an OAuth access token scoped to that user, and every request to the
Reddit API is made on that user's behalf in direct response to
something they did in the interface — opening a thread, scrolling a
feed, voting, saving a post.

Nothing is fetched in the background. Nothing is scraped. No Reddit
content is retained on the server beyond the lifetime of a session.
There is no shared cache of Reddit data across users.

## Scope and intent

Galley is non-commercial and free to use. It operates within Reddit's
free API tier and is intended to remain inside it. In particular:

- No advertising, paid tiers, or monetisation of any kind.
- No data aggregation, resale, or analytics built on Reddit content.
- No use of Reddit content to train machine-learning models.
- No automation, scraping, or scheduled fetching. Every request to the
  Reddit API originates from an authenticated user action in the UI.
- One user, one session, one access token. Galley does not act on
  behalf of users who are not currently present.

The project exists so that its author can read Reddit in a layout he
prefers. Others are welcome to run their own copy.

## Stack

- SvelteKit (TypeScript)
- Reddit OAuth 2.0, authorisation code flow
- Reddit's public JSON API

## Running locally

A Reddit application is required. Register one at
<https://www.reddit.com/prefs/apps> as a *web app*, and note its client
ID, client secret, and redirect URI.

Configuration is read from environment variables. A template will be
provided as `.env.example` once the application scaffold lands; for
now, the relevant values are:

```
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REDIRECT_URI=http://localhost:5173/auth/callback
REDDIT_USER_AGENT=galley/0.1 (by /u/your-username)
```

The `User-Agent` follows Reddit's recommended format and identifies the
client and its maintainer on every request.

Standard SvelteKit commands apply once the project is initialised:

```
npm install
npm run dev
```

## Licence

Galley is licensed under the [GNU Affero General Public License,
version 3](https://www.gnu.org/licenses/agpl-3.0.html). See
[`LICENSE`](LICENSE) for the full text.

The AGPL is a strong copyleft licence. In short: you are free to use,
study, modify, and redistribute Galley, including running modified
versions on a public server. If you do, you must make the corresponding
source available to the users of that server under the same licence.
The intent is that Galley, and anything built from it, remains free
software for everyone who interacts with it.

## Contact

Issues and pull requests are welcome via this repository.
