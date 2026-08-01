import type { BookCacheEntry, BookSummary, TrackedBook } from '../lib/types'
import { MINUTES_PER_PAGE, percentOf } from '../lib/format'

/** A book untouched for this long stops being "currently reading" in any honest sense. */
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000

/** Used only where a page count is missing entirely, so estimates stay finite. */
const DEFAULT_PAGES = 300

export function totalOf(tracked: TrackedBook, book?: BookSummary | null): number | null {
  return tracked.pages ?? book?.pages ?? null
}

/**
 * Pages a person actually read of this book.
 *
 * The session log is the truth when it exists. Entries that predate it — imported
 * backups, books marked read straight from a search result — fall back to the position,
 * which is the best that can be said about them.
 */
export function pagesReadOf(tracked: TrackedBook, book?: BookSummary | null): number {
  const sessions = tracked.sessions
  if (sessions && sessions.length > 0) {
    return sessions.reduce((sum, s) => sum + s.pages, 0)
  }
  if (tracked.status === 'read') return totalOf(tracked, book) ?? tracked.page ?? DEFAULT_PAGES
  return tracked.page
}

// ---------- currently reading ----------

export type ReadingBucket = 'continue' | 'notStarted' | 'stale' | 'loading'

export interface ReadingItem {
  book: BookSummary
  tracked: TrackedBook
  bucket: ReadingBucket
  total: number | null
  percent: number
  pagesLeft: number | null
  minutesLeft: number | null
}

export function buildReadingItem(
  tracked: TrackedBook,
  entry: BookCacheEntry | undefined,
  now: Date,
): ReadingItem | null {
  const book = entry?.book
  if (!book) return null

  const total = totalOf(tracked, book)
  const pagesLeft = total ? Math.max(0, total - tracked.page) : null
  const item: ReadingItem = {
    book,
    tracked,
    bucket: 'continue',
    total,
    percent: percentOf(tracked.page, total),
    pagesLeft,
    minutesLeft: pagesLeft === null ? null : Math.round(pagesLeft * MINUTES_PER_PAGE),
  }

  if (entry.fetchedAt === 0 && !book.title) {
    item.bucket = 'loading'
  } else if (tracked.page === 0) {
    item.bucket = 'notStarted'
  } else if (tracked.lastReadAt && now.getTime() - tracked.lastReadAt > STALE_AFTER_MS) {
    item.bucket = 'stale'
  }
  return item
}

export function buildReadingItems(
  books: Record<string, TrackedBook>,
  entries: Record<string, BookCacheEntry>,
  now: Date,
): ReadingItem[] {
  const items: ReadingItem[] = []
  for (const tracked of Object.values(books)) {
    if (tracked.status !== 'reading') continue
    const item = buildReadingItem(tracked, entries[tracked.id], now)
    if (item) items.push(item)
  }
  // Most recently touched first inside each bucket — the book you picked up last night
  // is the one you are most likely to pick up again.
  items.sort(
    (a, b) =>
      (b.tracked.lastReadAt ?? b.tracked.addedAt) - (a.tracked.lastReadAt ?? a.tracked.addedAt),
  )
  return items
}

// ---------- the shelf ----------

export interface ShelfItem {
  book: BookSummary
  tracked: TrackedBook
}

function shelfItems(
  books: Record<string, TrackedBook>,
  entries: Record<string, BookCacheEntry>,
  status: TrackedBook['status'],
): ShelfItem[] {
  const out: ShelfItem[] = []
  for (const tracked of Object.values(books)) {
    if (tracked.status !== status) continue
    const book = entries[tracked.id]?.book
    if (book) out.push({ book, tracked })
  }
  return out
}

export interface Shelf {
  want: ShelfItem[]
  read: ShelfItem[]
  dropped: ShelfItem[]
}

export function buildShelf(
  books: Record<string, TrackedBook>,
  entries: Record<string, BookCacheEntry>,
): Shelf {
  return {
    want: shelfItems(books, entries, 'want').sort((a, b) => b.tracked.addedAt - a.tracked.addedAt),
    read: shelfItems(books, entries, 'read').sort(
      (a, b) => (b.tracked.finishedAt ?? 0) - (a.tracked.finishedAt ?? 0),
    ),
    dropped: shelfItems(books, entries, 'dropped').sort(
      (a, b) => b.tracked.addedAt - a.tracked.addedAt,
    ),
  }
}

// ---------- stats ----------

export interface Stats {
  reading: number
  want: number
  finished: number
  pagesRead: number
  minutes: number
}

export function buildStats(
  books: Record<string, TrackedBook>,
  entries: Record<string, BookCacheEntry>,
): Stats {
  let reading = 0
  let want = 0
  let finished = 0
  let pagesRead = 0
  for (const tracked of Object.values(books)) {
    if (tracked.status === 'reading') reading += 1
    if (tracked.status === 'want') want += 1
    if (tracked.status === 'read') finished += 1
    pagesRead += pagesReadOf(tracked, entries[tracked.id]?.book)
  }
  return { reading, want, finished, pagesRead, minutes: Math.round(pagesRead * MINUTES_PER_PAGE) }
}

// ---------- year in review ----------

/**
 * A year's worth of reading, computed from the library alone.
 *
 * Every session already carries the timestamp it happened at, so this needs no journal
 * and no server. Books finished before the session log existed still count towards the
 * "finished" tally through `finishedAt` — dropping them would understate the year.
 */
export interface YearReview {
  year: number
  pages: number
  minutes: number
  finished: number
  /** Books by pages read in this year, heaviest first. */
  topBooks: { id: string; title: string; pages: number }[]
  /** Twelve counts, January first — enough for a shape, not a chart library. */
  byMonth: number[]
  busiestMonth: number | null
}

export function yearsWithActivity(books: Record<string, TrackedBook>): number[] {
  const years = new Set<number>()
  for (const tracked of Object.values(books)) {
    for (const s of tracked.sessions ?? []) years.add(new Date(s.at).getFullYear())
    if (tracked.finishedAt) years.add(new Date(tracked.finishedAt).getFullYear())
  }
  return [...years].sort((a, b) => b - a)
}

export function buildYearReview(
  books: Record<string, TrackedBook>,
  entries: Record<string, BookCacheEntry>,
  year: number,
): YearReview {
  let pages = 0
  let finished = 0
  const byMonth = new Array(12).fill(0) as number[]
  const perBook: { id: string; title: string; pages: number }[] = []

  for (const tracked of Object.values(books)) {
    const book = entries[tracked.id]?.book
    let inThisBook = 0
    for (const s of tracked.sessions ?? []) {
      const d = new Date(s.at)
      if (d.getFullYear() !== year) continue
      pages += s.pages
      inThisBook += s.pages
      byMonth[d.getMonth()] += s.pages
    }
    if (tracked.finishedAt && new Date(tracked.finishedAt).getFullYear() === year) finished += 1
    if (inThisBook > 0) {
      perBook.push({ id: tracked.id, title: book?.title ?? tracked.id, pages: inThisBook })
    }
  }

  const busiest = byMonth.reduce((best, v, i) => (v > byMonth[best] ? i : best), 0)
  return {
    year,
    pages,
    minutes: Math.round(pages * MINUTES_PER_PAGE),
    finished,
    topBooks: perBook.sort((a, b) => b.pages - a.pages).slice(0, 5),
    byMonth,
    busiestMonth: byMonth[busiest] > 0 ? busiest : null,
  }
}
