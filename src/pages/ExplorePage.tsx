import { useEffect, useRef } from 'react'
import { useExplore } from '../store/explore'
import type { SearchScope } from '../lib/api'
import type { BookSummary } from '../lib/types'
import { BookFeedCard, BookResultRow, AddBookButton } from '../components/cards'
import { Poster, SkeletonRows } from '../components/ui'
import { useRecommend } from '../store/recommend'
import { BROWSE_SUBJECTS } from '../lib/subjects'
import { IconSearch, IconX } from '../components/Icons'
import { Link } from 'react-router-dom'

const STRIP_COLORS = ['strip-beige', 'strip-blue', 'strip-pink', 'strip-green']

const SCOPE_LABEL: Record<SearchScope, string> = {
  all: 'ALL',
  title: 'TITLE',
  author: 'AUTHOR',
}

export default function ExplorePage() {
  const {
    query,
    scope,
    setScope,
    setQuery,
    runSearch,
    results,
    searching,
    searchError,
    trending,
    subject,
    subjectBooks,
    subjectLoading,
    discoverLoading,
    loadDiscover,
    selectSubject,
  } = useExplore()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadDiscover()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onInput = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Open Library search takes about two seconds, so a short debounce would queue
    // requests faster than they return.
    debounceRef.current = setTimeout(() => {
      void runSearch(value, useExplore.getState().scope)
    }, 450)
  }

  const hasQuery = query.trim().length > 0

  return (
    <div className="page">
      <div className="searchwrap">
        <div className="searchbar">
          <IconSearch size={20} strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search books and authors"
            onChange={(e) => onInput(e.target.value)}
            autoCorrect="off"
            autoCapitalize="off"
          />
          {hasQuery && (
            <button
              className="searchclear"
              aria-label="Clear search"
              onClick={() => {
                setQuery('')
                void runSearch('', scope)
                inputRef.current?.focus()
              }}
            >
              <IconX size={16} strokeWidth={2.4} />
            </button>
          )}
        </div>
        <div className="chips">
          {(['all', 'title', 'author'] as SearchScope[]).map((s) => (
            <button
              key={s}
              className={`chip${scope === s ? ' active' : ''}`}
              onClick={() => setScope(s)}
            >
              {SCOPE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {hasQuery ? (
        <div className="results">
          {searching && <SkeletonRows count={4} />}
          {!searching && searchError && (
            <p className="hint">Search failed. Check your connection and try again.</p>
          )}
          {!searching && !searchError && (
            <>
              {results.map((b) => (
                <BookResultRow key={b.id} book={b} />
              ))}
              {results.length === 0 && <p className="hint">Nothing found for “{query.trim()}”.</p>}
            </>
          )}
        </div>
      ) : (
        <Discover
          trending={trending}
          loading={discoverLoading}
          subject={subject}
          subjectBooks={subjectBooks}
          subjectLoading={subjectLoading}
          onSubject={(s) => void selectSubject(s)}
        />
      )}
    </div>
  )
}

function ForYou() {
  const { items, loading, error, taste, load } = useRecommend()

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Nothing on the shelves yet — the discovery sections below are the better answer.
  if (!loading && items.length === 0 && (taste?.seedCount ?? 0) === 0) return null

  const basis = [...(taste?.topAuthors ?? []), ...(taste?.topSubjects ?? [])].slice(0, 3)

  return (
    <section>
      <div className="h2-row">
        <h2 className="h2">For you</h2>
        {taste && taste.seedCount > 0 && (
          <button className="textbtn" onClick={() => void load({ force: true })} disabled={loading}>
            Refresh
          </button>
        )}
      </div>
      {taste && basis.length > 0 && (
        <p className="chips-hint">
          Based on {taste.seedCount} book{taste.seedCount === 1 ? '' : 's'} on your shelves ·{' '}
          {basis.join(', ')}
        </p>
      )}
      {loading && items.length === 0 && <SkeletonRows count={3} />}
      {error && items.length === 0 && (
        <p className="hint">Could not build recommendations right now.</p>
      )}
      {items.map((r) => (
        <BookResultRow key={r.book.id} book={r.book} reason={r.reason} />
      ))}
    </section>
  )
}

function Discover({
  trending,
  loading,
  subject,
  subjectBooks,
  subjectLoading,
  onSubject,
}: {
  trending: BookSummary[]
  loading: boolean
  subject: string
  subjectBooks: BookSummary[]
  subjectLoading: boolean
  onSubject: (s: (typeof BROWSE_SUBJECTS)[number]) => void
}) {
  return (
    <>
      <ForYou />

      <h2 className="h2">Trending this week</h2>
      {trending.length === 0 && loading && <SkeletonRows count={2} />}
      {trending.slice(0, 4).map((b, i) => (
        <BookFeedCard key={b.id} book={b} tint={STRIP_COLORS[i % STRIP_COLORS.length]} />
      ))}
      {trending.length === 0 && !loading && (
        <p className="hint">Could not load what is trending. Try again later.</p>
      )}

      <h2 className="h2">By genre</h2>
      <div className="chips scroll">
        {BROWSE_SUBJECTS.map((s) => (
          <button
            key={s}
            className={`chip${subject === s ? ' active' : ''}`}
            onClick={() => onSubject(s)}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      {subjectLoading && subjectBooks.length === 0 && <SkeletonRows count={2} />}
      <div className="grid3">
        {subjectBooks.map((b) => (
          <Link key={b.id} to={`/book/${b.id}`} state={{ book: b }} className="gridcard">
            <div className="gridcard-imgwrap">
              <Poster src={b.cover} alt={b.title} className="gridcard-poster" />
              <div className="gridcard-add">
                <AddBookButton book={b} />
              </div>
            </div>
            <div className="gridcard-name">{b.title}</div>
          </Link>
        ))}
      </div>
      {!subjectLoading && subjectBooks.length === 0 && (
        <p className="hint">Nothing came back for {subject}.</p>
      )}

      {trending.length > 4 && (
        <>
          <h2 className="h2">More of what people are reading</h2>
          <div className="grid3">
            {trending.slice(4, 16).map((b) => (
              <Link key={b.id} to={`/book/${b.id}`} state={{ book: b }} className="gridcard">
                <div className="gridcard-imgwrap">
                  <Poster src={b.cover} alt={b.title} className="gridcard-poster" />
                  <div className="gridcard-add">
                    <AddBookButton book={b} />
                  </div>
                </div>
                <div className="gridcard-name">{b.title}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      <p className="attribution">
        Book data from{' '}
        <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
          Open Library
        </a>{' '}
        · covers from the Internet Archive
      </p>
    </>
  )
}
