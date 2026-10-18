import { openLibraryUrl } from '../lib/api'
import { IconBook, IconChevronRight } from './Icons'

/**
 * Where to actually get the book.
 *
 * Deliberately one link, to the work page of the source the record came from. There is
 * no affiliate link, no bookseller, no price comparison and nothing that would need a
 * partner agreement — the app has no revenue and adding a storefront would change what
 * it is.
 *
 * There used to be a second link, straight to the Internet Archive's scan of the book
 * ("read or borrow"). The Archive's lending of in-copyright scans is exactly what the
 * publishers' lawsuit against it was about, and an app in a store pointing at those scans
 * directly invites a takedown request. Open Library's own work page decides for itself
 * what it offers for each edition, and the app makes no promise either way.
 */
export function ReadOnline({ id }: { id: string }) {
  return (
    <div className="watchlinks">
      <a className="watchlink" href={openLibraryUrl(id)} target="_blank" rel="noreferrer">
        <IconBook size={18} strokeWidth={1.8} />
        <span className="watchlink-name">Editions and details on Open Library</span>
        <IconChevronRight size={16} strokeWidth={2.4} />
      </a>
    </div>
  )
}
