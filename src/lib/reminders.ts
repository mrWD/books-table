import { LocalNotifications } from '@capacitor/local-notifications'
import { isNativeApp } from 'tables-core'
import { useBookCache } from '../store/cache'
import { useLibrary } from '../store/library'

/**
 * One reminder, not a feed: if the app has not been opened for three days and a book is
 * mid-read, say so once, in the evening. Every open pushes the date forward, so someone
 * reading daily never hears from it at all — the notification only exists for the person
 * the app was about to lose.
 *
 * Everything is a no-op in a browser, and nothing here may ever throw into the app:
 * a reminder is a nicety, and a nicety that crashes a check-in is worse than none.
 */

const READING_REMINDER_ID = 1
const QUIET_DAYS = 3

export async function requestReminderPermission(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  } catch {
    return false
  }
}

/** The book the reminder would name: mid-read, most recently touched. */
function currentBook(): { title: string; page: number } | null {
  const { books } = useLibrary.getState()
  const { entries } = useBookCache.getState()
  const reading = Object.values(books)
    .filter((t) => t.status === 'reading')
    .sort((a, b) => (b.lastReadAt ?? b.addedAt) - (a.lastReadAt ?? a.addedAt))[0]
  if (!reading) return null
  return { title: entries[reading.id]?.book.title ?? 'Your book', page: reading.page }
}

export async function rescheduleReadingReminder(enabled: boolean): Promise<void> {
  if (!isNativeApp()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: READING_REMINDER_ID }] })
    if (!enabled) return
    const book = currentBook()
    if (!book) return
    const at = new Date()
    at.setDate(at.getDate() + QUIET_DAYS)
    at.setHours(19, 0, 0, 0)
    await LocalNotifications.schedule({
      notifications: [
        {
          id: READING_REMINDER_ID,
          title: 'Your book is waiting',
          body: book.page > 0 ? `${book.title} — you stopped at p. ${book.page}.` : `${book.title} is ready when you are.`,
          schedule: { at, allowWhileIdle: true },
        },
      ],
    })
  } catch {
    // Scheduling failed; the library is untouched and the next open tries again.
  }
}
