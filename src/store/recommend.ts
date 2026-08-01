import { create } from 'zustand'
import type { BookSummary } from '../lib/types'
import { booksByAuthor, booksBySubject, withTimeout } from '../lib/api'
import { canonicalSubjects, type Subject } from '../lib/subjects'
import { useBookCache } from './cache'
import { useLibrary } from './library'
import { useStats } from './stats'

/**
 * Recommendations are computed on the device from the library the person already has.
 * No profile is sent anywhere and nothing is asked of a server that could build one.
 *
 * Two signals carry it: the authors they finished (a strong, obvious signal) and the
 * subjects those books share (a weaker one that widens the net). Anything already on a
 * shelf is excluded — being told to read what you are reading is the fastest way to
 * make a recommendation list look broken.
 */

export interface Recommendation {
  book: BookSummary
  reason: string
}

export interface Taste {
  seedCount: number
  topSubjects: Subject[]
  topAuthors: string[]
}

interface RecommendState {
  items: Recommendation[]
  taste: Taste | null
  loading: boolean
  error: boolean
  loadedAt: number
  load: (opts?: { force?: boolean }) => Promise<void>
}

const TTL_MS = 6 * 60 * 60 * 1000

/** A finished book says more about taste than one just added to a wish list. */
const WEIGHT = { read: 3, reading: 2, want: 1, dropped: 0 } as const

function buildTaste(): Taste {
  const entries = useBookCache.getState().entries
  const books = useLibrary.getState().books
  const subjectScore = new Map<Subject, number>()
  const authorScore = new Map<string, number>()
  let seedCount = 0

  for (const tracked of Object.values(books)) {
    const weight = WEIGHT[tracked.status]
    if (weight === 0) continue
    const book = entries[tracked.id]?.book
    if (!book) continue
    seedCount += 1
    for (const s of canonicalSubjects(book.subjects)) {
      subjectScore.set(s, (subjectScore.get(s) ?? 0) + weight)
    }
    for (const a of book.authors) {
      authorScore.set(a, (authorScore.get(a) ?? 0) + weight)
    }
  }

  const rank = <T>(m: Map<T, number>, n: number): T[] =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)

  return {
    seedCount,
    topSubjects: rank(subjectScore, 3),
    topAuthors: rank(authorScore, 2),
  }
}

export const useRecommend = create<RecommendState>((set, get) => ({
  items: [],
  taste: null,
  loading: false,
  error: false,
  loadedAt: 0,

  load: async (opts = {}) => {
    const state = get()
    if (state.loading) return
    if (!opts.force && state.items.length > 0 && Date.now() - state.loadedAt < TTL_MS) return

    const taste = buildTaste()
    set({ taste, loading: true, error: false })

    if (taste.topAuthors.length === 0 && taste.topSubjects.length === 0) {
      set({ items: [], loading: false, loadedAt: Date.now() })
      return
    }

    try {
      const byAuthor = await Promise.all(
        taste.topAuthors.map((author) =>
          withTimeout(booksByAuthor(author, 8), 6000, [] as BookSummary[]).then((books) =>
            books.map((book) => ({ book, reason: `More by ${author}` })),
          ),
        ),
      )
      const bySubject = await Promise.all(
        taste.topSubjects.map((subject) =>
          withTimeout(booksBySubject(subject, 8), 6000, [] as BookSummary[]).then((books) =>
            books.map((book) => ({ book, reason: `More in ${subject}` })),
          ),
        ),
      )

      const owned = new Set(Object.keys(useLibrary.getState().books))
      const seen = new Set<string>()
      const items: Recommendation[] = []
      // Interleave author and subject picks so the list is not three books by one writer
      // followed by nothing else.
      const lanes = [...byAuthor, ...bySubject]
      for (let i = 0; items.length < 12; i++) {
        let progressed = false
        for (const lane of lanes) {
          const candidate = lane[i]
          if (!candidate) continue
          progressed = true
          const { id } = candidate.book
          if (!id || owned.has(id) || seen.has(id)) continue
          seen.add(id)
          items.push(candidate)
          if (items.length >= 12) break
        }
        if (!progressed) break
      }

      useStats.getState().recordRecommendations(items.length)
      set({ items, loading: false, loadedAt: Date.now() })
    } catch (err) {
      console.warn('recommendations failed', err)
      set({ loading: false, error: true })
    }
  },
}))
