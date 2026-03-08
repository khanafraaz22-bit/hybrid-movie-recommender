import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, Calendar, Hash, Play, Heart } from 'lucide-react'
import { getMovie, getSimilar, rateMovie, getMyRating } from '../api'
import { addWatchlist, removeWatchlist } from '../api'
import { usePoster } from '../hooks/usePoster'
import { useStore } from '../store'
import { useSounds } from '../hooks/useSounds'
import MovieCard from '../components/MovieCard'
import type { Movie } from '../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Inline Trailer ────────────────────────────────────────────────
function InlineTrailer({ title, year }: { title: string; year?: number | null }) {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || ''

  useEffect(() => {
    if (!apiKey) { setLoading(false); return }
    const query = encodeURIComponent(`${title} ${year ?? ''} official trailer`)
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${apiKey}`)
      .then(r => r.json())
      .then(d => { setVideoId(d.items?.[0]?.id?.videoId ?? null) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [title, year, apiKey])

  if (loading) return (
    <div className="w-full rounded-xl overflow-hidden glass flex items-center justify-center"
      style={{ aspectRatio: '16/9' }}>
      <motion.div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full"
        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
    </div>
  )

  if (!videoId) return (
    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${year ?? ''} official trailer`)}`}
      target="_blank" rel="noopener noreferrer"
      className="w-full rounded-xl overflow-hidden glass flex flex-col items-center justify-center gap-3 hover:border-yellow-400/30 transition-colors"
      style={{ aspectRatio: '16/9', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center">
        <Play size={24} fill="white" className="text-white ml-1" />
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Search trailer on YouTube</p>
    </a>
  )

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
      <iframe
        width="100%" height="100%"
        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
        title={`${title} trailer`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ display: 'block' }}
      />
    </div>
  )
}

// ── Star Rating ───────────────────────────────────────────────────
function StarRating({ movieId }: { movieId: number }) {
  const [hovered, setHovered]   = useState(0)
  const [selected, setSelected] = useState(0)
  const [loading, setLoading]   = useState(true)
  const { user } = useStore()
  const { heartSound } = useSounds()

  useEffect(() => {
    if (!user) { setLoading(false); return }
    getMyRating(movieId)
      .then(d => { if (d.rating) setSelected(d.rating * 2) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [movieId, user])

  const handleRate = async (stars: number) => {
    if (!user) { toast.error('Sign in to rate movies'); return }
    const rating = stars / 2
    setSelected(stars)
    heartSound()
    try {
      await rateMovie(movieId, rating)
      toast.success(`Rated ${rating.toFixed(1)} ★`)
    } catch { toast.error('Could not save rating') }
  }

  if (loading) return <div className="h-8 w-48 shimmer rounded-lg" />

  return (
    <div>
      <p className="text-xs mb-2 font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {selected ? `Your rating: ${(selected / 2).toFixed(1)} / 5` : 'Rate this movie'}
      </p>
      <div className="flex gap-1">
        {Array.from({ length: 10 }).map((_, i) => {
          const val    = i + 1
          const filled = val <= (hovered || selected)
          return (
            <motion.button key={i}
              onMouseEnter={() => setHovered(val)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => handleRate(val)}
              whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
              <Star size={20}
                fill={filled ? '#ffb800' : 'none'}
                stroke={filled ? '#ffb800' : 'rgba(255,184,0,0.3)'}
                strokeWidth={1.5} />
            </motion.button>
          )
        })}
      </div>
      {selected > 0 && (
        <motion.button className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}
          onClick={() => { setSelected(0) }}
          whileHover={{ color: '#ffb800' }}>
          Clear rating
        </motion.button>
      )}
    </div>
  )
}

// ── Poster ────────────────────────────────────────────────────────
function PosterHero({ movie }: { movie: Movie }) {
  const { poster, loading } = usePoster(movie.title, movie.year)
  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
      style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,184,0,0.08)' }}>
      {loading
        ? <div className="w-full aspect-[2/3] shimmer" />
        : <img src={poster} alt={movie.title} className="w-full aspect-[2/3] object-cover"
            onError={e => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/300x450/111/ffb800?text=${encodeURIComponent(movie.title.slice(0,12))}` }}
          />
      }
    </div>
  )
}

const PLATFORMS = [
  { name: 'Netflix',   color: '#e50914', url: (t: string) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}` },
  { name: 'Prime',     color: '#00a8e1', url: (t: string) => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video` },
  { name: 'JustWatch', color: '#FFA500', url: (t: string) => `https://www.justwatch.com/in/search?q=${encodeURIComponent(t)}` },
]

export default function MovieDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [movie, setMovie]     = useState<Movie | null>(null)
  const [similar, setSimilar] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const { addToWatchlist, removeWatchlist: removeLocal, isInWatchlist } = useStore()
  const { heartSound, softClick, pageTransition } = useSounds()
  const inList = movie ? isInWatchlist(movie.movieId) : false

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getMovie(Number(id)), getSimilar(Number(id))])
      .then(([m, s]) => { setMovie(m); setSimilar(s) })
      .catch(() => toast.error('Movie not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleWatchlist = async () => {
    if (!movie) return
    heartSound()
    if (inList) {
      removeLocal(movie.movieId)
      try { await removeWatchlist(movie.movieId) } catch {}
    } else {
      addToWatchlist(movie)
      try { await addWatchlist(movie.movieId) } catch {}
      toast.success('Added to watchlist ❤️')
    }
  }

  if (loading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <motion.div className="w-12 h-12 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full"
        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
    </div>
  )

  if (!movie) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <p className="text-5xl mb-4">🎬</p>
    </div>
  )

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: 'var(--bg-dark)' }}>
      <div className="max-w-6xl mx-auto px-4">

        {/* ── Three-column layout: Poster | Info | Trailer ── */}
        <motion.div className="grid grid-cols-1 md:grid-cols-[180px_1fr_340px] gap-6 mb-12"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>

          {/* Col 1 — Poster */}
          <div className="w-full md:w-44">
            <PosterHero movie={movie} />
          </div>

          {/* Col 2 — Info */}
          <div className="flex flex-col justify-start pt-1 min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-black leading-tight mb-3"
              style={{ color: 'var(--text-primary)' }}>
              {movie.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {movie.year && (
                <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Calendar size={13} /> {movie.year}
                </span>
              )}
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                <Star size={11} fill="#ffb800" className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">
                  {movie.bayesianAvg?.toFixed(2) ?? movie.avgRating?.toFixed(2)}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  ({(movie.nRatings / 1000).toFixed(0)}k)
                </span>
              </div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-5">
              {movie.genres?.split('|').map(g => (
                <span key={g} className="text-xs px-3 py-1 rounded-full glass border border-yellow-400/20 text-yellow-400/80">{g}</span>
              ))}
            </div>

            {/* Watchlist */}
            <motion.button onClick={handleWatchlist}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all w-fit mb-5',
                inList ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'btn-gold'
              )}>
              <Heart size={15} fill={inList ? 'currentColor' : 'none'} />
              {inList ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </motion.button>

            {/* Platforms */}
            <div className="flex gap-2 mb-6">
              {PLATFORMS.map(p => (
                <a key={p.name} href={p.url(movie.title)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white hover:opacity-80 hover:scale-105 transition-all"
                  style={{ background: p.color }}>
                  <Play size={10} fill="white" /> {p.name}
                </a>
              ))}
            </div>

            {/* Star rating */}
            <div className="glass rounded-xl p-4 border border-yellow-400/10">
              <StarRating movieId={movie.movieId} />
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Ratings improve your recommendations
              </p>
            </div>
          </div>

          {/* Col 3 — Trailer (inline, paused by default) */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--gold)', opacity: 0.6 }}>
              ▶ Trailer
            </p>
            <InlineTrailer title={movie.title} year={movie.year} />
          </div>
        </motion.div>

        {/* Similar movies */}
        {similar.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="font-display text-xl font-bold mb-5 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}>
              🎭 Similar Movies
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {similar.map((m, i) => (
                <motion.div key={m.movieId}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}>
                  <div className="flex flex-col gap-1">
                    <MovieCard movie={m}
                      onClick={m => { softClick(); pageTransition(); navigate(`/movie/${m.movieId}`) }}
                      size="md" />
                    <p className="text-xs truncate px-1" style={{ color: 'var(--text-muted)' }}>{m.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}