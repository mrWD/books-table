# BooksTable — project context

This file is read automatically at the start of every session. It holds what
cannot be derived from the code: why a given decision was made and which pitfalls
have already been hit.

Details live in `docs/`:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data model, progress rules, flows
- [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md) — Open Library's quirks, measured

## What this is

A personal reading tracker. A PWA: one codebase runs on Android, iPhone and the
web, installs to the home screen and works offline.

It is a fork of **FilmTable** (`mrWD/film-table`) — same stack, same principles,
same visual language. Shows became books in progress, movies became the shelf,
and the one-tap episode check-in became a one-tap page advance.

## Core principles (break only with the owner's explicit consent)

1. **No backend at all.** The library lives on the device: IndexedDB in a
   browser, a JSON file in private app storage when running natively, and
   localStorage for small prefs. Both moves happened in 2026-08 with the owner's
   consent and use the same one-way copy — read the old store once, write the
   new one, leave the old value frozen so a rollback still finds the library.
   The adapter is `createDeviceStorage` in `tables-core`, wired up in
   `lib/storage.ts` and `lib/native.ts`. No accounts, no sync, nothing personal
   collected. Unlike FilmTable there is not
   even a proxy: Open Library needs no key. The single exception is
   `src/components/Analytics.tsx`: on a `.vercel.app` host it reports cookieless
   screen-view counts to Vercel Web Analytics — a screen name, never a title, a
   search term or an identifier.
2. **The app must work without keys.** If a second source is ever added, it must
   not become a dependency — the keyless path has to keep working.
3. **Its own visual identity.** Inherited from FilmTable, which was deliberately
   steered away from TV Time. Do not reintroduce their section headings, yellow
   accent, or episode-style codes.
4. **Verify against the live API before claiming anything.** Every number in
   `docs/DATA-SOURCES.md` came from an actual request. Add to it the same way.

## How to run

```bash
npm install
npm run dev                       # :5173
npm run build && npm run preview  # :4173
```

`node scripts/gen-icons.mjs` regenerates the PNG icons from `public/favicon.svg`.

## How to verify

There are no automated tests. Verification is manual, through the browser panel
at mobile width (375px), and it is a mandatory part of any noticeable change.
Worth running:

- search in all three scopes (ALL / TITLE / AUTHOR) for `dune`, `Булгаков`,
  `atomic habits` — the first two caught real bugs in the source layer;
- the whole entry path, which is what people got lost in: Explore → `+` → the
  toast's START READING must switch to the Reading tab; Library → TO READ → START
  must open the two-option sheet, and choosing "I'm reading it now" must switch to
  Reading with the counts updated;
- the old addresses `/#/reading` and `/#/shelf` must still land somewhere sensible;
- add a book, start it, tap `+10` from the card and `+25` from the detail page,
  then Undo;
- the four Library tabs at 375px — the three named ones must keep their counts
  on one line, and the fourth is an icon;
- set an exact page past the end — it must finish the book, and correcting it
  back below the end must reopen it;
- the genre strip on Explore (the results must not be all public-domain
  classics — if they are, someone switched it back to `/subjects/`);
- the hidden `/#/insights` page (usage counters, not linked from navigation);
- both themes and **horizontal overflow**
  (`document.documentElement.scrollWidth` against `clientWidth` — must be 0;
  this already caught a CSS Grid bug in FilmTable);
- a clean console.

## Decisions worth knowing

- **Work ids, not editions.** A person tracks the book, not the printing. The
  page count is the only thing that genuinely differs, so it is overridable per
  entry.
- **The session log exists because progress is a moving number.** Without
  `{at, pages}` entries, "pages read this year" would be unanswerable. Sittings
  merge within two hours.
- **`MINUTES_PER_PAGE = 1.5`** is an assumption stated once in `format.ts`, not a
  fact. Every time estimate in the app derives from it.
- **Quick advance is `+10`, and the button says so.** A book has no discrete
  "next episode", so a one-tap control has to state how far it moves you.
- **One library screen, four tabs.** Reading and the shelf were separate screens
  and the bottom navigation had an entry for each, which put the same list in two
  places; a book that changed status left one of them without saying which. The
  tabs are `reading / to-read / finished / stopped`, addressable as
  `/#/library/<tab>` so a status change can switch to the tab the book landed on.
- **The fourth tab is an icon.** Books put down unfinished are a real pile but not
  worth a quarter of a 375px tab bar, so it is a glyph plus its count.
- **A status change that moves a book between tabs must switch to it.** Every
  silent version failed the same way in review: the book vanished from the list in
  front of you and you had to guess where it went. START asks what happened rather
  than assuming, then moves you.
- **The tabs carry counts.** Until the tab said how big each pile was, finding a
  book meant opening all of them.
- **Genre browsing uses search, not `/subjects/`.** See DATA-SOURCES — the
  subjects endpoint returns the same classics for every genre.
- **Google Books is not used.** Keyless it returns HTTP 429 with a zero quota, so
  it would require a key and therefore a server.
- **`scripts/gen-icons.mjs` uses `fileURLToPath`.** `URL.pathname` yields
  `/C:/…` on Windows and sharp cannot open it; the inherited version was
  macOS-only.

## Open questions

- The UI is in English, matching FilmTable. Localisation was not requested.
- Book *series* are not modelled. Open Library's series data is inconsistent, so
  a cycle like Dune is currently four independent entries.
- Reading goals (books or pages per year) are not implemented.
- Production is **<https://books-table-six.vercel.app/>** — the Vercel project
  `books-table`, rebuilt on every push to `main` (Vite preset, no environment
  variables: setting `BASE_PATH` there would push the assets into a subpath and
  serve a blank page). The suffix exists because `books-table.vercel.app` is
  taken by an unrelated app; renaming under Settings → Domains means updating
  this line, `README.md` and the card in `mrWD/mrWD.github.io`.
  <https://mrwd.github.io/books-table/> stays as a mirror on the same push, via
  `.github/workflows/deploy.yml`, so PWAs already installed from it keep working.
  Note that the two addresses are separate origins and therefore separate
  `localStorage` — a library does not follow you across, the backup file does.
- Vercel enabled Web Analytics on the project by itself, unlike its neighbours:
  `/_vercel/insights/script.js` answers 200 and the app posts a view per screen.
  On `games-table` the same path answered 404 until the component was ported
  there.

## Tone with the owner

Reply in Russian. He values verified facts over assumptions: before claiming
anything about an API's behaviour, make the request and show the numbers. Do
large changes in a separate branch and let him review before merging.
