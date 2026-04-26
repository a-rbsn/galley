# Galley

Galley is a personal, non-commercial web client for reading Reddit.

It is a [SvelteKit](https://kit.svelte.dev) application that renders
Reddit through a custom typographic interface — feeds, subreddits,
threads — using Reddit's public JSON endpoints.

The visual direction is contemporary editorial. Newspaper-influenced
typography, hairline rules in place of cards, a serif for headlines and
body text, a restrained sans for metadata.

<p align="center">
  <img src="screenshots/desktop.png" width="640" alt="Galley on desktop — front-page feed" />
  &nbsp;
  <img src="screenshots/mobile.png" width="220" alt="Galley on mobile — front-page feed" />
</p>

## Status

Early. The interface design is settled and lives as static mocks under
`mock/`. The SvelteKit application is being built out from those mocks.
Expect rough edges and missing views.

## Architecture

Galley reads Reddit through its public JSON endpoints rather than the
authenticated Data API. Every Reddit URL works as a JSON endpoint by
appending `.json` — for example, `https://www.reddit.com/r/typography.json`
returns the same listing data the website renders from. There is no
OAuth flow, no client ID, no API approval process, no per-user account.

Galley fetches those endpoints server-side from its SvelteKit
`+page.server.ts` load functions, applies a short in-memory cache so
that repeated views of the same page do not produce repeated upstream
requests, and renders the result through Galley's own components and
styles. Nothing is mirrored to a database. Nothing is republished.

This is a deliberate constraint, not a stopgap. The goal is a small,
legible, read-only client. What the public endpoints expose is enough
to read Reddit; the rest of the API surface is not needed.

## What Galley does not do

Galley is read-only by design. It does not:

- authenticate users (there is no sign-in)
- vote, comment, save, submit, post, or send messages
- scrape HTML pages — only the documented `.json` endpoints
- aggregate, store, mirror, or republish Reddit content
- use Reddit content to train machine-learning models
- run any automated, background, or scheduled requests
- carry advertising, analytics, or tracking of any kind

Every request to Reddit originates from a person looking at a page in
their browser.

## Subreddit list

There is no logged-in account, so Galley does not pull a *subscribed*
list from Reddit. Instead, each instance of Galley keeps its own list
of subreddits the reader has chosen to follow, configured through the
settings page and stored in the browser's local storage.

This is the substance of Galley as a reader: a small, curated set of
subreddits, edited by hand, displayed as one merged feed and as
individual subreddit pages. There is no recommendation system, no
algorithmic ranking beyond Reddit's own (*hot*, *new*, *top*), and no
inferred interest. The reader decides what they read.

## Why not Devvit

Devvit is Reddit's first-party platform for building apps that run
inside reddit.com. It is the right tool for extending Reddit's own
product — moderation utilities, subreddit-scoped widgets, embedded
experiences. It is not the right tool for Galley.

Galley is, by intention, an independent reading interface. Its visual
direction is editorial typography; its layout is asymmetric and
rule-driven; its constraints (read-only, no aggregation, no mirroring)
are easier to demonstrate when the application is hosted at a separate
origin from Reddit and runs on a stack the project controls end-to-end.
The public JSON endpoints provide everything Galley needs to read
Reddit; running on Devvit would constrain that without expanding what
the project does.

## Self-hosting

Galley is designed to be run as a personal instance. The recommended
way is Docker — a prebuilt image is published to GitHub Container
Registry on every release.

### Quick start (docker compose)

```yaml
# docker-compose.yml
services:
  galley:
    image: ghcr.io/a-rbsn/galley:latest
    container_name: galley
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
```

```
docker compose up -d
```

Then open <http://localhost:3000>. On first launch the app shows a
short setup screen that asks for your Reddit username — Reddit's API
rules require each client to send a descriptive `User-Agent`, and
storing your username per-instance keeps your traffic in its own
rate-limit bucket instead of sharing one with every other self-hoster.
The `./data` volume persists that config along with the on-disk
response cache.

### One-shot docker run

```
docker run -d \
  --name galley \
  -p 3000:3000 \
  -v $(pwd)/data:/data \
  --restart unless-stopped \
  ghcr.io/a-rbsn/galley:latest
```

### Environment variables

All optional. The setup screen handles everything for a normal
install.

| Variable                | Default                | Purpose                                                                                           |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `REDDIT_USER_AGENT`     | _(unset)_              | Pin the User-Agent string instead of letting the setup screen build one. Skips the setup screen.  |
| `GALLEY_CONFIG_PATH`    | `/data/config.json`    | Where to store the configured Reddit username. Set to `none` to disable persistence.              |
| `GALLEY_CACHE_PATH`     | `/data/cache.json`     | Where to store the on-disk Reddit response cache. Set to `none` to disable persistence.           |
| `GALLEY_CACHE_DISABLE`  | _(unset)_              | Set to `1` to disable cache persistence entirely.                                                 |
| `HOST` / `PORT`         | `0.0.0.0` / `3000`     | Standard adapter-node knobs.                                                                      |

## Local development

Requirements:

- Node.js 20 or newer
- [pnpm](https://pnpm.io)

```
pnpm install
pnpm dev
```

The app runs at <http://localhost:5173>. On first visit it shows the
setup screen (Reddit username + a starter set of subreddits); from
then on the home page is the merged feed of those subreddits.

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
