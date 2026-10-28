# Store listing — working draft

Everything an app-store form asks for, prepared once. The texts are drafts in the
app's own voice; edit freely, but keep the claims true.

## Identity

| | |
|---|---|
| App name | BooksTable |
| Bundle / application id | `com.mrwd.bookstable` |
| Category (App Store) | Books |
| Category (Google Play) | Books & Reference |
| Website | <https://books-table-six.vercel.app> |
| Privacy policy | <https://books-table-six.vercel.app/privacy.html> |
| Support contact | lvigtor@gmail.com |

## Subtitle / short description

> Track reading, page by page

Play "short description" (80 chars max):

> A local-first reading tracker. One tap logs the pages. No account, no sync, works offline.

## Full description

BooksTable keeps track of what you read — page by page, with one tap.

• A +10 quick advance from the card, exact page entry when you want it
• Reading, to-read, finished and paused shelves with counts
• Sessions merge into sittings, so stats mean something: pages this year, reading time
• A gentle reading reminder after three quiet days — scheduled on your device
• No account, no sign-up, no tracking; the app works offline
• Your library exports to a single JSON file, and imports back

Book data comes from Open Library.

## Data safety / privacy questionnaires

The honest answers, same on both stores:

- **Data collected: anonymous usage counts, nothing about the person.** The library never
  leaves the device; there are no accounts and no server for user data. Once a day the
  app sends counts of screens and features used and of error kinds, with version,
  platform, language and date (`src/lib/metrics.ts`; the contract is
  app-metrics/docs/CLIENT.md). No identifiers, titles, search text or anything typed. On
  by default, off in Profile; off also deletes the unsent counts.
- **Data shared: none.** Catalogue queries go to the sources named in the privacy
  page as a technical necessity, not as data sharing for any purpose of ours.
- **Analytics in the app: the daily counts above, nothing else.** The cookieless Vercel
  web analytics run only on the website; that component is inert in the native app.
- Apple privacy label (App Store Connect → App Privacy): **Usage Data → Product
  Interaction** and **Diagnostics → Other Diagnostic Data**, each with purpose
  *Analytics*, **not linked to the user**, **not used for tracking**. Everything else:
  not collected.
- Google Play Data safety: data collected — **App activity → App interactions** and
  **App info and performance → Diagnostics**, purpose *Analytics*; not shared; encrypted
  in transit; optional (users can turn it off). "No data shared".

## What only the owner can do

- [ ] Google Play Console account ($25 once) and Apple Developer Program ($99/yr)
- [ ] App signing: Play App Signing on Android; Xcode automatic signing on iOS
- [ ] Screenshots (phone, 2–8 per store; take from the emulator/simulator at
      release quality, both themes)
- [ ] Release builds: `npm run build && npx cap sync`, then Android
      `./gradlew bundleRelease` (.aab) and iOS Archive in Xcode
- [ ] Content rating questionnaire (both stores; the app has no user content)
- Category on Play can also be Education; Books & Reference fits better.

## Store assets in this repo

- `docs/store/screenshots/ios-6.9/` — 1320×2868, the size Apple asks for. Light theme.
- `docs/store/screenshots/android/` — 1080×2400. Dark theme, on purpose: between the
  two sets a reviewer sees the app in both themes, which is worth more than matching.
- `docs/store/site/` — 414×896 light and dark pairs under the file names the products
  page uses (`reading`, `shelf`, `choice`, `book`, `explore`, `search`, `profile`).
- `docs/store/feature-graphic-1024x500.png` — Play's feature graphic.
- `docs/store/frame/` — the status and gesture bars, lifted from the simulator and
  emulator, that the script lays over the store sets.

`node scripts/store-screenshots.mjs` makes all of them, and `docs/readme/books-table.png`
(the header says what it needs). They are taken from a library of **real** titles
fetched from the app's own sources, not mocked up, and seeded through the app's own
search and store calls. Anyone regenerating them should keep that rule and one more,
learned the hard way: the seed has to store exactly what the app itself would store.
Trimming an author list or writing a raw upstream date straight through produces a
screenshot that advertises behaviour the app does not have. The reading history is
dated by running each store call with the clock moved back to its day, so "a month
ago" on A Tale of Two Cities is the app's own arithmetic.

**No publisher covers (2026-10-18).** The first set showed Dune, Project Hail Mary, The
Way of Kings, The Hobbit and Thinking, Fast and Slow — cover art that belongs to the
publishers and their artists, in an ad for an app. A public-domain text is not enough on
its own: a modern edition's cover is still that edition's art, and for most classics it
is what Open Library shows (Frankenstein, Moby-Dick, The Time Machine, Dracula and
Treasure Island came back with modern covers, Pride and Prejudice with an undated Nelson
Doubleday binding). Now:

- every book in the seed is one whose Open Library cover was looked at and is a scan of
  a period edition: Jane Eyre (Harper & Brothers, 1848), A Tale of Two Cities (the
  monthly part, Chapman and Hall, 1859, Phiz), Alice's Adventures in Wonderland
  (Macmillan, Tenniel's roundel), Adventures of Huckleberry Finn (Charles L. Webster,
  1886), The Adventures of Sherlock Holmes (George Newnes, 1892), Emma and Sense and
  Sensibility (Macmillan, 1896, Hugh Thomson), The Hound of the Baskervilles (George
  Newnes, 1902, Alfred Garth Jones, d. 1955 — life plus seventy ran out in January
  2026), The Scarlet Letter (J. R. Osgood, 1878)
  and Frankenstein (the 1818 title page, as its own Open Library work). The search for
  Lewis Carroll adds four more, checked the same way. No credit line is needed — these
  are public domain;
- the seed stops if a search result no longer carries the cover that was checked, and
  everything not on `CLEAN_ART` — For you, the rest of a search — is **blurred** inside
  its own box where it is drawn;
- Anne of Green Gables was left out: its 1908 cover is public domain in the US, but the
  artists' dates could not be confirmed for countries that count life plus seventy;
- a title only joins `CLEAN_ART` after its image has been looked at and its date checked.
- The donation button is gone from the shots, as it is from the native app.
