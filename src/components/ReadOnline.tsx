import { archiveUrl, openLibraryUrl } from '../lib/api'
import { IconBook, IconChevronRight } from './Icons'

/**
 * Where to actually get the book.
 *
 * Deliberately only two links, both to the sources the record came from. There is no
 * affiliate link, no bookseller, no price comparison and nothing that would need a
 * partner agreement — the app has no revenue and adding a storefront would change what
 * it is. Availability on the Internet Archive is decided on their side; whether a scan
 * can be read or only borrowed is not something this app can promise.
 */
export function ReadOnline({ id, iaId }: { id: string; iaId?: string | null }) {
  return (
    <div className="watchlinks">
      {iaId && (
        <a className="watchlink" href={archiveUrl(iaId)} target="_blank" rel="noreferrer">
          <IconBook size={18} strokeWidth={1.8} />
          <span className="watchlink-name">Read or borrow at the Internet Archive</span>
          <IconChevronRight size={16} strokeWidth={2.4} />
        </a>
      )}
      <a className="watchlink" href={openLibraryUrl(id)} target="_blank" rel="noreferrer">
        <IconBook size={18} strokeWidth={1.8} />
        <span className="watchlink-name">Editions and details on Open Library</span>
        <IconChevronRight size={16} strokeWidth={2.4} />
      </a>
    </div>
  )
}
