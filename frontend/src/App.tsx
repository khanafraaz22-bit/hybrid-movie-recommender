import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { useStore } from './store'
import Navbar      from './components/Navbar'
import CursorTrail from './components/CursorTrail'
import LandingPage from './pages/LandingPage'
import AuthPage    from './pages/AuthPage'
import DiscoverPage        from './pages/DiscoverPage'
import RecommendationsPage from './pages/RecommendationsPage'
import MovieDetailPage     from './pages/MovieDetailPage'
import WatchlistPage       from './pages/WatchListPage'
import ProfilePage         from './pages/ProfilePage'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useStore()
  return user ? children : <Navigate to="/auth" replace />
}

function AppRoutes() {
  const { theme } = useStore()

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  return (
    <>
      <CursorTrail />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1208',
            color: '#f5e6cc',
            border: '1px solid rgba(255,184,0,0.25)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#ffb800', secondary: '#000' } },
        }}
      />
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/auth"        element={<AuthPage />} />
        <Route path="/discover"    element={<><Navbar /><DiscoverPage /></>} />
        <Route path="/movie/:id"   element={<><Navbar /><MovieDetailPage /></>} />
        <Route path="/watchlist"   element={<><Navbar /><WatchlistPage /></>} />
        <Route path="/recommendations" element={
          <RequireAuth>
            <><Navbar /><RecommendationsPage /></>
          </RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth>
            <><Navbar /><ProfilePage /></>
          </RequireAuth>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}