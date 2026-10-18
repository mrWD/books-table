/**
 * Regenerates the store screenshots in docs/store/screenshots/.
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/store-screenshots.mjs
 *
 * It starts its own Vite dev server, seeds a library through the app's own modules — the
 * same search and store calls a person's taps would make, so the seed holds exactly what
 * the app would store (see docs/STORE.md) — and photographs each screen at the size each
 * store asks for: iPhone 6.9" at 1320×2868 in the light theme, Android phone at 1080×2400
 * in the dark one — plus docs/store/site/, the 414×896 light and dark pairs the products
 * page shows, and docs/readme/books-table.png. `?from=app` hides the donation button the
 * way the native build does. The status and gesture bars in docs/store/frame/ are
 * composited on top; the safe-area insets are emulated so the layout leaves room for them
 * as it does on the phone.
 *
 * The books are chosen so the covers can be shown. A public-domain text is not enough —
 * a modern edition's cover is its publisher's art — so each one here is a work whose
 * cover on Open Library was looked at and is a scan of a 19th- or early-20th-century
 * edition: Jane Eyre (Harper & Brothers, 1848), A Tale of Two Cities (the monthly part,
 * Chapman and Hall, 1859), Alice's Adventures in Wonderland (Macmillan, Tenniel's
 * roundel), Adventures of Huckleberry Finn (Charles L. Webster, 1886), The Adventures of
 * Sherlock Holmes (George Newnes, 1892), Emma and Sense and Sensibility (Macmillan, 1896,
 * Hugh Thomson), The Hound of the Baskervilles (George Newnes, 1902, Alfred Garth Jones,
 * d. 1955), The Scarlet Letter (J. R. Osgood, 1878) and Frankenstein (the 1818 title page).
 * The search result has to carry that exact cover, or the seed stops; any image not on
 * CLEAN_ART is blurred where it is drawn, so a catalogue that swaps an image later cannot
 * put unchecked art into a store listing.
 *
 * Reading history needs dates, and the store takes them from Date.now(), so each step runs
 * with Date.now() moved back by its `day` — the store calls are the same ones a tap makes,
 * made on the day it would have been made.
 *
 * Needs the network: Open Library is called directly, as the app does.
 */
import { spawn } from 'node:child_process'
import { copyFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright')
const sharp = require('sharp')

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs', 'store')
const FRAME = join(ROOT, 'docs', 'store', 'frame')
const PORT = Number(process.env.PORT ?? 5193)
const BASE = `http://localhost:${PORT}`

/**
 * Open Library work ids, the search that finds each, the cover that was checked for it,
 * and what the seed does with it: `[daysAgo, action, value]`, in order.
 */
const BOOKS = [
  {
    id: 'OL262454W', query: 'the hound of the baskervilles', cover: 8063264,
    steps: [[9, 'add', 'reading'], [7, 'page', 60], [4, 'page', 104], [1, 'page', 130]],
  },
  {
    id: 'OL53908W', query: 'adventures of huckleberry finn', cover: 8157718,
    steps: [[14, 'add', 'reading'], [12, 'page', 40], [3, 'page', 74]],
  },
  { id: 'OL66513W', query: 'emma jane austen', cover: 9278312, steps: [[2, 'add', 'reading']] },
  {
    id: 'OL8193465W', query: 'a tale of two cities', cover: 13301713,
    steps: [[60, 'add', 'reading'], [52, 'page', 110], [41, 'page', 190]],
  },
  { id: 'OL1095427W', query: 'jane eyre', cover: 8235363, steps: [[6, 'add', 'want']] },
  { id: 'OL138052W', query: "alice's adventures in wonderland", cover: 10527843, steps: [[20, 'add', 'want']] },
  { id: 'OL66562W', query: 'sense and sensibility', cover: 9278292, steps: [[45, 'add', 'want']] },
  {
    id: 'OL25595002W', query: 'frankenstein', cover: 7267770,
    steps: [[40, 'add', 'reading'], [38, 'page', 130], [21, 'finish'], [21, 'rate', 5]],
  },
  {
    id: 'OL455305W', query: 'the scarlet letter', cover: 5654516,
    steps: [[70, 'add', 'reading'], [66, 'page', 120], [60, 'finish'], [60, 'rate', 4]],
  },
  {
    id: 'OL262421W', query: 'the adventures of sherlock holmes', cover: 6717853,
    steps: [[100, 'add', 'reading'], [95, 'page', 150], [88, 'finish'], [88, 'rate', 5]],
  },
]
/**
 * Covers the search for Lewis Carroll shows besides the seed's Alice, checked the same
 * way: the 1901 Hurst binding, Through the Looking-Glass (Macmillan, 1872), Alice in
 * Wonderland in Five Acts (Barta Press, 1897, under a library's shelf label) and The
 * Hunting of the Snark (Macmillan, 1876, Henry Holiday).
 */
const SEEN_ART = [8595966, 11272464, 13805873, 8243028]

const coverUrl = (id, size) => `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`
const CLEAN_ART = [...BOOKS.map((b) => b.cover), ...SEEN_ART].flatMap((id) => [coverUrl(id, 'M'), coverUrl(id, 'L')])

/**
 * The blur for every unchecked image. A CSS blur() spreads past the image into the card
 * text beside it; this one is cut to the image's own box (the filter region), and its
 * edges are made opaque again so the box does not fade out at the sides. The image's own
 * corner radius is put back in `shoot`.
 */
const BLUR_FILTER = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute">
  <filter id="store-blur" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
    <feGaussianBlur stdDeviation="14" edgeMode="duplicate"/>
    <feComponentTransfer><feFuncA type="table" tableValues="1 1"/></feComponentTransfer>
  </filter>
</svg>`

const PLACEHOLDER = 'Search books and authors'

/** The store screens: the reading list, a book, the profile, a search. */
const STORE_SHOTS = [
  { name: '01-library', hash: '#/library/reading' },
  { name: '02-book', hash: `#/book/${BOOKS[0].id}` },
  { name: '03-profile', hash: '#/profile' },
  { name: '04-explore', hash: '#/explore', act: (page) => search(page, 'lewis carroll', 'AUTHOR') },
]

/** The products page's screens, under the file names it already uses. */
const SITE_SHOTS = [
  { name: 'reading', hash: '#/library/reading' },
  { name: 'shelf', hash: '#/library/to-read' },
  {
    name: 'choice',
    hash: '#/library/to-read',
    act: (page) => page.locator('.startbtn').first().click(),
    after: (page) => page.getByRole('button', { name: 'Cancel' }).click(),
  },
  { name: 'book', hash: `#/book/${BOOKS[0].id}` },
  { name: 'explore', hash: '#/explore' },
  { name: 'search', hash: '#/explore', act: (page) => search(page, 'lewis carroll', 'AUTHOR') },
  { name: 'profile', hash: '#/profile' },
]

const SETS = [
  // 62/34pt are the iPhone 16 Pro Max insets; the bars come from the simulator.
  { dir: 'screenshots/ios-6.9', width: 440, height: 956, scheme: 'light', insets: { top: 62, bottom: 34 }, status: 'ios-status.png', shots: STORE_SHOTS },
  { dir: 'screenshots/android', width: 360, height: 800, scheme: 'dark', insets: { top: 24, bottom: 24 }, status: 'android-status.png', nav: 'android-nav.png', shots: STORE_SHOTS },
  { dir: 'site', width: 414, height: 896, scale: 1, scheme: 'light', suffix: '-light', shots: SITE_SHOTS },
  { dir: 'site', width: 414, height: 896, scale: 1, scheme: 'dark', suffix: '-dark', shots: SITE_SHOTS },
]

async function search(page, text, scope) {
  await page.getByPlaceholder(PLACEHOLDER).fill(text)
  if (scope) await page.locator('.chip', { hasText: new RegExp(`^${scope}$`) }).click()
  // Past the input's debounce, then whatever the search set off.
  await page.waitForTimeout(1500)
}

async function seed(page, books) {
  return page.evaluate(async (books) => {
    const api = await import('/src/lib/api.ts')
    const { useLibrary } = await import('/src/store/library.ts')
    const realNow = Date.now
    const DAY = 24 * 60 * 60 * 1000
    const found = {}
    for (const b of books) {
      const book = (await api.searchBooks(b.query)).find((x) => x.id === b.id)
      if (!book) throw new Error(`search for ${b.query} did not return ${b.id}`)
      const expected = `https://covers.openlibrary.org/b/id/${b.cover}-M.jpg`
      if (book.cover !== expected) {
        throw new Error(`${b.id} now has cover ${book.cover}, not the checked ${expected}; look at it first`)
      }
      found[b.id] = book
    }
    // Every step, oldest first, so the sittings land in the order they would have.
    const steps = books
      .flatMap((b) => b.steps.map(([day, action, value], i) => ({ id: b.id, day, action, value, i })))
      .sort((x, y) => y.day - x.day || x.i - y.i)
    try {
      for (const { id, day, action, value } of steps) {
        const at = realNow() - day * DAY
        Date.now = () => at
        const lib = useLibrary.getState()
        if (action === 'add') lib.addBook(found[id], value)
        else if (action === 'page') lib.setPage(id, value)
        else if (action === 'finish') lib.setStatus(id, 'read')
        else if (action === 'rate') lib.setMyRating(id, value)
      }
    } finally {
      Date.now = realNow
    }
  }, books)
}

/**
 * Resolves once no request has been in flight for `quietMs`. Playwright's own
 * 'networkidle' is a load state: after a hash change it has long been reached and
 * returns at once, before the new screen has asked for anything.
 */
function trackNetwork(page) {
  let inflight = 0
  let lastChange = Date.now()
  const bump = (d) => {
    inflight += d
    lastChange = Date.now()
  }
  page.on('request', () => bump(1))
  page.on('requestfinished', () => bump(-1))
  page.on('requestfailed', () => bump(-1))
  return async (quietMs = 1000, maxMs = 120_000) => {
    const until = Date.now() + maxMs
    while (Date.now() < until && (inflight > 0 || Date.now() - lastChange < quietMs)) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }
}

async function shoot(page, set, { name, hash, act, after }) {
  await page.evaluate((h) => (window.location.hash = h), hash)
  await page.settle()
  if (act) {
    await act(page)
    await page.settle()
  }
  // Recommendations and search fill in after the network settles; skeletons mean not yet.
  const started = Date.now()
  const settled = await page
    .waitForFunction(() => !document.querySelector('.skel'), null, { timeout: 180_000 })
    .then(() => true, () => false)
  if (!settled || Date.now() - started > 5000) {
    console.log(`${name}: ${settled ? 'settled' : 'still loading'} after ${Math.round((Date.now() - started) / 1000)}s`)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  // Only what is on screen: lazy images further down never load, by design.
  await page.waitForFunction(() =>
    [...document.images]
      .filter((i) => i.getBoundingClientRect().top < window.innerHeight)
      .every((i) => i.complete),
  )
  // The filter fills its box corner to corner; clip it back to the image's rounding.
  await page.evaluate(() => {
    for (const img of document.images) img.style.clipPath = `inset(0 round ${getComputedStyle(img).borderRadius})`
  })
  await page.waitForTimeout(600)
  const shot = await page.screenshot({ type: 'png' })
  if (after) await after(page)

  const file = join(OUT, set.dir, `${name}${set.suffix ?? ''}.png`)
  if (!set.status) {
    await sharp(shot).png().toFile(file)
    console.log(file)
    return
  }
  const layers = []
  const bar = sharp(join(FRAME, set.status))
  // The bars were lifted as black glyphs; the dark theme wants them white.
  layers.push({ input: await (set.scheme === 'dark' ? bar.negate({ alpha: false }) : bar).toBuffer(), top: 0, left: 0 })
  if (set.nav) {
    const nav = sharp(join(FRAME, set.nav))
    const { height } = await nav.metadata()
    layers.push({
      input: await (set.scheme === 'dark' ? nav.negate({ alpha: false }) : nav).toBuffer(),
      top: set.height * 3 - height,
      left: 0,
    })
  }
  await sharp(shot).composite(layers).png().toFile(file)
  console.log(file)
}

async function main() {
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' })
  await new Promise((resolve, reject) => {
    vite.stdout.on('data', (d) => String(d).includes('Local:') && resolve())
    vite.on('exit', (code) => reject(new Error(`vite exited ${code}`)))
  })

  const browser = await chromium.launch()
  try {
    for (const set of SETS) {
      const context = await browser.newContext({
        viewport: { width: set.width, height: set.height },
        deviceScaleFactor: set.scale ?? 3,
        isMobile: true,
        hasTouch: true,
        colorScheme: set.scheme,
      })
      const page = await context.newPage()
      page.settle = trackNetwork(page)
      if (set.insets) {
        const cdp = await context.newCDPSession(page)
        await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 0, right: 0, ...set.insets } })
      }
      await page.goto(`${BASE}/?from=app#/`)
      await page.settle()
      await seed(page, BOOKS)
      await page.evaluate((svg) => document.body.insertAdjacentHTML('beforeend', svg), BLUR_FILTER)
      await page.addStyleTag({
        content:
          'img { filter: url(#store-blur) saturate(1.2); }\n' +
          CLEAN_ART.map((src) => `img[src="${src}"]`).join(',\n') +
          ' { filter: none; }',
      })

      for (const shot of set.shots) await shoot(page, set, shot)
      await context.close()
    }
    // The README shows the reading list, as the products page does.
    await copyFile(join(OUT, 'site', 'reading-light.png'), join(ROOT, 'docs', 'readme', 'books-table.png'))
  } finally {
    await browser.close()
    vite.kill()
  }
}

await main()
