import { useEffect } from 'react'
import { useLibrary } from '../store/library'
import { refreshBooks, useBookCache } from '../store/cache'
import { buildReadingItems } from '../store/selectors'
import { ReadingCard, ReadingGridCard } from '../components/cards'
import { EmptyState, SectionPill, SkeletonRows, useNow } from '../components/ui'
import { IconBook, IconGrid, IconList } from '../components/Icons'

const SECTION_LABEL: Record<string, string> = {
  continue: 'CONTINUE',
  notStarted: 'NOT STARTED',
  stale: 'BEEN A WHILE',
}

export default function ReadingPage() {
  const books = useLibrary((s) => s.books)
  const entries = useBookCache((s) => s.entries)
  const shelfGrid = useLibrary((s) => s.shelfGrid)
  const setShelfGrid = useLibrary((s) => s.setShelfGrid)
  const now = useNow()

  const readingIds = Object.values(books)
    .filter((t) => t.status === 'reading')
    .map((t) => t.id)

  useEffect(() => {
    void refreshBooks(readingIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingIds.join(',')])

  if (readingIds.length === 0) {
    return (
      <div className="page">
        <h1 className="pagetitle">Reading</h1>
        <EmptyState
          icon={<IconBook size={44} strokeWidth={1.4} />}
          title="Nothing open right now"
          text="Find a book, tap + to shelve it, then START — it lands here and you log pages with one tap."
          actionLabel="Find a book"
          actionTo="/explore"
        />
      </div>
    )
  }

  const items = buildReadingItems(books, entries, now)
  const loading = readingIds.length - items.length

  return (
    <div className="page">
      <h1 className="pagetitle">Reading</h1>
      <div className="listtools">
        <span />
        <button
          className="iconbtn"
          aria-label="Toggle layout"
          onClick={() => setShelfGrid(!shelfGrid)}
        >
          {shelfGrid ? <IconList size={22} /> : <IconGrid size={22} />}
        </button>
      </div>
      {(['continue', 'notStarted', 'stale'] as const).map((bucket) => {
        const list = items.filter((i) => i.bucket === bucket)
        if (list.length === 0) return null
        return (
          <section key={bucket}>
            <SectionPill>{SECTION_LABEL[bucket]}</SectionPill>
            {shelfGrid ? (
              <div className="grid3">
                {list.map((i) => (
                  <ReadingGridCard key={i.book.id} item={i} />
                ))}
              </div>
            ) : (
              list.map((i) => <ReadingCard key={i.book.id} item={i} now={now} />)
            )}
          </section>
        )
      })}
      {loading > 0 && <SkeletonRows count={Math.min(loading, 3)} />}
    </div>
  )
}
