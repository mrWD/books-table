import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLibrary } from '../store/library'
import { refreshBooks, useBookCache } from '../store/cache'
import { buildReadingItems, buildShelf, type ShelfItem } from '../store/selectors'
import { FinishedRow, ReadingCard, ReadingGridCard, ShelfRow } from '../components/cards'
import { EmptyState, SectionPill, SkeletonRows, TopTabs, useNow, type Tab } from '../components/ui'
import { IconBook, IconGrid, IconList, IconPaused, IconShelf } from '../components/Icons'

/**
 * The whole library on one screen, one tab per status.
 *
 * Reading and the shelf used to be separate screens, which meant every status change
 * moved a book out of the list in front of you and into a place you had to guess. As
 * tabs they sit side by side: the book moves one tab over, the counts change, and the
 * app can take you to the tab it landed on without a page to jump to.
 */

export const LIBRARY_TABS = ['reading', 'to-read', 'finished', 'stopped'] as const
export type LibraryTab = (typeof LIBRARY_TABS)[number]

const READING_SECTION: Record<string, string> = {
  continue: 'CONTINUE',
  notStarted: 'NOT STARTED',
  stale: 'BEEN A WHILE',
}

export default function LibraryPage() {
  const { tab: raw } = useParams()
  const navigate = useNavigate()
  const tab: LibraryTab = LIBRARY_TABS.includes(raw as LibraryTab) ? (raw as LibraryTab) : 'reading'

  const books = useLibrary((s) => s.books)
  const entries = useBookCache((s) => s.entries)
  const shelfGrid = useLibrary((s) => s.shelfGrid)
  const setShelfGrid = useLibrary((s) => s.setShelfGrid)
  const now = useNow()

  const allIds = Object.keys(books)

  useEffect(() => {
    void refreshBooks(allIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIds.join(',')])

  const readingItems = buildReadingItems(books, entries, now)
  const shelf = buildShelf(books, entries)
  const readingCount = Object.values(books).filter((t) => t.status === 'reading').length

  const tabs: Tab[] = [
    { key: 'reading', label: 'READING', count: readingCount },
    { key: 'to-read', label: 'TO READ', count: shelf.want.length },
    { key: 'finished', label: 'FINISHED', count: shelf.read.length },
    {
      key: 'stopped',
      icon: <IconPaused size={18} strokeWidth={2.6} />,
      title: 'Paused — started and put down',
      count: shelf.dropped.length,
    },
  ]

  const go = (next: string) => navigate(`/library/${next}`, { replace: true })

  if (allIds.length === 0) {
    return (
      <div className="page">
        <TopTabs tabs={tabs} active={tab} onChange={go} />
        <EmptyState
          icon={<IconShelf size={44} strokeWidth={1.4} />}
          title="Your library is empty"
          text="Find a book and add it — everything you're reading, waiting on or have finished lives here."
          actionLabel="Find a book"
          actionTo="/explore"
        />
      </div>
    )
  }

  return (
    <div className="page">
      <TopTabs tabs={tabs} active={tab} onChange={go} />
      {tab === 'reading' ? (
        <ReadingTab
          items={readingItems}
          pending={readingCount - readingItems.length}
          grid={shelfGrid}
          onGrid={setShelfGrid}
          now={now}
        />
      ) : (
        <ShelfTab tab={tab} shelf={shelf} />
      )}
    </div>
  )
}

function ReadingTab({
  items,
  pending,
  grid,
  onGrid,
  now,
}: {
  items: ReturnType<typeof buildReadingItems>
  pending: number
  grid: boolean
  onGrid: (v: boolean) => void
  now: Date
}) {
  if (items.length === 0 && pending <= 0) {
    return (
      <EmptyState
        icon={<IconBook size={44} strokeWidth={1.4} />}
        title="Nothing open right now"
        text="Books you start show up here, and one tap logs the pages."
        actionLabel="Find a book"
        actionTo="/explore"
      />
    )
  }
  return (
    <>
      <div className="listtools">
        <span />
        <button className="iconbtn" aria-label="Toggle layout" onClick={() => onGrid(!grid)}>
          {grid ? <IconList size={22} /> : <IconGrid size={22} />}
        </button>
      </div>
      {(['continue', 'notStarted', 'stale'] as const).map((bucket) => {
        const list = items.filter((i) => i.bucket === bucket)
        if (list.length === 0) return null
        return (
          <section key={bucket}>
            <SectionPill>{READING_SECTION[bucket]}</SectionPill>
            {grid ? (
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
      {pending > 0 && <SkeletonRows count={Math.min(pending, 3)} />}
    </>
  )
}

const EMPTY: Record<string, { title: string; text: string; cta?: boolean }> = {
  'to-read': {
    title: 'Nothing waiting',
    text: 'Books you add for later show up here.',
    cta: true,
  },
  finished: {
    title: 'Nothing finished yet',
    text: 'Books you finish are collected here.',
  },
  stopped: {
    title: 'Nothing paused',
    text: 'Books you stop part-way wait here, with your progress, in case you come back.',
  },
}

function ShelfTab({
  tab,
  shelf,
}: {
  tab: Exclude<LibraryTab, 'reading'>
  shelf: { want: ShelfItem[]; read: ShelfItem[]; dropped: ShelfItem[] }
}) {
  const list = tab === 'to-read' ? shelf.want : tab === 'finished' ? shelf.read : shelf.dropped

  if (list.length === 0) {
    const copy = EMPTY[tab]
    return (
      <EmptyState
        icon={<IconShelf size={44} strokeWidth={1.4} />}
        title={copy.title}
        text={copy.text}
        actionLabel={copy.cta ? 'Browse books' : undefined}
        actionTo={copy.cta ? '/explore' : undefined}
      />
    )
  }

  if (tab === 'finished') {
    return (
      <>
        {list.map((item) => (
          <FinishedRow key={item.book.id} item={item} />
        ))}
      </>
    )
  }

  return (
    <>
      {tab === 'to-read' && (
        <p className="chips-hint">Tap START and say whether you've begun it.</p>
      )}
      {list.map((item) => (
        <ShelfRow
          key={item.book.id}
          item={item}
          action={tab === 'to-read' ? 'start' : 'reopen'}
        />
      ))}
    </>
  )
}
