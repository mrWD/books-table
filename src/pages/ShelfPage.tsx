import { useEffect, useState } from 'react'
import { useLibrary } from '../store/library'
import { refreshBooks, useBookCache } from '../store/cache'
import { buildShelf } from '../store/selectors'
import { FinishedRow, ShelfRow } from '../components/cards'
import { EmptyState, SectionPill, TopTabs } from '../components/ui'
import { IconShelf } from '../components/Icons'

export default function ShelfPage() {
  const [tab, setTab] = useState('WANT TO READ')
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
  const empty = shelf.want.length === 0 && shelf.read.length === 0 && shelf.dropped.length === 0

  if (empty) {
    return (
      <div className="page">
        <TopTabs tabs={['WANT TO READ', 'FINISHED']} active={tab} onChange={setTab} />
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
      <TopTabs tabs={['WANT TO READ', 'FINISHED']} active={tab} onChange={setTab} />
      {tab === 'WANT TO READ' ? (
        shelf.want.length > 0 ? (
          <section>
            <SectionPill>WANT TO READ</SectionPill>
            <p className="chips-hint">Tap START to move a book to Reading and track pages.</p>
            {shelf.want.map((item) => (
              <ShelfRow key={item.book.id} item={item} action="start" />
            ))}
          </section>
        ) : (
          <EmptyState
            icon={<IconShelf size={44} strokeWidth={1.4} />}
            title="Nothing waiting"
            text="Books you add for later show up here."
            actionLabel="Browse books"
            actionTo="/explore"
          />
        )
      ) : (
        <>
          {shelf.read.length > 0 && (
            <section>
              <SectionPill>FINISHED</SectionPill>
              {shelf.read.map((item) => (
                <FinishedRow key={item.book.id} item={item} />
              ))}
            </section>
          )}
          {shelf.dropped.length > 0 && (
            <section>
              <SectionPill>GAVE UP</SectionPill>
              {shelf.dropped.map((item) => (
                <ShelfRow key={item.book.id} item={item} action="reopen" />
              ))}
            </section>
          )}
          {shelf.read.length === 0 && shelf.dropped.length === 0 && (
            <EmptyState
              icon={<IconShelf size={44} strokeWidth={1.4} />}
              title="Nothing finished yet"
              text="Books you finish are collected here."
            />
          )}
        </>
      )}
    </div>
  )
}
