import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { BookSummary } from '../lib/types'
import { ensureBook, useBookCache } from '../store/cache'
import { useLibrary } from '../store/library'
import { useUi } from '../store/ui'
import { totalOf } from '../store/selectors'
import { formatAgo, formatBigDuration, formatPages, percentOf, readingMinutes } from '../lib/format'
import { displaySubjects } from '../lib/subjects'
import { Badge, Poster, ProgressBar, StarRating, useNow } from '../components/ui'
import {
  IconBack,
  IconBook,
  IconBookmark,
  IconCheck,
  IconPlay,
  IconStop,
  IconTrash,
} from '../components/Icons'
import { ReadOnline } from '../components/ReadOnline'

const QUICK_STEPS = [10, 25, 50]

export default function BookDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const passedBook = (location.state as { book?: BookSummary } | null)?.book
  const entry = useBookCache((s) => s.entries[id])
  const prime = useBookCache((s) => s.prime)
  const tracked = useLibrary((s) => s.books[id])
  const addBook = useLibrary((s) => s.addBook)
  const removeBook = useLibrary((s) => s.removeBook)
  const setStatus = useLibrary((s) => s.setStatus)
  const setPage = useLibrary((s) => s.setPage)
  const advance = useLibrary((s) => s.advance)
  const setPageCount = useLibrary((s) => s.setPageCount)
  const setMyRating = useLibrary((s) => s.setMyRating)
  const showToast = useUi((s) => s.showToast)
  const askConfirm = useUi((s) => s.askConfirm)
  const now = useNow()
  const [expandAbout, setExpandAbout] = useState(false)
  const [pageDraft, setPageDraft] = useState('')
  const [editingTotal, setEditingTotal] = useState(false)
  const [totalDraft, setTotalDraft] = useState('')

  useEffect(() => {
    if (passedBook) prime(passedBook)
    if (id) void ensureBook(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const book = entry?.book ?? passedBook

  if (!book) {
    return (
      <div className="page detail">
        <button className="floatback" onClick={() => navigate(-1)} aria-label="Back">
          <IconBack size={22} />
        </button>
        <div className="skel hero-skel" />
      </div>
    )
  }

  const total = tracked ? totalOf(tracked, book) : (book.pages ?? null)
  const page = tracked?.page ?? 0
  const percent = percentOf(page, total)
  const pagesLeft = total ? Math.max(0, total - page) : null

  const meta = [
    book.authors.join(', '),
    book.firstPublishYear ? String(book.firstPublishYear) : '',
    formatPages(total),
    book.editionCount ? `${book.editionCount} editions` : '',
  ]
    .filter(Boolean)
    .join(' • ')

  const commitPage = () => {
    const value = Number(pageDraft)
    setPageDraft('')
    if (!Number.isFinite(value) || value < 0) return
    const from = page
    setPage(id, Math.round(value))
    // The store clamps to the edition's length, so the toast reports where the book
    // actually landed rather than what was typed.
    const landed = useLibrary.getState().books[id]?.page ?? Math.round(value)
    showToast(`Page ${landed}`, () => setPage(id, from))
  }

  const commitTotal = () => {
    const value = Number(totalDraft)
    setEditingTotal(false)
    if (!Number.isFinite(value) || value <= 0) return
    setPageCount(id, Math.round(value))
    showToast(`Edition set to ${Math.round(value)} pages`)
  }

  const subjects = displaySubjects(book.subjects)

  return (
    <div className="page detail">
      <div className="hero">
        <Poster src={book.coverLarge ?? book.cover} alt={book.title} className="hero-img" />
        <div className="hero-grad" />
        <button className="floatback" onClick={() => navigate(-1)} aria-label="Back">
          <IconBack size={22} />
        </button>
      </div>

      <div className="detail-body">
        <h1 className="detail-title">{book.title}</h1>
        {meta && <div className="detail-meta">{meta}</div>}
        {book.rating ? (
          <div className="detail-meta">
            ★ {book.rating.toFixed(1)}
            {book.ratingsCount ? ` · ${book.ratingsCount} ratings on Open Library` : ''}
          </div>
        ) : null}
        {subjects.length > 0 && (
          <div className="genrechips">
            {subjects.map((s) => (
              <span key={s} className="genrechip">
                {s}
              </span>
            ))}
          </div>
        )}

        {!tracked && (
          <div className="addrow">
            <button
              className="btn wide"
              onClick={() => {
                addBook(book, 'want')
                showToast(`${book.title} added to your shelf`)
              }}
            >
              <IconBookmark size={18} strokeWidth={2.2} /> Want to read
            </button>
            <button
              className="btn accent wide"
              onClick={() => {
                addBook(book, 'reading')
                showToast(`Started ${book.title}`)
              }}
            >
              <IconPlay size={18} strokeWidth={2.2} /> Start reading
            </button>
          </div>
        )}

        {tracked && (
          <div className="trackpanel">
            <div className="trackpanel-row">
              <span className="trackpanel-count">
                {total ? `${page} / ${total} pages` : `page ${page}`}
              </span>
              {tracked.status === 'want' && <Badge variant="black">WANT TO READ</Badge>}
              {tracked.status === 'dropped' && <Badge variant="black">GAVE UP</Badge>}
              {tracked.status === 'read' && <Badge variant="green">FINISHED</Badge>}
              {tracked.status === 'reading' && total ? (
                <Badge variant="accent">{percent}%</Badge>
              ) : null}
            </div>
            <ProgressBar value={page} max={total ?? 0} />

            {pagesLeft !== null && pagesLeft > 0 && tracked.status !== 'want' && (
              <div className="nextair">
                {pagesLeft} pages left — about {formatBigDuration(readingMinutes(pagesLeft))} at an
                average pace
              </div>
            )}
            {tracked.status === 'read' && tracked.finishedAt && (
              <div className="nextair">Finished {formatAgo(tracked.finishedAt, now)}</div>
            )}

            {/* A shelved book has one obvious next step, and it is not logging a page
                on something never opened. Give it the whole button. */}
            {tracked.status === 'want' && (
              <button
                className="btn accent wide"
                onClick={() => {
                  setStatus(id, 'reading')
                  showToast(`Started ${book.title}`, () => setStatus(id, 'want'))
                }}
              >
                <IconPlay size={18} strokeWidth={2.2} /> Start reading
              </button>
            )}

            {tracked.status !== 'read' && tracked.status !== 'want' && (
              <>
                <div className="steprow">
                  {QUICK_STEPS.map((step) => (
                    <button
                      key={step}
                      className="btn ghost step"
                      onClick={() => {
                        const from = page
                        advance(id, step)
                        showToast(`Page ${from + step}`, () => setPage(id, from))
                      }}
                    >
                      +{step}
                    </button>
                  ))}
                  <form
                    className="pageform"
                    onSubmit={(e) => {
                      e.preventDefault()
                      commitPage()
                    }}
                  >
                    {/* No `max`: the median page count is often wrong for the edition in
                        someone's hands, and a `max` makes the browser block the submit
                        outright instead of letting the store clamp and finish the book. */}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={pageDraft}
                      placeholder="page"
                      aria-label="Set current page"
                      onChange={(e) => setPageDraft(e.target.value)}
                    />
                    <button type="submit" className="btn ghost" disabled={pageDraft === ''}>
                      Set
                    </button>
                  </form>
                </div>
                <button
                  className="btn accent wide"
                  onClick={() => {
                    setStatus(id, 'read')
                    showToast(`${book.title} finished`, () => setStatus(id, 'reading'))
                  }}
                >
                  <IconCheck size={18} strokeWidth={2.6} /> Mark as finished
                </button>
              </>
            )}

            <div className="ratingrow">
              <span className="ratinglabel">Your rating</span>
              <StarRating
                value={tracked.myRating}
                onChange={(v) => {
                  setMyRating(id, v)
                  if (v) showToast(`Rated ${v}/5`)
                }}
              />
            </div>

            <div className="editionrow">
              {editingTotal ? (
                <form
                  className="pageform"
                  onSubmit={(e) => {
                    e.preventDefault()
                    commitTotal()
                  }}
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    autoFocus
                    value={totalDraft}
                    placeholder="pages"
                    aria-label="Pages in your edition"
                    onChange={(e) => setTotalDraft(e.target.value)}
                  />
                  <button type="submit" className="btn ghost">
                    Save
                  </button>
                </form>
              ) : (
                <button
                  className="textbtn"
                  onClick={() => {
                    setTotalDraft(total ? String(total) : '')
                    setEditingTotal(true)
                  }}
                >
                  <IconBook size={16} />
                  {total ? `${total} pages in your edition` : 'Set page count'}
                </button>
              )}
            </div>

            <div className="trackactions">
              {tracked.status === 'want' && (
                <button
                  className="textbtn"
                  onClick={() => {
                    setStatus(id, 'read')
                    showToast(`${book.title} marked as read`, () => setStatus(id, 'want'))
                  }}
                >
                  <IconCheck size={16} strokeWidth={2.4} /> Already read it
                </button>
              )}
              {tracked.status === 'reading' && (
                <button
                  className="textbtn"
                  onClick={() => {
                    setStatus(id, 'dropped')
                    showToast(`Gave up on ${book.title}`, () => setStatus(id, 'reading'))
                  }}
                >
                  <IconStop size={16} /> Give up
                </button>
              )}
              {(tracked.status === 'dropped' || tracked.status === 'read') && (
                <button
                  className="textbtn"
                  onClick={() => {
                    setStatus(id, 'reading')
                    showToast(`Reading ${book.title} again`)
                  }}
                >
                  <IconPlay size={16} /> {tracked.status === 'read' ? 'Read again' : 'Resume'}
                </button>
              )}
              <button
                className="textbtn danger"
                onClick={async () => {
                  const ok = await askConfirm({
                    title: `Remove ${book.title}?`,
                    message: 'The book and its reading history will be removed from your library.',
                    confirmLabel: 'Remove',
                    danger: true,
                  })
                  if (ok) {
                    removeBook(id)
                    showToast(`${book.title} removed`)
                    navigate(-1)
                  }
                }}
              >
                <IconTrash size={16} /> Remove
              </button>
            </div>
          </div>
        )}

        {book.description && (
          <p
            className={`detail-about${expandAbout ? ' open' : ''}`}
            onClick={() => setExpandAbout(!expandAbout)}
          >
            {book.description}
          </p>
        )}

        <ReadOnline id={id} iaId={book.iaId} />

        {!tracked && !book.description && (
          <p className="hint">No description on record for this book.</p>
        )}

        <p className="attribution">
          Data from{' '}
          <a href={`https://openlibrary.org/works/${id}`} target="_blank" rel="noreferrer">
            Open Library
          </a>
        </p>
      </div>
    </div>
  )
}
