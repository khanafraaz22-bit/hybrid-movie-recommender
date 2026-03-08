import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Movie } from '../types'

interface AppStore {
  user:       User | null
  // watchlists keyed by userId so they never bleed between accounts
  watchlists: Record<number, Movie[]>
  theme:      'dark' | 'light'

  setUser:          (u: User | null) => void
  addToWatchlist:   (m: Movie) => void
  removeWatchlist:  (movieId: number) => void
  isInWatchlist:    (movieId: number) => boolean
  clearWatchlist:   () => void
  getWatchlist:     () => Movie[]
  toggleTheme:      () => void
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      user:       null,
      watchlists: {},
      theme:      'dark',

      setUser: (u) => {
        // When logging out clear nothing — each user's list is stored separately
        set({ user: u })
      },

      getWatchlist: () => {
        const { user, watchlists } = get()
        if (!user) return []
        return watchlists[user.userId] ?? []
      },

      addToWatchlist: (m) => set((s) => {
        if (!s.user) return s
        const uid  = s.user.userId
        const prev = s.watchlists[uid] ?? []
        if (prev.find(x => x.movieId === m.movieId)) return s
        return { watchlists: { ...s.watchlists, [uid]: [...prev, m] } }
      }),

      removeWatchlist: (id) => set((s) => {
        if (!s.user) return s
        const uid  = s.user.userId
        const prev = s.watchlists[uid] ?? []
        return { watchlists: { ...s.watchlists, [uid]: prev.filter(x => x.movieId !== id) } }
      }),

      isInWatchlist: (id) => {
        const { user, watchlists } = get()
        if (!user) return false
        return (watchlists[user.userId] ?? []).some(x => x.movieId === id)
      },

      clearWatchlist: () => set((s) => {
        if (!s.user) return s
        const uid = s.user.userId
        const updated = { ...s.watchlists }
        delete updated[uid]
        return { watchlists: updated }
      }),

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'ak-recommender-store' }
  )
)