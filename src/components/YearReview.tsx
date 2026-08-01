import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLibrary } from '../store/library'
import { useBookCache } from '../store/cache'
import { buildYearReview, yearsWithActivity } from '../store/selectors'
import { formatBigDuration } from '../lib/format'

/**
 * A year of reading, added up on this device.
 *
 * Every reading session already stores when it happened, so nothing new had to be
 * recorded and nothing leaves the browser to produce this. Only years with something in
 * them are offered — an empty recap is worse than no recap.
 */

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export function YearReview() {
  const books = useLibrary((s) => s.books)
  const entries = useBookCache((s) => s.entries)

  const years = yearsWithActivity(books)
  const [year, setYear] = useState<number | null>(null)
  const active = year ?? years[0]

  if (years.length === 0) return null

  const review = buildYearReview(books, entries, active)
  if (review.pages === 0 && review.finished === 0) return null

  const peak = Math.max(...review.byMonth)

  return (
    <section>
      <div className="h2-row">
        <h2 className="h2">{active} in review</h2>
        {years.length > 1 && (
          <select
            className="yearselect"
            value={active}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Year"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-num">{review.pages}</span>
          <span className="stat-label">PAGES</span>
        </div>
        <div className="stat">
          <span className="stat-num">{formatBigDuration(review.minutes)}</span>
          <span className="stat-label">READING TIME</span>
        </div>
        <div className="stat">
          <span className="stat-num">{review.finished}</span>
          <span className="stat-label">FINISHED</span>
        </div>
        <div className="stat">
          <span className="stat-num">
            {review.busiestMonth === null ? '—' : MONTHS[review.busiestMonth]}
          </span>
          <span className="stat-label">BUSIEST</span>
        </div>
      </div>

      {peak > 0 && (
        <div className="months" aria-label="Pages read per month">
          {review.byMonth.map((count, i) => (
            <span key={i} className="month" title={`${count} pages in month ${i + 1}`}>
              <span
                className={`month-bar${i === review.busiestMonth ? ' peak' : ''}`}
                style={{ height: `${Math.max(3, (count / peak) * 100)}%` }}
              />
              <span className="month-label">{MONTHS[i]}</span>
            </span>
          ))}
        </div>
      )}

      {review.topBooks.length > 0 && (
        <div className="datacard">
          {review.topBooks.map((b) => (
            <Link key={b.id} className="datarow" to={`/book/${b.id}`}>
              <div>
                <div className="datarow-title">{b.title}</div>
                <div className="datarow-sub">
                  {b.pages} page{b.pages === 1 ? '' : 's'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
