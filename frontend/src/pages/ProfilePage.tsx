import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Star, Heart, Film, BarChart3, Trash2, LogOut, TrendingUp, Award } from 'lucide-react'
import { useStore } from '../store'
import { useSounds } from '../hooks/useSounds'
import { usePoster } from '../hooks/usePoster'
import { getAllRatings, getMovie, logout, deleteAccount } from '../api'
import type { Movie } from '../types'
import toast from 'react-hot-toast'

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <motion.div className="glass rounded-2xl p-5 flex flex-col gap-2 border border-yellow-400/10"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, borderColor: 'rgba(255,184,0,0.3)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color }}>
        {icon}
      </div>
      <div className="font-display text-3xl font-black" style={{ color: 'var(--gold)' }}>{value}</div>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </motion.div>
  )
}

// ── Rated movie row ───────────────────────────────────────────────
function RatedMovieRow({ movieId, rating, onClick }: { movieId: number; rating: number; onClick: () => void }) {
  const [movie, setMovie] = useState<Movie | null>(null)
  const { poster } = usePoster(movie?.title ?? '', movie?.year)

  useEffect(() => {
    getMovie(movieId).then(setMovie).catch(() => {})
  }, [movieId])

  if (!movie) return (
    <div className="h-16 rounded-xl shimmer" />
  )

  return (
    <motion.div
      className="flex items-center gap-4 p-3 glass rounded-xl border border-yellow-400/10 hover:border-yellow-400/25 transition-colors cursor-pointer group"
      onClick={onClick}
      whileHover={{ x: 4 }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <img src={poster} alt={movie.title}
        className="w-10 h-14 object-cover rounded-lg shrink-0"
        onError={e => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/40x56/111/ffb800?text=🎬` }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate group-hover:text-yellow-400 transition-colors"
          style={{ color: 'var(--text-primary)' }}>{movie.title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {movie.genres?.split('|').slice(0, 2).join(' · ')} {movie.year && `· ${movie.year}`}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={13}
            fill={i < Math.round(rating) ? '#ffb800' : 'none'}
            stroke={i < Math.round(rating) ? '#ffb800' : 'rgba(255,184,0,0.3)'}
            strokeWidth={1.5}
          />
        ))}
        <span className="ml-1 text-xs font-bold text-yellow-400">{rating.toFixed(1)}</span>
      </div>
    </motion.div>
  )
}

// ── Watchlist movie row ───────────────────────────────────────────
function WatchlistRow({ movie, onClick }: { movie: Movie; onClick: () => void }) {
  const { poster } = usePoster(movie.title, movie.year)
  return (
    <motion.div
      className="flex items-center gap-4 p-3 glass rounded-xl border border-yellow-400/10 hover:border-red-400/30 transition-colors cursor-pointer group"
      onClick={onClick}
      whileHover={{ x: 4 }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <img src={poster} alt={movie.title}
        className="w-10 h-14 object-cover rounded-lg shrink-0"
        onError={e => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/40x56/111/ffb800?text=🎬` }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate group-hover:text-yellow-400 transition-colors"
          style={{ color: 'var(--text-primary)' }}>{movie.title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {movie.genres?.split('|').slice(0, 2).join(' · ')} {movie.year && `· ${movie.year}`}
        </p>
      </div>
      <Heart size={14} className="text-red-400 shrink-0" fill="currentColor" />
    </motion.div>
  )
}

// ── Genre bar ─────────────────────────────────────────────────────
function GenreBar({ genre, count, max }: { genre: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{genre}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #ffb800, #e08000)' }}
          initial={{ width: 0 }}
          animate={{ width: `${(count / max) * 100}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
      <span className="text-xs w-4 shrink-0 font-bold" style={{ color: 'var(--gold)' }}>{count}</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, setUser, getWatchlist, clearWatchlist } = useStore()
  const { softClick, pageTransition } = useSounds()
  const navigate  = useNavigate()
  const watchlist = getWatchlist()

  const [ratings, setRatings]   = useState<{ movieId: number; rating: number }[]>([])
  const [tab, setTab]           = useState<'stats' | 'rated' | 'watchlist'>('stats')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    getAllRatings()
      .then(setRatings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  // Compute genre taste from ratings
  const genreCounts: Record<string, number> = {}
  // We'll build this from rated movies as they load — use a simple approach
  const avgRating = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(2)
    : '—'

  const topRated  = [...ratings].sort((a, b) => b.rating - a.rating).slice(0, 3)

  const handleLogout = async () => {
    softClick()
    try { await logout() } catch {}
    setUser(null)
    navigate('/')
    toast.success('See you next time! 🎬')
  }

  const handleDelete = async () => {
    if (!confirm('Delete your account permanently? This cannot be undone.')) return
    try {
      await deleteAccount()
      setUser(null)
      clearWatchlist()
      navigate('/')
      toast.success('Account deleted.')
    } catch { toast.error('Failed to delete account.') }
  }

  if (!user) return null

  const joinDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const tabs = [
    { key: 'stats',     label: 'Stats',     icon: <BarChart3 size={14} /> },
    { key: 'rated',     label: `Rated (${ratings.length})`, icon: <Star size={14} /> },
    { key: 'watchlist', label: `Watchlist (${watchlist.length})`, icon: <Heart size={14} /> },
  ] as const

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: 'var(--bg-dark)' }}>
      <div className="max-w-4xl mx-auto px-4">

        {/* ── Profile header ── */}
        <motion.div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Avatar */}
          <motion.div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-black shrink-0 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #ffb800, #e08000)', boxShadow: '0 0 40px rgba(255,184,0,0.4)' }}
            animate={{ boxShadow: ['0 0 30px rgba(255,184,0,0.3)', '0 0 60px rgba(255,184,0,0.5)', '0 0 30px rgba(255,184,0,0.3)'] }}
            transition={{ duration: 3, repeat: Infinity }}>
            {user.name[0].toUpperCase()}
          </motion.div>

          <div className="flex-1">
            <h1 className="font-display text-3xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              {user.name}
            </h1>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Member since {joinDate}</p>

            {/* Top rated badge */}
            {ratings.length >= 10 && (
              <motion.div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,184,0,0.15)', border: '1px solid rgba(255,184,0,0.3)', color: 'var(--gold)' }}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Award size={12} /> Power Reviewer
              </motion.div>
            )}
          </div>

          {/* Account actions */}
          <div className="flex gap-2">
            <motion.button onClick={handleLogout}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 text-sm hover:border-white/25 transition-all"
              style={{ color: 'var(--text-muted)' }}>
              <LogOut size={14} /> Sign out
            </motion.button>
            <motion.button onClick={handleDelete}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 transition-all text-red-400/70 hover:text-red-400">
              <Trash2 size={14} /> Delete
            </motion.button>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-8 glass p-1 rounded-2xl w-fit">
          {tabs.map(t => (
            <motion.button key={t.key}
              onClick={() => { softClick(); setTab(t.key) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === t.key ? 'linear-gradient(135deg, #ffb800, #e08000)' : 'transparent',
                color: tab === t.key ? '#000' : 'var(--text-muted)',
              }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {t.icon} {t.label}
            </motion.button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">

          {/* STATS TAB */}
          {tab === 'stats' && (
            <motion.div key="stats"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <StatCard icon={<Star size={18} className="text-black" />}   label="Movies Rated"     value={ratings.length}       color="rgba(255,184,0,0.3)" />
                <StatCard icon={<Heart size={18} className="text-black" />}  label="In Watchlist"     value={watchlist.length}     color="rgba(239,68,68,0.3)" />
                <StatCard icon={<TrendingUp size={18} className="text-black" />} label="Avg Rating"   value={avgRating}            color="rgba(168,85,247,0.3)" />
                <StatCard icon={<Film size={18} className="text-black" />}   label="Top Rated"        value={topRated[0]?.rating.toFixed(1) ?? '—'} color="rgba(34,197,94,0.3)" />
              </div>

              {/* Top rated movies */}
              {topRated.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Award size={18} style={{ color: 'var(--gold)' }} /> Your Top Rated
                  </h2>
                  <div className="space-y-3">
                    {topRated.map((r, i) => (
                      <motion.div key={r.movieId} transition={{ delay: i * 0.1 }}>
                        <RatedMovieRow
                          movieId={r.movieId}
                          rating={r.rating}
                          onClick={() => { softClick(); pageTransition(); navigate(`/movie/${r.movieId}`) }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating distribution */}
              {ratings.length > 0 && (
                <div className="glass rounded-2xl p-5 border border-yellow-400/10">
                  <h2 className="font-display text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BarChart3 size={18} style={{ color: 'var(--gold)' }} /> Rating Distribution
                  </h2>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = ratings.filter(r => Math.round(r.rating) === star).length
                      const max   = Math.max(...[5,4,3,2,1].map(s => ratings.filter(r => Math.round(r.rating) === s).length))
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-16 shrink-0 justify-end">
                            {Array.from({ length: star }).map((_, i) => (
                              <Star key={i} size={10} fill="#ffb800" stroke="#ffb800" strokeWidth={1.5} />
                            ))}
                          </div>
                          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <motion.div className="h-full rounded-full"
                              style={{ background: 'linear-gradient(90deg, #ffb800, #e08000)' }}
                              initial={{ width: 0 }}
                              animate={{ width: max ? `${(count / max) * 100}%` : '0%' }}
                              transition={{ duration: 0.8, delay: (5 - star) * 0.1 }}
                            />
                          </div>
                          <span className="text-xs w-6 font-bold" style={{ color: 'var(--text-muted)' }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {ratings.length === 0 && !loading && (
                <motion.div className="flex flex-col items-center py-20 gap-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <motion.span className="text-6xl"
                    animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    🎬
                  </motion.span>
                  <p className="font-display text-xl" style={{ color: 'var(--text-muted)' }}>No stats yet</p>
                  <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    Start rating movies to see your taste profile here
                  </p>
                  <motion.button onClick={() => { softClick(); navigate('/discover') }}
                    className="btn-gold px-6 py-2.5 rounded-xl text-sm font-semibold mt-2"
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    Discover Movies
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* RATED TAB */}
          {tab === 'rated' && (
            <motion.div key="rated"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {ratings.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <span className="text-6xl">⭐</span>
                  <p className="font-display text-xl" style={{ color: 'var(--text-muted)' }}>No rated movies yet</p>
                  <motion.button onClick={() => { softClick(); navigate('/discover') }}
                    className="btn-gold px-6 py-2.5 rounded-xl text-sm font-semibold"
                    whileHover={{ scale: 1.05 }}>
                    Start Rating
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...ratings].sort((a, b) => b.rating - a.rating).map((r, i) => (
                    <motion.div key={r.movieId} transition={{ delay: i * 0.03 }}>
                      <RatedMovieRow
                        movieId={r.movieId}
                        rating={r.rating}
                        onClick={() => { softClick(); pageTransition(); navigate(`/movie/${r.movieId}`) }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* WATCHLIST TAB */}
          {tab === 'watchlist' && (
            <motion.div key="watchlist"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {watchlist.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <motion.span className="text-6xl"
                    animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    🍿
                  </motion.span>
                  <p className="font-display text-xl" style={{ color: 'var(--text-muted)' }}>Watchlist is empty</p>
                  <motion.button onClick={() => { softClick(); navigate('/discover') }}
                    className="btn-gold px-6 py-2.5 rounded-xl text-sm font-semibold"
                    whileHover={{ scale: 1.05 }}>
                    Find Movies
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchlist.map((m, i) => (
                    <motion.div key={m.movieId} transition={{ delay: i * 0.03 }}>
                      <WatchlistRow
                        movie={m}
                        onClick={() => { softClick(); pageTransition(); navigate(`/movie/${m.movieId}`) }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}