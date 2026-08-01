# Data sources

Everything here was measured against the live API, not taken from documentation.
Timings are from a single desktop connection and are indicative, not a benchmark.

## Open Library — the only source

No key, and `access-control-allow-origin: *` on every endpoint checked. That is
the whole reason this project has no server.

| Endpoint | Used for | Measured |
|---|---|---|
| `/search.json?q=` | search, and everything genre-related | 200, ~2.0 s, 45 071 hits for `dune` |
| `/search.json?author=&sort=rating` | "More by …" recommendations | 200, ~0.4 s |
| `/works/<id>.json` | description, full subject list | 200, ~0.3 s |
| `/trending/{daily,weekly,monthly,yearly}.json` | the Explore feed | 200, ~1.4 s |
| `covers.openlibrary.org/b/id/<id>-{M,L}.jpg` | covers | 200, 10.8 KB / 24 KB |

### A work needs two requests

`works/<id>.json` and `search.json` each know half the record:

| | works.json | search.json |
|---|---|---|
| description | ✅ | ❌ |
| full subject list | ✅ | partial |
| author names | refs only | ✅ |
| page count, ratings | ❌ | ✅ |
| Internet Archive scan id | ❌ | ✅ |

`fetchBook` fires both and merges. `search.json?q=key:/works/<id>` returns
exactly one document, which is how the search half is fetched for a known id.

`cache.prime` merges rather than replaces for the same reason: whichever half
arrives second must not erase the other.

### `description` has two shapes

Sometimes a string, sometimes `{type, value}` — confirmed on `OL893516W`
(string) and `OL27448W` (object). Both are handled in `cleanDescription`.

The text is wiki-flavoured markdown rendered by the app as plain text, so it
arrives with `*emphasis*`, `[label](url)`, reference links `[label][1]` with
their `[1]: url` definitions at the bottom, `----------` rules and a trailing
`([source][1])`. All of it is stripped. One real record —
`[The Lord of the Rings [2/2]](https://…)` — has brackets inside the link label,
which is why the link pattern allows one level of nesting.

### Genre browsing does not use `/subjects/`

`/subjects/<slug>.json` ranks by edition count, so old public-domain works
dominate every genre. Measured, first result:

| Slug | `/subjects/<slug>.json` | `search.json?q=subject:<slug>&sort=rating` |
|---|---|---|
| `fantasy` | Alice's Adventures in Wonderland | Words of Radiance (★4.7) |
| `science_fiction` | Alice's Adventures in Wonderland | The Hitchhiker's Guide (★4.5) |
| `thriller` | Treasure Island | Project Hail Mary (★4.5) |

The same book topping Fantasy *and* Science Fiction is what gives it away. The
app uses the search form; `/subjects/` is not called at all.

### Subjects are not genres

A single work carries `Fiction`, `Fiction in English`, `Accessible book`,
`Protected DAISY`, `Reading Level-Grade 7`, `nyt:series_books=2011-11-05` and
`Translations into Spanish` side by side. `lib/subjects.ts` folds them into a
closed vocabulary for taste matching and filters the cataloguing noise out of
what is displayed. Unmapped values are dropped rather than guessed at — a wrong
genre is worse than a missing one.

### Cyrillic

Works, with thinner coverage:

| Query | Hits |
|---|---|
| `Булгаков` | 583 |
| `Толстой` | 5 167 |
| `Мастер и Маргарита` | 6 |
| `Гарри Поттер` | 13 |

(An earlier run reporting 0 for all of these was a Git Bash encoding artifact,
not an API limitation — `encodeURIComponent` in the browser is fine.)

## Google Books — evaluated, not used

Rejected for now: without a key it answers **HTTP 429** with
`quota_limit_value: "0"` for the shared anonymous project, so it is not a
keyless source. Adding it would mean a key, and therefore a server function to
hold the key — the same shape as FilmTable's TMDB proxy. Worth revisiting only
if Russian-edition coverage becomes the priority.
