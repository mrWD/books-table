import { create } from 'zustand'
import type { BookSummary } from '../lib/types'
import { booksBySubject, searchBooks, trendingBooks, type SearchScope } from '../lib/api'
import { BROWSE_SUBJECTS, type Subject } from '../lib/subjects'
import { stats } from './stats'

interface ExploreState {
  query: string
  scope: SearchScope
  results: BookSummary[]
  searching: boolean
  searchError: boolean

  trending: BookSummary[]
  subject: Subject
  subjectBooks: BookSummary[]
  subjectLoading: boolean
  discoverLoading: boolean

  setScope: (s: SearchScope) => void
  setQuery: (q: string) => void
  runSearch: (q: string, scope: SearchScope) => Promise<void>
  loadDiscover: () => Promise<void>
  selectSubject: (s: Subject) => Promise<void>
}

let searchSeq = 0
let subjectSeq = 0
/** `discoverLoading` starts true, so the in-flight guard cannot lean on it. */
let started = false

export const useExplore = create<ExploreState>((set, get) => ({
  query: '',
  scope: 'all',
  results: [],
  searching: false,
  searchError: false,

  trending: [],
  subject: BROWSE_SUBJECTS[0],
  subjectBooks: [],
  // Both start true: Explore always loads discovery on mount, and starting at false
  // renders "nothing found" for the frame before the first request goes out.
  subjectLoading: true,
  discoverLoading: true,

  setScope: (scope) => {
    set({ scope })
    const q = get().query.trim()
    if (q) void get().runSearch(q, scope)
  },

  setQuery: (query) => set({ query }),

  runSearch: async (q, scope) => {
    const seq = ++searchSeq
    const term = q.trim()
    if (!term) {
      set({ results: [], searching: false, searchError: false })
      return
    }
    set({ searching: true, searchError: false })
    stats.search()
    try {
      const results = await searchBooks(term, scope)
      if (seq === searchSeq) set({ results, searching: false })
    } catch (err) {
      console.warn('search failed', err)
      if (seq === searchSeq) set({ searching: false, searchError: true })
    }
  },

  loadDiscover: async () => {
    if (get().trending.length > 0 || started) return
    started = true
    set({ discoverLoading: true })
    try {
      const trending = await trendingBooks('weekly', 18)
      set({ trending: trending.filter((b) => b.cover) })
    } catch (err) {
      console.warn('trending failed', err)
    } finally {
      set({ discoverLoading: false })
    }
    void get().selectSubject(get().subject)
  },

  selectSubject: async (subject) => {
    const seq = ++subjectSeq
    set({ subject, subjectLoading: true })
    try {
      const books = await booksBySubject(subject, 12)
      if (seq === subjectSeq) set({ subjectBooks: books, subjectLoading: false })
    } catch (err) {
      console.warn('subject failed', subject, err)
      if (seq === subjectSeq) set({ subjectBooks: [], subjectLoading: false })
    }
  },
}))
