import type { BookSummary } from './types'
import { stats } from '../store/stats'

/**
 * Open Library is the whole catalogue layer: search, work details, covers, trending
 * and subject browsing all come from it, with no API key and `access-control-allow-origin: *`
 * on every endpoint. That is why there is no server in this project at all.
 *
 * Its search is slow — measured around 2 s — so anything that is not the primary result
 * is fired with a timeout and allowed to lose.
 */
const OL = 'https://openlibrary.org'
const COVERS = 'https://covers.openlibrary.org'

/** Fields worth asking for; the default response is an order of magnitude larger. */
const SEARCH_FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'number_of_pages_median',
  'cover_i',
  'ratings_average',
  'ratings_count',
  'subject',
  'language',
  'ia',
  'ebook_access',
  'edition_count',
].join(',')

export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Supplementary sources must never hold up the primary results. */
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    const settle = (v: T) => {
      clearTimeout(timer)
      resolve(v)
    }
    p.then(settle, () => settle(fallback))
  })
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json() as Promise<T>
}

/** `/works/OL893516W` → `OL893516W`. Ids are stored bare so URLs stay short. */
export function workId(key: string | undefined | null): string {
  if (!key) return ''
  return key.replace(/^\/works\//, '').replace(/^\/books\//, '')
}

export function coverUrl(coverId: number | null | undefined, size: 'S' | 'M' | 'L'): string | null {
  if (!coverId) return null
  return `${COVERS}/b/id/${coverId}-${size}.jpg`
}

/**
 * Open Library descriptions are free text with wiki leftovers: markdown emphasis and
 * links, and a trailing "([source][1])" footnote with its link definitions below. The
 * app renders them as plain text, so raw `*asterisks*` show up on screen — verified on
 * the Master and Margarita record. The noise is cut here rather than in every view.
 */
export function cleanDescription(raw: string | { value?: string } | null | undefined): string {
  const text = typeof raw === 'string' ? raw : (raw?.value ?? '')
  if (!text) return ''
  return text
    .replace(/\(\[source\]\[\d+\]\)/gi, '')
    .replace(/^\s*\[\d+\]:\s*\S+\s*$/gm, '')
    // The label may itself contain brackets — "[The Lord of the Rings [2/2]](url)" is a
    // real record — so a plain [^\]]+ label pattern leaves the URL behind.
    .replace(/\[((?:[^[\]]|\[[^\]]*\])*)\]\((https?:\/\/[^)]+)\)/g, '$1')
    // Reference-style links: "[The Two Towers][2]" with its "[2]: url" line stripped above.
    .replace(/\[([^\]]+)\]\[\d+\]/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    // Underscores only at word boundaries, so identifiers inside a sentence survive.
    .replace(/(^|\s)__?([^_\n]+)__?(?=\s|$|[.,;:!?)])/g, '$1$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/-{3,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------- response shapes ----------

interface SearchDoc {
  key: string
  title?: string
  author_name?: string[]
  first_publish_year?: number
  number_of_pages_median?: number | null
  cover_i?: number | null
  ratings_average?: number | null
  ratings_count?: number | null
  subject?: string[]
  language?: string[]
  ia?: string[]
  ebook_access?: string
  edition_count?: number
}

interface WorkDetail {
  key: string
  title?: string
  description?: string | { value?: string }
  subjects?: string[]
  covers?: number[]
  first_publish_date?: string
}

function firstIa(ia: string | string[] | null | undefined): string | null {
  if (!ia) return null
  return Array.isArray(ia) ? (ia[0] ?? null) : ia
}

export function mapSearchDoc(d: SearchDoc): BookSummary {
  return {
    id: workId(d.key),
    title: d.title ?? 'Untitled',
    authors: d.author_name ?? [],
    cover: coverUrl(d.cover_i, 'M'),
    coverLarge: coverUrl(d.cover_i, 'L'),
    firstPublishYear: d.first_publish_year ?? null,
    pages: d.number_of_pages_median ?? null,
    subjects: (d.subject ?? []).slice(0, 12),
    rating: d.ratings_average ?? null,
    ratingsCount: d.ratings_count ?? null,
    languages: d.language ?? [],
    editionCount: d.edition_count ?? null,
    iaId: firstIa(d.ia),
  }
}

// ---------- search ----------

/**
 * `all` searches everything, `title` and `author` use Open Library's dedicated
 * parameters. The narrow scopes matter more for books than they would for films: a
 * plain query for an author's name returns the books *about* them mixed in with the
 * ones they wrote.
 */
export type SearchScope = 'all' | 'title' | 'author'

/**
 * Unofficial study guides, "summaries" and workbooks written about a popular book.
 * Searching a bestseller returns a wall of them — "SUMMARY and REVIEW: PROJECT HAIL
 * MARY", "WorkBook For…" — because they are separate works with the same words in the
 * title. They are real records, so they are pushed down rather than hidden.
 */
const DERIVATIVE = /\b(summary|summaries|analysis|analyses|workbook|study guide|studyguide|key takeaways|conversation starters|book club|quicklet|sidekick|trivia[- ]on[- ]books|companion (?:guide|workbook))\b/i

function derivativeScore(book: BookSummary): number {
  if (!DERIVATIVE.test(book.title)) return 0
  // A genuine book whose title contains "Analysis" has a cover and a print history;
  // the parasitic ones have neither. Both signals must agree before demoting.
  const thin = !book.cover && (book.editionCount ?? 1) <= 2
  return thin ? 2 : 1
}

export async function searchBooks(
  query: string,
  scope: SearchScope = 'all',
  limit = 24,
): Promise<BookSummary[]> {
  const param = scope === 'title' ? 'title' : scope === 'author' ? 'author' : 'q'
  const sort = scope === 'author' ? '&sort=rating' : ''
  const url = `${OL}/search.json?${param}=${encodeURIComponent(
    query,
  )}${sort}&limit=${limit}&fields=${SEARCH_FIELDS}`
  const data = await getJson<{ numFound: number; docs: SearchDoc[] }>(url)
  stats.source('openlibrary')
  // Works with neither a cover nor an author are almost always catalogue debris.
  const books = data.docs
    .filter((d) => d.title && (d.cover_i || (d.author_name?.length ?? 0) > 0))
    .map(mapSearchDoc)

  // Stable: Open Library's own relevance decides everything except the demotion.
  return books
    .map((book, index) => ({ book, index, penalty: derivativeScore(book) }))
    .sort((a, b) => a.penalty - b.penalty || a.index - b.index)
    .map((r) => r.book)
}

/**
 * A work's details come from two endpoints that each know half the record: `works.json`
 * has the description and the full subject list, search has ratings, page count, authors
 * and the scan id. Neither alone is enough for the detail page.
 */
export async function fetchBook(id: string): Promise<BookSummary | null> {
  const [detail, doc] = await Promise.all([
    getJson<WorkDetail>(`${OL}/works/${id}.json`).catch(() => null),
    getJson<{ docs: SearchDoc[] }>(
      `${OL}/search.json?q=${encodeURIComponent(`key:/works/${id}`)}&fields=${SEARCH_FIELDS}`,
    )
      .then((d) => d.docs[0] ?? null)
      .catch(() => null),
  ])
  if (!detail && !doc) return null

  const base = doc ? mapSearchDoc(doc) : null
  const coverFromDetail = detail?.covers?.find((c) => c > 0) ?? null

  return {
    id,
    title: base?.title ?? detail?.title ?? 'Untitled',
    authors: base?.authors ?? [],
    cover: base?.cover ?? coverUrl(coverFromDetail, 'M'),
    coverLarge: base?.coverLarge ?? coverUrl(coverFromDetail, 'L'),
    firstPublishYear:
      base?.firstPublishYear ??
      (detail?.first_publish_date ? Number(/\d{4}/.exec(detail.first_publish_date)?.[0]) : null) ??
      null,
    pages: base?.pages ?? null,
    subjects: (detail?.subjects ?? base?.subjects ?? []).slice(0, 16),
    rating: base?.rating ?? null,
    ratingsCount: base?.ratingsCount ?? null,
    languages: base?.languages ?? [],
    description: cleanDescription(detail?.description),
    editionCount: base?.editionCount ?? null,
    iaId: base?.iaId ?? null,
  }
}

// ---------- discovery ----------

export type TrendingPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

export async function trendingBooks(
  period: TrendingPeriod = 'weekly',
  limit = 20,
): Promise<BookSummary[]> {
  const data = await getJson<{ works: SearchDoc[] }>(`${OL}/trending/${period}.json?limit=${limit}`)
  return (data.works ?? []).filter((w) => w.title).map(mapSearchDoc)
}

/** Open Library subject slugs are lowercase and underscore-separated. */
export function subjectSlug(subject: string): string {
  return subject
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Genre browsing goes through search, not `/subjects/<slug>.json`.
 *
 * The subjects endpoint ranks by edition count, which in practice means the same
 * handful of public-domain classics tops every genre — Alice in Wonderland was the
 * first result for both Fantasy and Science Fiction. Ranking the search index by
 * rating instead returns what a reader would recognise as the genre.
 */
export async function booksBySubject(subject: string, limit = 20): Promise<BookSummary[]> {
  const data = await getJson<{ docs: SearchDoc[] }>(
    `${OL}/search.json?q=${encodeURIComponent(
      `subject:${subjectSlug(subject)}`,
    )}&sort=rating&limit=${limit}&fields=${SEARCH_FIELDS}`,
  )
  return data.docs.filter((d) => d.title && d.cover_i).map(mapSearchDoc)
}

/** Best-rated works by an author — the backbone of "because you read …". */
export async function booksByAuthor(author: string, limit = 10): Promise<BookSummary[]> {
  const data = await getJson<{ docs: SearchDoc[] }>(
    `${OL}/search.json?author=${encodeURIComponent(
      author,
    )}&sort=rating&limit=${limit}&fields=${SEARCH_FIELDS}`,
  )
  return data.docs.filter((d) => d.title && d.cover_i).map(mapSearchDoc)
}

// ---------- outbound links ----------

export function openLibraryUrl(id: string): string {
  return `${OL}/works/${id}`
}

/** Internet Archive serves the scan; borrowing or reading is decided on their side. */
export function archiveUrl(iaId: string): string {
  return `https://archive.org/details/${iaId}`
}
