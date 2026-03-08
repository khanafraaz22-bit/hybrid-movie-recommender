import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Shuffle, Sparkles, X, Flame } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import TrendingMarquee from '../components/TrendingMarquee'
import { getRandomMovies, searchMovies } from '../api'
import { useStore } from '../store'
import { useSounds } from '../hooks/useSounds'
import type { Movie } from '../types'
import toast from 'react-hot-toast'

const MOODS = [
  { label: '🎭 Drama',    genre: 'Drama' },
  { label: '😂 Comedy',   genre: 'Comedy' },
  { label: '💥 Action',   genre: 'Action' },
  { label: '😱 Thriller', genre: 'Thriller' },
  { label: '🚀 Sci-Fi',   genre: 'Sci-Fi' },
  { label: '💕 Romance',  genre: 'Romance' },
  { label: '🧙 Fantasy',  genre: 'Fantasy' },
  { label: '👻 Horror',   genre: 'Horror' },
  { label: '🎬 All',      genre: '' },
]

const PLATFORMS = [
  { name: 'Netflix',     color: '#e50914', icon: 'N', url: (t: string) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}` },
  { name: 'Prime Video', color: '#00a8e1', icon: 'P', url: (t: string) => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video` },
  { name: 'JustWatch',   color: '#FFA500', icon: 'J', url: (t: string) => `https://www.justwatch.com/in/search?q=${encodeURIComponent(t)}` },
]

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ height: '280px', background: 'rgba(255,255,255,0.05)' }}>
      <div className="w-full h-full shimmer" />
    </div>
  )
}

function PlatformBadges({ title }: { title: string }) {
  return (
    <div className="flex gap-1 mt-1">
      {PLATFORMS.map(p => (
        <a key={p.name} href={p.url(title)} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()} title={p.name}
          className="w-5 h-5 rounded text-[9px] font-black flex items-center justify-center text-white hover:scale-110 transition-transform"
          style={{ background: p.color }}>
          {p.icon}
        </a>
      ))}
    </div>
  )
}

export default function DiscoverPage() {
  const [movies, setMovies]       = useState<Movie[]>([])
  const [trending, setTrending]   = useState<Movie[]>([])
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<Movie[]>([])
  const [loading, setLoading]     = useState(true)
  const [searching, setSearching] = useState(false)
  const [isSearch, setIsSearch]   = useState(false)
  const [mood, setMood]           = useState('')
  const [shuffleKey, setShuffleKey] = useState(0)

  const navigate = useNavigate()
  const { user } = useStore()
  const { softClick, pageTransition } = useSounds()

  const loadRandom = useCallback(async () => {
    setLoading(true); setIsSearch(false); setQuery('')
    try {
      const data = await getRandomMovies(24)
      setMovies(data)
      setTrending(prev => prev.length ? prev : data.slice(0, 12))
    } catch { toast.error('Could not load movies') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { loadRandom() }, [loadRandom])

  useEffect(() => {
    if (!query.trim()) { setIsSearch(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchMovies(query)
        setResults(data); setIsSearch(true)
      } catch { toast.error('Search failed') }
      finally   { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  const openMovie = (m: Movie) => { softClick(); pageTransition(); navigate(`/movie/${m.movieId}`) }

  const baseMovies = isSearch ? results : movies
  const displayed  = mood
    ? baseMovies.filter(m => m.genres?.toLowerCase().includes(mood.toLowerCase()))
    : baseMovies

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--bg-dark)' }}>

      {/* Trending marquee */}
      {!loading && trending.length > 0 && (
        <motion.div className="pt-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <TrendingMarquee movies={trending} />
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-8">

        {/* Header */}
        <motion.div className="mb-6"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            {user ? `Hello, ${user.name.split(' ')[0]} 👋` : 'Discover'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {user ? 'Click any movie for personalised recommendations.' : 'Browse our collection.'}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-3 gap-3 mb-8"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {[
            { label: 'Movies', value: '27K+', icon: '🎬' },
            { label: 'Ratings', value: '20M+', icon: '⭐' },
            { label: 'Genres',  value: '18',   icon: '🎭' },
          ].map((s, i) => (
            <motion.div key={s.label} className="glass rounded-xl p-3 text-center"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-display font-black text-xl" style={{ color: 'var(--gold)' }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div className="relative mb-5"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
            style={{ color: 'var(--gold)', opacity: 0.7 }} />
          <input className="cinema-input w-full pl-12 pr-12 py-4 text-base"
            placeholder="Search any movie title…"
            value={query} onChange={e => setQuery(e.target.value)} />
          {searching && (
            <motion.div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full"
              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          )}
          {query && !searching && (
            <button onClick={() => { setQuery(''); setIsSearch(false) }}
              className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          )}
        </motion.div>

        {/* Mood filter */}
        {!isSearch && (
          <motion.div className="flex flex-wrap gap-2 mb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            {MOODS.map((m, i) => (
              <motion.button key={m.genre}
                className={`mood-chip ${mood === m.genre ? 'active' : ''}`}
                onClick={() => { softClick(); setMood(mood === m.genre ? '' : m.genre) }}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.03 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {m.label}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <motion.h2 className="font-display text-xl font-bold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            {isSearch
              ? <><Search size={18} style={{ color: 'var(--gold)' }} /> {results.length} results for "{query}"</>
              : <><Flame size={18} style={{ color: 'var(--gold)' }} /> Featured Tonight</>
            }
          </motion.h2>

          {!isSearch && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              onClick={() => { softClick(); setShuffleKey(k => k + 1); loadRandom() }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-sm font-medium"
              style={{ color: 'var(--gold)', border: '1px solid rgba(255,184,0,0.2)' }}>
              <Shuffle size={14} /> Shuffle
            </motion.button>
          )}
        </div>

        {/* Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)}
            </motion.div>
          ) : displayed.length === 0 ? (
            <motion.div key="empty" className="flex flex-col items-center justify-center py-24 gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="text-6xl">🎬</span>
              <p className="font-display text-xl" style={{ color: 'var(--text-muted)' }}>No movies found</p>
            </motion.div>
          ) : (
            <motion.div key={`grid-${shuffleKey}-${mood}`}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {displayed.map((m, i) => (
                <motion.div key={m.movieId}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}>
                  <div className="flex flex-col gap-1">
                    <MovieCard movie={m} onClick={openMovie} size="md" />
                    <div className="px-1">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)', opacity: 0.75 }}>{m.title}</p>
                      <PlatformBadges title={m.title} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        {user && !isSearch && !loading && (
          <motion.div className="mt-14 flex justify-center"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <motion.button
              onClick={() => { softClick(); pageTransition(); navigate('/recommendations') }}
              className="btn-gold px-10 py-4 rounded-2xl text-base font-display font-bold flex items-center gap-3"
              whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}>
              <Sparkles size={20} /> See My Personalised Picks
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}