export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function daysUntil(date: Date, now: Date): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86400000)
}

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

export function weekdayName(d: Date): string {
  return WEEKDAYS[d.getDay()]
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateNoYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatRuntime(min: number | null | undefined): string {
  if (!min) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Long durations for stats: "3mo 12d", "2d 14h", "3h 20m" */
export function formatBigDuration(min: number): string {
  if (min <= 0) return '0m'
  const totalH = min / 60
  const totalD = totalH / 24
  if (totalD >= 60) {
    const mo = Math.floor(totalD / 30)
    const d = Math.floor(totalD - mo * 30)
    return d > 0 ? `${mo}mo ${d}d` : `${mo}mo`
  }
  if (totalD >= 2) {
    const d = Math.floor(totalD)
    const h = Math.floor(totalH - d * 24)
    return h > 0 ? `${d}d ${h}h` : `${d}d`
  }
  const h = Math.floor(totalH)
  const m = Math.round(min - h * 60)
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function yearOf(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 4)
}

// ---------- books ----------

/**
 * Minutes per page, used everywhere a page count is turned into time.
 *
 * There is no honest single number: it depends on the reader, the typeface and the
 * book. 1.5 sits in the middle of the commonly cited 1–2 minute range and is stated
 * here once so every estimate in the app moves together if it is ever changed.
 */
export const MINUTES_PER_PAGE = 1.5

export function readingMinutes(pages: number | null | undefined): number {
  if (!pages || pages <= 0) return 0
  return Math.round(pages * MINUTES_PER_PAGE)
}

export function formatPages(pages: number | null | undefined): string {
  if (!pages || pages <= 0) return ''
  return `${pages} p.`
}

export function formatAuthors(authors: readonly string[] | undefined, max = 2): string {
  if (!authors || authors.length === 0) return ''
  if (authors.length <= max) return authors.join(', ')
  return `${authors.slice(0, max).join(', ')} +${authors.length - max}`
}

export function percentOf(value: number, max: number | null | undefined): number {
  if (!max || max <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)))
}

/** "3 days ago", "2 weeks ago" — for how long a book has been sitting untouched. */
export function formatAgo(then: number | null | undefined, now: Date): string {
  if (!then) return ''
  const days = Math.floor((now.getTime() - then) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return weeks === 1 ? 'a week ago' : `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? 'a month ago' : `${months} months ago`
  const years = Math.floor(days / 365)
  return years === 1 ? 'a year ago' : `${years} years ago`
}
