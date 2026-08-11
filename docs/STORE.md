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

- **Data collected: none.** The library never leaves the device; there are no
  accounts and no server for user data.
- **Data shared: none.** Catalogue queries go to the sources named in the privacy
  page as a technical necessity, not as data sharing for any purpose of ours.
- **Analytics in the app: none.** The cookieless web analytics run only on the
  website; the component is inert in the native app.
- Google Play Data safety: "No data collected", "No data shared". Apple privacy
  label: "Data Not Collected".

## What only the owner can do

- [ ] Google Play Console account ($25 once) and Apple Developer Program ($99/yr)
- [ ] App signing: Play App Signing on Android; Xcode automatic signing on iOS
- [ ] Screenshots (phone, 2–8 per store; take from the emulator/simulator at
      release quality, both themes)
- [ ] Release builds: `npm run build && npx cap sync`, then Android
      `./gradlew bundleRelease` (.aab) and iOS Archive in Xcode
- [ ] Content rating questionnaire (both stores; the app has no user content)
- Category on Play can also be Education; Books & Reference fits better.
