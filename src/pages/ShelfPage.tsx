import { useEffect, useState } from 'react'
import { useLibrary } from '../store/library'
import { refreshBooks, useBookCache } from '../store/cache'
import { buildShelf, type ShelfItem } from '../store/selectors'
import { FinishedRow, ShelfRow } from '../components/cards'
import { EmptyState, TopTabs } from '../components/ui'
import { IconShelf } from '../components/Icons'

/**
 * One tab per status, each carrying its count.
 *
 * The counts are the point: a shelf is three separate piles, and until the tab said how
 * big each one was, the only way to find out where a book had gone was to open every
 * tab. Sections stacked on one screen hid the same information behind a scroll.
 */
const TABS = ['TO READ', 'FINISHED', 'GAVE UP'] as const
type TabName = (typeof TABS)[number]

export default function ShelfPage() {
  const [tab, setTab] = useState<TabName>('TO READ')
  const books = useLibrary((s) => s.books)
  const entries = useBookCache((s) => s.entries)

  const shelvedIds = Object.values(books)
    .filter((t) => t.status !== 'reading')
    .map((t) => t.id)

  useEffect(() => {
    void refreshBooks(shelvedIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelvedIds.join(',')])

  const shelf = buildShelf(books, entries)
  const lists: Record<TabName, ShelfItem[]> = {
    'TO READ': shelf.want,
    FINISHED: shelf.read,
    'GAVE UP': shelf.dropped,
  }
  const tabs = TABS.map((label) => ({ label, count: lists[label].length }))
  const list = lists[tab]

  if (shelvedIds.length === 0) {
    return (
      <div className="page">
        <TopTabs tabs={tabs} active={tab} onChange={(t) => setTab(t as TabName)} />
        <EmptyState
          icon={<IconShelf size={44} strokeWidth={1.4} />}
          title="The shelf is empty"
          text="Search for a book and put it here for later."
          actionLabel="Explore books"
          actionTo="/explore"
        />
      </div>
    )
  }

  return (
    <div className="page">
      <TopTabs tabs={tabs} active={tab} onChange={(t) => setTab(t as TabName)} />

      {tab === 'TO READ' && list.length > 0 && (
        <p className="chips-hint">Tap START and say whether you've begun it.</p>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<IconShelf size={44} strokeWidth={1.4} />}
          title={
            tab === 'TO READ'
              ? 'Nothing waiting'
              : tab === 'FINISHED'
                ? 'Nothing finished yet'
                : 'Nothing abandoned'
          }
          text={
            tab === 'TO READ'
              ? 'Books you add for later show up here.'
              : tab === 'FINISHED'
                ? 'Books you finish are collected here.'
                : 'Books you give up on wait here in case you change your mind.'
          }
          actionLabel={tab === 'TO READ' ? 'Browse books' : undefined}
          actionTo={tab === 'TO READ' ? '/explore' : undefined}
        />
      ) : tab === 'FINISHED' ? (
        list.map((item) => <FinishedRow key={item.book.id} item={item} />)
      ) : (
        list.map((item) => (
          <ShelfRow
            key={item.book.id}
            item={item}
            action={tab === 'TO READ' ? 'start' : 'reopen'}
          />
        ))
      )}
    </div>
  )
}
