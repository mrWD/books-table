import { registerPlugin } from '@capacitor/core'
import { isNativeApp } from 'tables-core'
import { percentOf } from './format'
import { totalPages, useLibrary } from '../store/library'
import { useBookCache } from '../store/cache'

/**
 * Feeding the home-screen widgets.
 *
 * The widgets run outside the app and cannot read its storage, so what they show is a
 * snapshot the app pushes into a shared App Group. It is built from the same store and
 * the same helpers the shelves use — a widget that computed progress its own way would
 * eventually disagree with the app, and the disagreement would be invisible until
 * someone noticed the numbers differ.
 *
 * Nothing is sent anywhere. The App Group is on-device storage shared between two of our
 * own processes; the library still never leaves the phone.
 */

interface WidgetBridgePlugin {
  write(options: { json: string }): Promise<void>
  cachePoster(options: { name: string; url: string }): Promise<void>
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge')

interface Entry {
  id: string
  title: string
  author?: string
  page?: number
  pages?: number
  percent?: number
  cover?: string
}

/** Four rows fit a large widget and two a medium one; more would only be written. */
const LIMIT = 4

/** Stable, filesystem-safe name so the same cover is cached once. */
function coverName(bookId: string): string {
  return `book-${bookId}.jpg`
}

export async function refreshWidgets(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { books } = useLibrary.getState()
    const { entries } = useBookCache.getState()

    const summary = (id: string) => entries[id]?.book

    // Most recently touched first: the widget answers "where was I", and the book you
    // read last night is the one you mean.
    const reading: Entry[] = Object.values(books)
      .filter((t) => t.status === 'reading')
      .sort((a, b) => (b.lastReadAt ?? b.addedAt) - (a.lastReadAt ?? a.addedAt))
      .slice(0, LIMIT)
      .map((t) => {
        const book = summary(t.id)
        const total = totalPages(t, book)
        return {
          id: t.id,
          title: book?.title ?? 'Untitled',
          author: book?.authors?.[0],
          page: t.page,
          pages: total ?? undefined,
          percent: total ? percentOf(t.page, total) : undefined,
          cover: book?.cover ? coverName(t.id) : undefined,
        }
      })

    // Oldest first: a to-read shelf sorted newest-first buries the book that has been
    // waiting a year under whatever was added yesterday.
    const toRead: Entry[] = Object.values(books)
      .filter((t) => t.status === 'want')
      .sort((a, b) => a.addedAt - b.addedAt)
      .slice(0, LIMIT)
      .map((t) => {
        const book = summary(t.id)
        return {
          id: t.id,
          title: book?.title ?? 'Untitled',
          author: book?.authors?.[0],
          cover: book?.cover ? coverName(t.id) : undefined,
        }
      })

    await WidgetBridge.write({
      json: JSON.stringify({ reading, toRead, updatedAt: Date.now() }),
    })

    // Covers go over after the snapshot: the widget should get its text immediately and
    // fill in pictures as they land, rather than wait for both.
    for (const item of [...reading, ...toRead]) {
      const url = summary(item.id)?.cover
      if (!item.cover || !url) continue
      await WidgetBridge.cachePoster({ name: coverName(item.id), url }).catch(() => {})
    }
  } catch (err) {
    // A widget that fails to update is not a reason for anything in the app to break,
    // but staying silent about it cost an hour once — so it says so where the device log
    // can see it.
    console.error('[widget] refresh failed', err)
  }
}
