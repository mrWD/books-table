# BooksTable

**→ [mrwd.github.io/books-table](https://mrwd.github.io/books-table/)**

A personal reading tracker. It runs on **Android, iPhone and the web** from a
single codebase (a PWA), **with no backend for your data**: the library is stored
on the device and book metadata comes from Open Library.

Built on the same skeleton as [FilmTable](https://github.com/mrWD/film-table) —
same stack, same local-first principles, a different domain.

## Features

- **Library** — one screen, four tabs carrying their counts: Reading, To read,
  Finished, and an icon tab for books put down unfinished. Reading splits into
  Continue, Not Started and Been a While; a card shows the position
  (`p. 124 / 504`), the percentage and a one-tap `+10` advance with Undo, plus a
  list/grid toggle.
- **Book page** — progress with quick `+10 / +25 / +50` steps or an exact page,
  a page count you can correct for your own edition, your own 1–5 rating, and
  Start reading / Give up / Read again / Remove.
- **START asks, then moves you** — on a To read row it opens a two-option sheet
  ("I'm reading it now" / "I've already read it") and switches to the tab the book
  landed on, instead of leaving you to find where it went.
- **"For you" recommendations** — built on the device from what is on your
  shelves: the authors you finished and the subjects those books share. Finished
  books weigh more than a wish-list entry, anything already in the library is
  excluded, and every card states why it was suggested.
- **Explore** — search scoped to **ALL / TITLE / AUTHOR**, what is trending this
  week, and a genre strip.
- **Profile** — pages, reading time, a year in review with a per-month shape,
  shelves by status, **JSON backup export/import** and a full reset.
- **Theme** — light and dark, following the device by default; Profile →
  Appearance can pin either one. Applied before the first paint, so there is no
  flash of a light background at startup.
- **PWA** — installs to the home screen and works offline (service worker).

## Data

| Source | What | Key |
|---|---|---|
| [Open Library](https://openlibrary.org/developers/api) | search, works, covers, trending, subjects | not required |

One source covers everything, which is why this project has no server at all.
Measured against the live API while building:

- Every endpoint sends `access-control-allow-origin: *`, so the browser talks to
  it directly — no proxy, no key, nothing to keep secret.
- Search takes about **2 s**. That is why the search box debounces at 450 ms and
  why supplementary calls are wrapped in a timeout.
- Cyrillic queries work (`Булгаков` → 583 results), though coverage of Russian
  editions is thinner than English.
- **Genre browsing goes through `search.json?q=subject:X&sort=rating`, not
  `/subjects/<slug>.json`.** The subjects endpoint ranks by edition count, which
  makes the same public-domain classics top every genre — *Alice's Adventures in
  Wonderland* was the first result for both Fantasy and Science Fiction. Ranking
  the search index by rating returns what a reader would recognise as the genre.
- Google Books was evaluated as a second source and rejected for now: without a
  key it answers **HTTP 429** with `quota_limit_value: "0"`, so it would need a
  key and therefore a server.

User data lives only in the device's `localStorage` (`bookstable-library-v1` /
`bookstable-cache-v1`). There is no sync between devices — move your library via
Profile → Export/Import.

## Running locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

`npm run preview` serves the build on <http://localhost:4173>, and
`node scripts/gen-icons.mjs` regenerates the PNG icons from `public/favicon.svg`.

## Deployment

Static files only — routing is hash-based, so no SPA fallback is needed and the
build ports to any host. `.github/workflows/deploy.yml` publishes to GitHub Pages
on a push to `main`, with the subpath injected via `BASE_PATH`.

## Layout

```
src/lib/        types, the Open Library client, subject vocabulary, formatting
src/store/      zustand: library and cache (persist), explore, recommend, theme, ui
                selectors.ts — all derived logic as pure functions
src/components/ icons, UI primitives, cards
src/pages/      Library / Explore / BookDetail / Profile / Insights
```

## Documentation

| File | What it covers |
|---|---|
| [CLAUDE.md](CLAUDE.md) | project context, principles, how to verify |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | data model, progress rules, flows |
| [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md) | Open Library's quirks, confirmed by measurement |

## Licence

MIT. Book data from Open Library, a project of the Internet Archive.
