import { Link } from 'react-router-dom'
import type { BookSummary, ShelfStatus } from '../lib/types'
import { formatAgo, formatAuthors, formatPages } from '../lib/format'
import type { ReadingItem, ShelfItem } from '../store/selectors'
import { ensureBook } from '../store/cache'
import { useLibrary } from '../store/library'
import { useUi } from '../store/ui'
import { vibrate } from '../store/ui'
import { AuthorChip, Badge, CheckCircle, Poster, ProgressBar } from './ui'
import { IconBook, IconCheck, IconPlay, IconPlus } from './Icons'

/**
 * One tap moves a book forward by a sitting, not by a page. Ten is deliberately
 * conservative — undershooting costs one more tap, overshooting costs a correction on
 * the detail page — and the button says the number so nothing happens invisibly.
 */
export const QUICK_PAGES = 10

function quickStep(item: ReadingItem): number {
  if (item.pagesLeft === null) return QUICK_PAGES
  return Math.max(1, Math.min(QUICK_PAGES, item.pagesLeft))
}

/** Reading-list row: cover, author, position, title, progress, one-tap advance. */
export function ReadingCard({ item, now }: { item: ReadingItem; now: Date }) {
  const advance = useLibrary((s) => s.advance)
  const setPage = useLibrary((s) => s.setPage)
  const showToast = useUi((s) => s.showToast)
  const { book, tracked, total } = item
  const step = quickStep(item)

  const checkIn = () => {
    const from = tracked.page
    advance(book.id, step)
    showToast(`${book.title} — page ${from + step}`, () => setPage(book.id, from))
  }

  return (
    <Link className="card readrow" to={`/book/${book.id}`}>
      <Poster src={book.cover} alt={book.title} className="readrow-poster" />
      <div className="readrow-body">
        <AuthorChip name={formatAuthors(book.authors) || 'Unknown author'} />
        <div className="progline">
          <span className="progcode">
            {total ? `p. ${tracked.page} / ${total}` : `p. ${tracked.page}`}
          </span>
          {total ? <span className="behind">{item.percent}%</span> : null}
        </div>
        <div className="readtitle">{book.title}</div>
        <ProgressBar value={tracked.page} max={total ?? 0} />
        <div className="badges">
          {item.bucket === 'notStarted' && <Badge variant="black">NOT STARTED</Badge>}
          {item.bucket === 'stale' && tracked.lastReadAt && (
            <Badge variant="black">{formatAgo(tracked.lastReadAt, now).toUpperCase()}</Badge>
          )}
          {item.pagesLeft !== null && item.pagesLeft > 0 && item.pagesLeft <= 30 && (
            <Badge variant="accent">{item.pagesLeft} LEFT</Badge>
          )}
        </div>
      </div>
      <div className="readrow-check">
        <button
          className="quickadd"
          aria-label={`Advance ${step} pages`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            checkIn()
          }}
        >
          +{step}
        </button>
      </div>
    </Link>
  )
}

/** Grid cell for the poster-grid view of the reading list */
export function ReadingGridCard({ item }: { item: ReadingItem }) {
  const { book, tracked, total } = item
  return (
    <Link to={`/book/${book.id}`} className="gridcard">
      <div className="gridcard-imgwrap">
        <Poster src={book.cover} alt={book.title} className="gridcard-poster" />
        {total ? <div className="gridcard-progress" style={{ width: `${item.percent}%` }} /> : null}
      </div>
      <div className="gridcard-code">
        {total ? `${item.percent}%` : `p. ${tracked.page}`}
      </div>
      <div className="gridcard-name">{book.title}</div>
    </Link>
  )
}

/**
 * Shelf row.
 *
 * The button on a wish-list row starts the book rather than marking it finished. The
 * film-table original went straight from watch list to watched, which is right for a
 * film — you sit down and it is over. A book is the opposite: the step people look for
 * is "I have begun", and burying it behind the detail page is what made tracking a book
 * feel like it had no entrance. Marking something read without reading it stays
 * possible, one tap deeper, on the book's own page.
 */
export function ShelfRow({ item, action }: { item: ShelfItem; action: 'start' | 'reopen' }) {
  const setStatus = useLibrary((s) => s.setStatus)
  const showToast = useUi((s) => s.showToast)
  const { book, tracked } = item
  const sub = [
    formatAuthors(book.authors),
    book.firstPublishYear,
    formatPages(tracked.pages ?? book.pages),
  ]
    .filter(Boolean)
    .join(' • ')

  const begin = () => {
    const before = tracked.status
    setStatus(book.id, 'reading')
    showToast(
      action === 'start' ? `Started ${book.title}` : `Reading ${book.title} again`,
      () => setStatus(book.id, before),
    )
  }

  return (
    <Link className="card bookrow" to={`/book/${book.id}`}>
      <Poster src={book.cover} alt={book.title} className="bookrow-poster" />
      <div className="bookrow-body">
        <div className="rowtitle">{book.title}</div>
        {sub && <div className="rowsub">{sub}</div>}
        {tracked.myRating ? <div className="rowsub dim">{'★'.repeat(tracked.myRating)}</div> : null}
      </div>
      <div className="readrow-check">
        <button
          className="startbtn"
          aria-label={action === 'start' ? `Start reading ${book.title}` : `Read ${book.title} again`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            vibrate()
            begin()
          }}
        >
          <IconPlay size={17} strokeWidth={2} />
          <span>{action === 'start' ? 'START' : 'AGAIN'}</span>
        </button>
      </div>
    </Link>
  )
}

/** Finished books keep the check, so un-finishing one is the same gesture as before. */
export function FinishedRow({ item }: { item: ShelfItem }) {
  const setStatus = useLibrary((s) => s.setStatus)
  const showToast = useUi((s) => s.showToast)
  const { book, tracked } = item
  const sub = [
    formatAuthors(book.authors),
    book.firstPublishYear,
    formatPages(tracked.pages ?? book.pages),
  ]
    .filter(Boolean)
    .join(' • ')
  return (
    <Link className="card bookrow" to={`/book/${book.id}`}>
      <Poster src={book.cover} alt={book.title} className="bookrow-poster" />
      <div className="bookrow-body">
        <div className="rowtitle">{book.title}</div>
        {sub && <div className="rowsub">{sub}</div>}
        {tracked.myRating ? <div className="rowsub dim">{'★'.repeat(tracked.myRating)}</div> : null}
      </div>
      <div className="readrow-check">
        <CheckCircle
          on
          label="Move back to want to read"
          onClick={() => {
            setStatus(book.id, 'want')
            showToast(`${book.title} moved back to want to read`, () =>
              setStatus(book.id, 'read'),
            )
          }}
        />
      </div>
    </Link>
  )
}

// ---------- Explore result rows ----------

export function BookResultRow({ book, reason }: { book: BookSummary; reason?: string }) {
  const sub = [
    formatAuthors(book.authors),
    book.firstPublishYear || '',
    formatPages(book.pages),
  ]
    .filter(Boolean)
    .join(' • ')
  return (
    <Link className="card resultcard" to={`/book/${book.id}`} state={{ book }}>
      <Poster src={book.cover} alt={book.title} className="resultcard-poster" />
      <div className="bookrow-body">
        <div className="rowtitle">{book.title}</div>
        {sub && <div className="rowsub">{sub}</div>}
        {reason ? (
          <div className="reason">{reason}</div>
        ) : book.rating ? (
          <div className="rowsub dim">
            ★ {book.rating.toFixed(1)}
            {book.ratingsCount ? ` · ${book.ratingsCount}` : ''}
          </div>
        ) : null}
      </div>
      <AddBookButton book={book} />
    </Link>
  )
}

/**
 * Adding from a list lands on "want to read" — the only status that can be chosen
 * honestly from a search result. The toast then offers START, because the moment right
 * after adding is when someone actually wants to say "and I'm reading it now", and
 * making them find the book again on another tab to say so is the wrong answer.
 */
export function AddBookButton({
  book,
  big,
  status = 'want',
}: {
  book: BookSummary
  big?: boolean
  status?: ShelfStatus
}) {
  const tracked = useLibrary((s) => s.books[book.id])
  const addBook = useLibrary((s) => s.addBook)
  const removeBook = useLibrary((s) => s.removeBook)
  const setStatus = useLibrary((s) => s.setStatus)
  const showToast = useUi((s) => s.showToast)
  const added = Boolean(tracked)
  return (
    <button
      className={`addbtn${added ? ' added' : ''}${big ? ' big' : ''}`}
      aria-label={added ? 'In your library' : 'Add to your shelf'}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        if (added) {
          removeBook(book.id)
          showToast(`${book.title} removed`)
        } else {
          addBook(book, status)
          // Search results carry no description; fill the record in for the detail page.
          void ensureBook(book.id)
          if (status === 'want') {
            showToast(
              `${book.title} — on your shelf`,
              () => setStatus(book.id, 'reading'),
              'START READING',
            )
          } else {
            showToast(`${book.title} added to your shelf`)
          }
        }
      }}
    >
      {added ? (
        <IconCheck size={big ? 22 : 18} strokeWidth={2.6} />
      ) : (
        <IconPlus size={big ? 22 : 18} strokeWidth={2.4} />
      )}
    </button>
  )
}

/** Full-bleed discovery card used for the trending strip on Explore. */
export function BookFeedCard({ book, tint }: { book: BookSummary; tint: string }) {
  return (
    <Link to={`/book/${book.id}`} state={{ book }} className="feedcard">
      <div className="feedcard-img">
        <Poster src={book.coverLarge ?? book.cover} alt={book.title} className="feedcard-poster" />
        <div className="feedcard-grad" />
        <div className="feedcard-add">
          <AddBookButton book={book} big />
        </div>
        <div className="feedcard-meta">
          <div className="feedcard-title">
            <IconBook size={18} strokeWidth={2} /> {book.title}
          </div>
          <div className="feedcard-sub">
            {[
              formatAuthors(book.authors),
              book.firstPublishYear || '',
              book.rating ? `★ ${book.rating.toFixed(1)}` : '',
            ]
              .filter(Boolean)
              .join(' • ')}
          </div>
        </div>
      </div>
      {book.description && <div className={`feedcard-strip ${tint}`}>{book.description}</div>}
    </Link>
  )
}
