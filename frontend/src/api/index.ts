import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((cfg) => {
  const raw = localStorage.getItem('ak-recommender-store')
  if (raw) {
    try {
      const { state } = JSON.parse(raw)
      if (state?.user?.token)
        cfg.headers.Authorization = `Bearer ${state.user.token}`
    } catch {}
  }
  return cfg
})

export default api

// ── Auth ──────────────────────────────────────────────────────────
export const signup = (name: string, email: string, password: string) =>
  api.post('/auth/signup', { name, email, password }).then(r => r.data)

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(r => r.data)

export const logout = () => api.post('/auth/logout')

export const deleteAccount = () => api.delete('/auth/account')

// ── Movies ────────────────────────────────────────────────────────
export const getRandomMovies  = (n = 20) => api.get(`/movies/random?n=${n}`).then(r => r.data)
export const searchMovies     = (q: string) => api.get(`/movies/search?q=${encodeURIComponent(q)}`).then(r => r.data)
export const getMovie         = (id: number) => api.get(`/movies/${id}`).then(r => r.data)
export const getSimilar       = (id: number) => api.get(`/movies/${id}/similar`).then(r => r.data)

// ── Recommendations ───────────────────────────────────────────────
export const getRecommendations    = () => api.get('/recommendations').then(r => r.data)
export const getPerModelRecs       = () => api.get('/recommendations/per-model').then(r => r.data)

// ── Watchlist ─────────────────────────────────────────────────────
export const getWatchlist    = () => api.get('/watchlist').then(r => r.data)
export const addWatchlist    = (id: number) => api.post(`/watchlist/${id}`)
export const removeWatchlist = (id: number) => api.delete(`/watchlist/${id}`)

// ── Ratings ───────────────────────────────────────────────────────
export const rateMovie   = (id: number, rating: number) => api.post(`/ratings/${id}`, { rating }).then(r => r.data)
export const getMyRating = (id: number) => api.get(`/ratings/${id}`).then(r => r.data)
export const getAllRatings = () => api.get('/ratings').then(r => r.data)