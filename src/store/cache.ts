import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { BookCacheEntry, BookSummary } from '../lib/types'
import { fetchBook } from '../lib/api'
import { idbStorage } from '../lib/idb-storage'

/**
 * Book records barely change, so the cache is what makes the shelves work offline and
 * without a request per card. A week is long enough to matter and short enough that a
 * newly rated book eventually shows its rating.
 */
const TTL_MS = 7 * 24 * 60 * 60 * 1000

interface CacheState {
  entries: Record<string, BookCacheEntry>
  prime: (book: BookSummary) => void
  put: (entry: BookCacheEntry) => void
}

export const useBookCache = create<CacheState>()(
  persist(
    (set) => ({
      entries: {},

      /**
       * Store what a search result already knows so a card renders immediately.
       * Merges rather than replaces: search hits carry ratings and page counts that a
       * work fetch does not, and the work fetch carries the description that search
       * does not. Whichever arrives second must not erase the other.
       */
      prime: (book) =>
        set((s) => {
          const prev = s.entries[book.id]
          if (!prev) {
            return { entries: { ...s.entries, [book.id]: { fetchedAt: 0, book } } }
          }
          const merged: BookSummary = {
            ...prev.book,
            ...book,
            description: book.description || prev.book.description,
            pages: book.pages ?? prev.book.pages,
            rating: book.rating ?? prev.book.rating,
            iaId: book.iaId ?? prev.book.iaId,
            subjects: book.subjects.length > 0 ? book.subjects : prev.book.subjects,
          }
          return { entries: { ...s.entries, [book.id]: { ...prev, book: merged } } }
        }),

      put: (entry) => set((s) => ({ entries: { ...s.entries, [entry.book.id]: entry } })),
    }),
    {
      name: 'bookstable-cache-v1',
      version: 1,
      // Book summaries for every tracked book — the other blob that outgrew localStorage.
      storage: createJSONStorage(() => idbStorage),
    },
  ),
)

const inflight = new Set<string>()

export async function ensureBook(id: string, opts: { force?: boolean } = {}): Promise<void> {
  if (!id) return
  const entry = useBookCache.getState().entries[id]
  const fresh = entry && Date.now() - entry.fetchedAt < TTL_MS
  if (fresh && !opts.force) return
  if (inflight.has(id)) return
  inflight.add(id)
  try {
    const book = await fetchBook(id)
    if (book) useBookCache.getState().put({ fetchedAt: Date.now(), book })
  } catch (err) {
    console.warn('ensureBook failed', id, err)
  } finally {
    inflight.delete(id)
  }
}

/** Refresh stale entries, staggered — Open Library search takes about two seconds. */
export async function refreshBooks(ids: string[]): Promise<void> {
  for (const id of ids) {
    const entry = useBookCache.getState().entries[id]
    if (entry && Date.now() - entry.fetchedAt < TTL_MS) continue
    await ensureBook(id)
    await new Promise((r) => setTimeout(r, 300))
  }
}
