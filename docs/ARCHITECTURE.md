# Architecture

## Shape

A single-page React app with no server. Everything the person owns lives in
`localStorage`; everything about a book is fetched from Open Library and cached
next to it.

```
src/lib/api.ts          the only network layer — Open Library
src/lib/types.ts        the domain model
src/lib/subjects.ts     raw subjects → a closed genre vocabulary
src/lib/format.ts       dates, durations, pages, reading-time estimates
src/store/library.ts    what the person owns (persisted)
src/store/cache.ts      what the catalogue says about it (persisted)
src/store/selectors.ts  every derived value, as pure functions
src/store/explore.ts    search + discovery state
src/store/recommend.ts  on-device recommendations
src/pages/*             one file per screen
```

`selectors.ts` holds no state and imports no store. Anything that can be derived
from the library plus the cache is derived there, so the buckets, the statistics
and the year review are testable without React.

## Data model

Two stores, deliberately separate:

- **library** — `Record<workId, TrackedBook>`: status, position, page count,
  rating, session log. Small, precious, backed up.
- **cache** — `Record<workId, BookCacheEntry>`: the Open Library record. Large,
  disposable, re-fetchable.

A book is keyed by its Open Library **work** id (`OL676009W`), not an edition.
Editions are per-translation and per-printing; a person tracks the book. The one
thing that genuinely differs between editions — the page count — lives on the
tracked entry and can be corrected on the detail page.

### Status

`want → reading → read`, with `dropped` off to the side. Transitions happen
through `setStatus`, or implicitly through `setPage`:

- advancing past page 0 moves `want`/`dropped` into `reading`;
- reaching the last page moves it to `read` and stamps `finishedAt`;
- correcting the position back below the end reopens the book.

### The session log

Progress is a moving number, so unlike a watched episode it carries no timestamp
of its own. `TrackedBook.sessions` records `{at, pages}` per sitting, which is
what makes "pages read in 2026" and the per-month shape answerable at all.

Two check-ins within two hours merge into one entry, so the log records *when
someone read* rather than *how often they tapped*, and stays small. It is capped
at 1000 entries per book as a backstop against unbounded growth.

Books that predate the log — imported backups, or a book marked read straight
from a search result — fall back to their position or total, which is the best
that can be said about them. `setStatus(id, 'read')` writes the remaining pages
as one session so finishing from the shelf still counts towards the year.

### Backups

`buildBackup()` writes the tracked entries **and** their summaries. The library
alone is a list of bare work ids, which would render as nothing on a fresh device
until every one had been re-fetched — and not at all offline. Descriptions are
dropped from the backup: they are the largest field by far and are re-fetched on
the detail page anyway.

## Reading buckets

`buildReadingItems` splits `status === 'reading'` into three:

| Bucket | Rule |
|---|---|
| `notStarted` | `page === 0` |
| `stale` | untouched for more than 30 days |
| `continue` | everything else |

Sorted by last touched, newest first, inside each bucket.

## Estimates

`MINUTES_PER_PAGE = 1.5` in `format.ts` is the single place a page count becomes
time. There is no honest universal number — it depends on the reader, the
typeface and the book — so it is stated once and every estimate in the app moves
together if it changes.

## Network

`lib/api.ts` is the only module that calls `fetch`. Open Library is slow (~2 s
for search), so:

- the search box debounces at 450 ms;
- anything supplementary is wrapped in `withTimeout` and allowed to lose;
- `refreshBooks` staggers re-fetches by 300 ms;
- the cache TTL is a week — book records barely change.

The service worker caches API responses `NetworkFirst` and covers `CacheFirst`
(a cover never changes for a given id).
