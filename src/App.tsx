import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LibraryPage from './pages/LibraryPage'
import ExplorePage from './pages/ExplorePage'
import BookDetailPage from './pages/BookDetailPage'
import ProfilePage from './pages/ProfilePage'
import InsightsPage from './pages/InsightsPage'
import { BottomNav, ChoiceHost, ConfirmHost, ScrollToTop, ToastHost } from './components/ui'
import { SupportFab } from './components/Support'
import { InstallHint } from './components/InstallHint'
import { Analytics } from './components/Analytics'
import { rescheduleReadingReminder } from './lib/reminders'
import { refreshWidgets } from './lib/widget'
import { useLibrary } from './store/library'
import { refreshBooks } from './store/cache'
import { useReminders } from './store/reminders'
import { watchSystemTheme } from './store/theme'
import { beginSessionOnce, useStats } from './store/stats'

function Shell() {
  const location = useLocation()
  const isDetail = location.pathname.startsWith('/book/')

  useEffect(() => {
    const { books } = useLibrary.getState()
    void refreshBooks(
      Object.values(books)
        .filter((t) => t.status === 'reading')
        .map((t) => t.id),
    )
    beginSessionOnce()
    // Every open pushes the reading reminder three days out again; it only ever fires
    // for the person who stopped opening the app.
    void rescheduleReadingReminder(useReminders.getState().enabled)
    // The widgets are fed from the same store the shelves read, so a subscription is
    // enough: every check-in, finish or shelf change pushes a fresh snapshot, and the
    // app never has to remember to call this from each of those places.
    void refreshWidgets()
    const stopWidgets = useLibrary.subscribe(() => void refreshWidgets())
    const stopTheme = watchSystemTheme()
    return () => {
      stopWidgets()
      stopTheme()
    }
  }, [])

  useEffect(() => {
    // Group the parameterised routes so the counter stays a handful of screens rather
    // than one row per title or per library tab.
    const path = location.pathname
    const key = path.startsWith('/book/')
      ? '/book'
      : path.startsWith('/library')
        ? '/library'
        : path
    useStats.getState().recordRoute(key)
  }, [location.pathname])

  return (
    <div className={`app${isDetail ? ' on-detail' : ''}`}>
      <ScrollToTop />
      <InstallHint />
      <Routes>
        <Route path="/" element={<Navigate to="/library/reading" replace />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/:tab" element={<LibraryPage />} />
        {/* Addresses from before Reading and the shelf were merged. */}
        <Route path="/reading" element={<Navigate to="/library/reading" replace />} />
        <Route path="/shelf" element={<Navigate to="/library/to-read" replace />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="*" element={<Navigate to="/library/reading" replace />} />
      </Routes>
      <BottomNav />
      <SupportFab />
      <ToastHost />
      <ConfirmHost />
      <ChoiceHost />
      <Analytics />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
