import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { buildBackup, isValidBackup, useLibrary } from '../store/library'
import { useBookCache } from '../store/cache'
import { useUi } from '../store/ui'
import { buildStats } from '../store/selectors'
import { useTheme, type ThemeChoice } from '../store/theme'
import { useStats } from '../store/stats'
import { YearReview } from '../components/YearReview'
import { AutoBackup } from '../components/AutoBackup'
import { SupportLinks } from '../components/Support'
import { Feedback } from '../components/Feedback'
import { exportJsonFile, isNativeApp } from 'tables-core'
import { native } from '../lib/native'
import { formatBigDuration } from '../lib/format'
import { Poster } from '../components/ui'
import { IconDownload, IconTrash, IconUpload, IconUser } from '../components/Icons'
import type { ShelfStatus } from '../lib/types'

/**
 * The library exists only in this browser: clearing site data wipes it, and Safari's
 * tracking prevention can clear it on its own for a site that lives in a tab. A backup is
 * the only defence, so once there is enough to lose, say so — quietly, and not forever.
 */
function BackupNudge({ items }: { items: number }) {
  const lastExportAt = useStats((s) => s.lastExportAt)
  if (items < 15) return null
  const days = lastExportAt ? Math.floor((Date.now() - lastExportAt) / 86400000) : null
  if (days !== null && days < 60) return null
  return (
    <p className="chips-hint">
      {days === null
        ? `${items} entries and no backup yet — export one, it is a single file.`
        : `Last backup was ${days} days ago.`}
    </p>
  )
}

const SHELVES: { label: string; status: ShelfStatus }[] = [
  { label: 'Reading', status: 'reading' },
  { label: 'Want to read', status: 'want' },
  { label: 'Finished', status: 'read' },
  { label: 'Paused', status: 'dropped' },
]

export default function ProfilePage() {
  const books = useLibrary((s) => s.books)
  const importBackup = useLibrary((s) => s.importBackup)
  const resetAll = useLibrary((s) => s.resetAll)
  const entries = useBookCache((s) => s.entries)
  const showToast = useUi((s) => s.showToast)
  const askConfirm = useUi((s) => s.askConfirm)
  const theme = useTheme((s) => s.theme)
  const setTheme = useTheme((s) => s.setTheme)
  const fileRef = useRef<HTMLInputElement>(null)

  const stats = buildStats(books, entries)

  const doExport = async () => {
    const backup = buildBackup()
    const name = `bookstable-backup-${new Date().toISOString().slice(0, 10)}.json`
    const outcome = await exportJsonFile(backup, name, native)
    // Closing the share sheet is an answer, not an error; a real failure has to be said
    // out loud, or someone walks away believing they have a backup.
    if (outcome === 'cancelled') return
    if (outcome === 'failed') {
      showToast('Export failed — the backup was not saved')
      return
    }
    useStats.getState().recordExport()
    showToast('Backup exported')
  }

  const doImport = async (file: File) => {
    try {
      const text = await file.text()
      const data: unknown = JSON.parse(text)
      if (!isValidBackup(data)) throw new Error('not a BooksTable backup')
      const ok = await askConfirm({
        title: 'Import backup?',
        message: 'Your current library will be replaced by the backup contents.',
        confirmLabel: 'Import',
      })
      if (!ok) return
      importBackup(data)
      showToast('Backup imported')
    } catch (err) {
      console.warn(err)
      showToast('Import failed: not a valid backup file')
    }
  }

  return (
    <div className="page profile">
      <div className="profile-head">
        <div className="avatar">
          <IconUser size={34} strokeWidth={1.6} />
        </div>
        <h1>My library</h1>
        <p className="profile-sub">Stored on this device · no account needed</p>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-num">{stats.pagesRead}</span>
          <span className="stat-label">PAGES</span>
        </div>
        <div className="stat">
          <span className="stat-num">{formatBigDuration(stats.minutes)}</span>
          <span className="stat-label">READING TIME</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.finished}</span>
          <span className="stat-label">FINISHED</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.reading}</span>
          <span className="stat-label">READING</span>
        </div>
      </div>

      {SHELVES.map(({ label, status }) => {
        const list = Object.values(books).filter((t) => t.status === status)
        if (list.length === 0) return null
        return (
          <section key={status}>
            <h2 className="h2">
              {label} <span className="h2-count">{list.length}</span>
            </h2>
            <div className="shelf">
              {list.map((t) => {
                const book = entries[t.id]?.book
                return (
                  <Link key={t.id} to={`/book/${t.id}`} className="shelf-item">
                    <Poster
                      src={book?.cover}
                      alt={book?.title ?? t.id}
                      className="shelf-poster"
                    />
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}

      <section>
        <YearReview />

        <h2 className="h2">Appearance</h2>
        <div className="chips">
          {(['system', 'light', 'dark'] as ThemeChoice[]).map((t) => (
            <button
              key={t}
              className={`chip${theme === t ? ' active' : ''}`}
              aria-pressed={theme === t}
              onClick={() => setTheme(t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="chips-hint">
          {theme === 'system'
            ? 'Following your device setting.'
            : `Always ${theme}, whatever the device is set to.`}
        </p>
      </section>

      <section>
        <h2 className="h2">Data</h2>
        <BackupNudge items={Object.keys(books).length} />
        <div className="datacard">
          <button className="datarow" onClick={() => void doExport()}>
            <IconDownload size={20} />
            <div>
              <div className="datarow-title">Export backup</div>
              <div className="datarow-sub">
                {/* In the app the file goes to the share sheet, not a download folder. */}
                {isNativeApp()
                  ? 'Save your library as a JSON file'
                  : 'Download your library as a JSON file'}
              </div>
            </div>
          </button>
          <button className="datarow" onClick={() => fileRef.current?.click()}>
            <IconUpload size={20} />
            <div>
              <div className="datarow-title">Import backup</div>
              <div className="datarow-sub">Restore from a BooksTable backup file</div>
            </div>
          </button>
          <AutoBackup />
          <button
            className="datarow danger"
            onClick={async () => {
              const ok = await askConfirm({
                title: 'Reset everything?',
                message: 'All books and reading history on this device will be deleted.',
                confirmLabel: 'Delete all',
                danger: true,
              })
              if (ok) {
                resetAll()
                showToast('Library cleared')
              }
            }}
          >
            <IconTrash size={20} />
            <div>
              <div className="datarow-title">Reset all data</div>
              <div className="datarow-sub">Delete the whole library from this device</div>
            </div>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void doImport(f)
            e.target.value = ''
          }}
        />
      </section>

      <section>
        <h2 className="h2">Feedback &amp; contact</h2>
        <Feedback />
      </section>

      <section>
        <h2 className="h2">Support</h2>
        <SupportLinks />
      </section>

      <section>
        <h2 className="h2">More from the author</h2>
        <p className="attribution">
          <a href="https://mrwd.github.io/" target="_blank" rel="noreferrer">
            All products &rarr;
          </a>
        </p>
      </section>

      <p className="attribution">
        BooksTable · a free, local-first reading tracker · no account, no sync, no ads
      </p>
      <p className="attribution">
        Book data and covers from{' '}
        <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
          Open Library
        </a>
        , a project of the Internet Archive
      </p>
    </div>
  )
}
