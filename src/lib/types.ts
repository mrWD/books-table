/**
 * A book is identified by its Open Library *work* key ("OL893516W"), not an edition.
 * Editions are per-translation and per-printing; a person tracks the book, not the
 * printing they happen to hold. Page count is the one thing that genuinely differs
 * between editions, so it also lives on the tracked entry and can be overridden there.
 */
export interface BookSummary {
  /** Open Library work id without the `/works/` prefix */
  id: string
  title: string
  authors: string[]
  cover?: string | null
  coverLarge?: string | null
  firstPublishYear?: number | null
  /** median across editions — a decent default, never authoritative */
  pages?: number | null
  subjects: string[]
  rating?: number | null
  ratingsCount?: number | null
  languages?: string[]
  description?: string
  editionCount?: number | null
  /** Internet Archive id, when a scan is readable or borrowable */
  iaId?: string | null
}

export interface BookCacheEntry {
  fetchedAt: number
  book: BookSummary
}

export type ShelfStatus = 'reading' | 'want' | 'read' | 'dropped'

/**
 * One reading session: when it happened and how many pages it moved.
 *
 * Progress is a moving number, so unlike a watched episode it carries no timestamp of
 * its own. Without this log "pages read in 2026" would be unanswerable — the current
 * position says nothing about when the reading happened.
 */
export interface ReadingSession {
  at: number
  pages: number
}

/** Nobody logs this many sessions honestly; the cap is there so storage cannot run away. */
export const MAX_SESSIONS_PER_BOOK = 1000

export interface TrackedBook {
  id: string
  addedAt: number
  status: ShelfStatus
  /** current position, 0 when unopened */
  page: number
  /** the edition actually being read, when it differs from the median */
  pages?: number | null
  startedAt?: number
  finishedAt?: number
  lastReadAt?: number
  /** the person's own rating, 1–5; unrelated to Open Library's average */
  myRating?: number
  sessions?: ReadingSession[]
}

/** A search hit before it lands on a shelf */
export type BookResult = BookSummary

export interface BackupFile {
  app: 'bookstable'
  version: 1
  exportedAt: string
  books: Record<string, TrackedBook>
  /** Summaries travel with the backup: without them an import is a list of bare ids. */
  meta?: Record<string, BookSummary>
}
