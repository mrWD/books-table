import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ReadingPage from './pages/ReadingPage'
import ShelfPage from './pages/ShelfPage'
import ExplorePage from './pages/ExplorePage'
import BookDetailPage from './pages/BookDetailPage'
import ProfilePage from './pages/ProfilePage'
import InsightsPage from './pages/InsightsPage'
import { BottomNav, ConfirmHost, ScrollToTop, ToastHost } from './components/ui'
import { SupportFab } from './components/Support'
import { InstallHint } from './components/InstallHint'
import { Analytics } from './components/Analytics'
import { useLibrary } from './store/library'
import { refreshBooks } from './store/cache'
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
    return watchSystemTheme()
  }, [])

  useEffect(() => {
    // Group detail routes so the counter stays a handful of screens, not per-title.
    const path = location.pathname
    const key = path.startsWith('/book/') ? '/book' : path
    useStats.getState().recordRoute(key)
  }, [location.pathname])

  return (
    <div className={`app${isDetail ? ' on-detail' : ''}`}>
      <ScrollToTop />
      <InstallHint />
      <Routes>
        <Route path="/" element={<Navigate to="/reading" replace />} />
        <Route path="/reading" element={<ReadingPage />} />
        <Route path="/shelf" element={<ShelfPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="*" element={<Navigate to="/reading" replace />} />
      </Routes>
      <BottomNav />
      <SupportFab />
      <ToastHost />
      <ConfirmHost />
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
