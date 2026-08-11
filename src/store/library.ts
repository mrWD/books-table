import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  MAX_SESSIONS_PER_BOOK,
  type BackupFile,
  type BookSummary,
  type ReadingSession,
  type ShelfStatus,
  type TrackedBook,
} from '../lib/types'
import { idbStorage } from '../lib/storage'
import { useBookCache } from './cache'
import { useStats } from './stats'

interface LibraryState {
  books: Record<string, TrackedBook>
  /** UI prefs worth persisting */
  shelfGrid: boolean

  addBook: (book: BookSummary, status: ShelfStatus) => void
  removeBook: (id: string) => void
  setStatus: (id: string, status: ShelfStatus) => void
  /** Absolute position. Everything else — sessions, dates, completion — follows from it. */
  setPage: (id: string, page: number) => void
  advance: (id: string, delta: number) => void
  setPageCount: (id: string, pages: number | null) => void
  setMyRating: (id: string, rating: number | undefined) => void

  setShelfGrid: (grid: boolean) => void
  importBackup: (b: BackupFile) => void
  resetAll: () => void
}

/**
 * Two check-ins ten minutes apart are one sitting, not two. Merging inside this window
 * keeps the session log a record of when someone read rather than of how often they
 * tapped, and keeps it small enough to never threaten the storage ceiling.
 */
const SESSION_MERGE_MS = 2 * 60 * 60 * 1000

function appendSession(sessions: ReadingSession[] | undefined, pages: number): ReadingSession[] {
  const now = Date.now()
  const list = sessions ? [...sessions] : []
  const last = list[list.length - 1]
  if (last && now - last.at < SESSION_MERGE_MS) {
    list[list.length - 1] = { at: now, pages: last.pages + pages }
  } else {
    list.push({ at: now, pages })
  }
  return list.slice(-MAX_SESSIONS_PER_BOOK)
}

export function totalPages(t: TrackedBook, book?: BookSummary | null): number | null {
  return t.pages ?? book?.pages ?? null
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      books: {},
      shelfGrid: false,

      addBook: (book, status) => {
        // The summary is what makes a shelf renderable offline; store it alongside.
        useBookCache.getState().prime(book)
        set((s) => {
          const existing = s.books[book.id]
          if (existing) {
            return { books: { ...s.books, [book.id]: { ...existing, status } } }
          }
          const tracked: TrackedBook = {
            id: book.id,
            addedAt: Date.now(),
            status,
            page: 0,
            pages: book.pages ?? null,
            startedAt: status === 'reading' ? Date.now() : undefined,
            finishedAt: status === 'read' ? Date.now() : undefined,
          }
          return { books: { ...s.books, [book.id]: tracked } }
        })
      },

      removeBook: (id) =>
        set((s) => {
          const books = { ...s.books }
          delete books[id]
          return { books }
        }),

      setStatus: (id, status) => {
        // Side effects stay outside the updater: it must be pure, and StrictMode runs it
        // twice, which would double every counter.
        if (status === 'read') useStats.getState().recordFinished()
        set((s) => {
          const t = s.books[id]
          if (!t) return s
          const next: TrackedBook = { ...t, status }
          if (status === 'reading' && !next.startedAt) next.startedAt = Date.now()
          if (status === 'read') {
            next.finishedAt = t.finishedAt ?? Date.now()
            // Finishing from the shelf still counts the pages: without this the book
            // would contribute nothing to the year's total.
            const total = t.pages ?? null
            if (total && t.page < total) {
              next.sessions = appendSession(t.sessions, total - t.page)
              next.page = total
              next.lastReadAt = Date.now()
            }
          } else {
            next.finishedAt = undefined
          }
          return { books: { ...s.books, [id]: next } }
        })
      },

      setPage: (id, page) => {
        const t = useLibrary.getState().books[id]
        if (!t) return
        const total = t.pages ?? null
        const target = Math.max(0, total ? Math.min(page, total) : page)
        const delta = target - t.page
        if (delta > 0) useStats.getState().recordCheckIn()
        // Reading to the last page is a finish just as much as pressing the button is.
        if (total && target >= total && t.status !== 'read') useStats.getState().recordFinished()
        set((s) => {
          const cur = s.books[id]
          if (!cur) return s
          const next: TrackedBook = { ...cur, page: target }
          if (delta > 0) {
            next.sessions = appendSession(cur.sessions, delta)
            next.lastReadAt = Date.now()
            if (!next.startedAt) next.startedAt = Date.now()
            if (cur.status === 'want' || cur.status === 'dropped') next.status = 'reading'
          }
          if (total && target >= total) {
            next.status = 'read'
            next.finishedAt = cur.finishedAt ?? Date.now()
          } else if (cur.status === 'read' && target < (total ?? Infinity)) {
            // Correcting the position back below the end reopens the book.
            next.status = 'reading'
            next.finishedAt = undefined
          }
          return { books: { ...s.books, [id]: next } }
        })
      },

      advance: (id, delta) => {
        const t = useLibrary.getState().books[id]
        if (!t) return
        useLibrary.getState().setPage(id, t.page + delta)
      },

      setPageCount: (id, pages) =>
        set((s) => {
          const t = s.books[id]
          if (!t) return s
          const clamped = pages && pages > 0 ? Math.round(pages) : null
          return {
            books: {
              ...s.books,
              [id]: { ...t, pages: clamped, page: clamped ? Math.min(t.page, clamped) : t.page },
            },
          }
        }),

      setMyRating: (id, rating) =>
        set((s) => {
          const t = s.books[id]
          if (!t) return s
          return { books: { ...s.books, [id]: { ...t, myRating: rating } } }
        }),

      setShelfGrid: (grid) => set({ shelfGrid: grid }),

      importBackup: (b) => {
        if (b.meta) {
          for (const book of Object.values(b.meta)) useBookCache.getState().prime(book)
        }
        set({ books: b.books ?? {} })
      },

      resetAll: () => set({ books: {} }),
    }),
    {
      name: 'bookstable-library-v1',
      version: 1,
      // IndexedDB via idbStorage: no ~5 MB localStorage ceiling, and the value migrates
      // once from localStorage on first load (see lib/storage.ts). Hydration is async —
      // main.tsx holds the first render until it settles.
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ books: s.books, shelfGrid: s.shelfGrid }),
    },
  ),
)

/**
 * Backups carry the book summaries too.
 *
 * The library stores work ids; a restore on a fresh device would otherwise be a list of
 * bare identifiers that only renders after every one of them has been re-fetched — and
 * not at all offline. Descriptions are dropped: they are the largest field by far and are
 * re-fetched on the detail page anyway.
 */
export function buildBackup(): BackupFile {
  const { books } = useLibrary.getState()
  const entries = useBookCache.getState().entries
  const meta: Record<string, BookSummary> = {}
  for (const id of Object.keys(books)) {
    const cached = entries[id]?.book
    if (cached) {
      const { description: _drop, ...rest } = cached
      meta[id] = rest
    }
  }
  return {
    app: 'bookstable',
    version: 1,
    exportedAt: new Date().toISOString(),
    books,
    meta,
  }
}

export function isValidBackup(data: unknown): data is BackupFile {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Partial<BackupFile>
  return d.app === 'bookstable' && d.version === 1 && typeof d.books === 'object'
}
