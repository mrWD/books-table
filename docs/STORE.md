# Store listing

The listing itself lives in two files, and they are the source of truth:

- [`docs/store/app-store.json`](store/app-store.json): App Store Connect. Name, subtitle,
  promotional text, description, keywords, URLs, category, content rights, age rating
  overrides, review notes, and the App Privacy answers as a record (the API cannot set
  those).
- [`docs/store/google-play.json`](store/google-play.json): Google Play. Title, short and full
  description, category, contact, the Data safety answers and the expected content rating.

Their format is `~/Projects/store-release/SCHEMA.md`, and `store-release/asc-release.mjs`
pushes `app-store.json` into App Store Connect. Change a text in the JSON, not here. This
file keeps why the texts say what they say, and what is still to be done by hand.

## Identity

| | |
|---|---|
| App name | BooksTable |
| Bundle / application id | `com.mrwd.bookstable` |
| App Store Apple ID | `6806613998` |
| Category | Books (App Store), Books & Reference (Google Play) |
| Support and marketing URL | <https://mrwd.github.io/products/books-table/> |
| Privacy policy | <https://books-table-six.vercel.app/privacy.html> (answered 200 on 2026-10-30) |
| The app on the web | <https://books-table-six.vercel.app> |
| Support contact | lvigtor@gmail.com |

## What the texts have to stay true to

- The daily anonymous usage counts exist. Both descriptions say what is sent and that
  Profile turns it off, and the review notes name the endpoint. Never write "no analytics",
  "collects nothing", "Data Not Collected" or "nothing leaves the device". The old draft's
  "no tracking" is gone too: it is true in Apple's sense, but next to a daily ping it reads
  as "nothing is sent".
- "No account" and "your library stays on your device" are true and stay.
- Plain, conversational English, with no em dashes and no semicolons in store texts.
- Lengths are checked against the stores' limits (subtitle and title 30, promotional text
  170, Play short description 80, keywords 100, descriptions 4000). The old drafts broke
  the 80-character limit for the Play short description.
- Open Library is credited as in Profile ("a project of the Internet Archive"). The covers
  in the screenshots are public domain and need no credit line.
- The widgets and on-device translation exist only on iOS, so they appear in
  `app-store.json` and not in `google-play.json`.
- **Tip jar.** The iOS app can sell three consumable tips (`TipJarBridge.swift`), and its
  Support section stays empty until App Store Connect has them on sale. The review notes
  say only "no ads and no donation links". If the tips are attached to this version, add
  a line saying where they are (Profile → Support) and that they unlock nothing.

## Age rating

The questionnaire was answered "none" throughout in 2026-08 (4+), on the grounds that the
app has no content of its own. Explore opens on Open Library's Trending this week, and
search shows any book, with covers and blurbs exactly as Open Library has them. Horror
covers and suggestive romance covers turn up without anyone looking for them. So
`app-store.json` declares horror/fear themes and mature/suggestive themes as
**Infrequent**, which makes the app **9+**. Nothing more is declared: it is covers and
text, with no realistic violence or explicit art in view. Google Play: answering the IARC
questionnaire the same way should give **Everyone 10+**.

If this is the wrong call, delete the fields from `ageRating` in `app-store.json` and
`asc-release.mjs` sets them back to none.

## Data safety / privacy questionnaires

The honest answers, same on both stores. They are recorded as `appPrivacy` in
`app-store.json` and `dataSafety` in `google-play.json`.

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

- [ ] Push the listing: `asc-release.mjs` in `~/Projects/store-release` (its README says how).
- [ ] App Store Connect → App Privacy: enter the `appPrivacy` answers by hand. The API
      cannot.
- [ ] Google Play Console: create the app, then fill in Data safety from `dataSafety` and the
      content rating questionnaire (see Age rating above). Upload the `android/` screenshots
      and the feature graphic.
- [ ] Upload key: create the one `mrwd-upload.jks` and the four `MRWD_UPLOAD_*` lines in
      `~/.gradle/gradle.properties` (SCHEMA.md, "Android release signing"). Until then
      `bundleRelease` builds an **unsigned** bundle and Gradle prints a warning saying so.
- [ ] Release builds: `npm run build:native && npx cap sync`, never plain `build`. Then
      Android: `cd android && JAVA_HOME=~/.gradle/jdks/eclipse_adoptium-21-aarch64-os_x.2/jdk-21.0.12.1+1/Contents/Home ./gradlew bundleRelease`
      (Gradle on JDK 24 breaks native tasks), giving
      `android/app/build/outputs/bundle/release/app-release.aab`. Check it with
      `jarsigner -verify`. iOS: an Archive in Xcode, or `scripts/release-ios.sh`.
- `versionCode` must rise with every Play upload. It is 4 now, the same as the iOS build
  number (`CURRENT_PROJECT_VERSION`) of the same commit, and both should move together.

## Store assets in this repo

- `docs/store/screenshots/ios-6.9/` — 1320×2868, the size Apple asks for. Light theme.
- `docs/store/screenshots/ipad-13/` — 2064×2752, iPad 13", required because the app runs
  on iPad (`TARGETED_DEVICE_FAMILY` 1,2). Light theme. At iPad width the app shows its
  wide-screen layout, the phone column centred on a tinted page. That is what the native
  app draws on an iPad, checked against FilmTable in the iPad Pro 13" simulator, whose
  safe-area insets (32/20pt) the script reproduces.
- `docs/store/screenshots/android/` — 1080×2400. Dark theme, on purpose: between the
  two sets a reviewer sees the app in both themes, which is worth more than matching.
- `docs/store/site/` — 414×896 light and dark pairs under the file names the products
  page uses (`reading`, `shelf`, `choice`, `book`, `explore`, `search`, `profile`).
- `docs/store/feature-graphic-1024x500.png` — Play's feature graphic.
- `docs/store/frame/` — the status and gesture bars, lifted from the simulator and
  emulator, that the script lays over the store sets. `ipad-status.png` is the iPad Pro
  13" simulator's (iPadOS 27), with the window title it shows beside the date left out.

Every store image is saved without an alpha channel, which App Store Connect refuses.
`node scripts/store-screenshots.mjs ios-6.9 ipad-13 android` remakes only the store
sets and leaves `site/` (the products page's copies) alone. A run blocks the daily
usage ping and dismisses its notice, so it counts nothing and the notice is not in the
shots.

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
