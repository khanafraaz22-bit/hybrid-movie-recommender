import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Brain, BarChart3, ChevronDown, ChevronUp, FlaskConical, Eye, EyeOff, Info } from 'lucide-react'
import MovieCard from '../components/MovieCard'
import { getRecommendations, getPerModelRecs } from '../api'
import { useStore } from '../store'
import { useSounds } from '../hooks/useSounds'
import { usePoster } from '../hooks/usePoster'
import type { Movie } from '../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Score bar ─────────────────────────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = ((value - 0.5) / 4.5) * 100
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2 }} />
      </div>
      <span className="w-8" style={{ color: 'var(--text-muted)' }}>{value.toFixed(2)}</span>
    </div>
  )
}

// ── Why chip ──────────────────────────────────────────────────────
function WhyChip({ reason }: { reason: string }) {
  return (
    <motion.div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium w-fit"
      style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)', color: 'rgba(255,184,0,0.9)' }}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
    >
      <Info size={10} /> {reason}
    </motion.div>
  )
}

// ── Hero recommendation card ──────────────────────────────────────
function HeroCard({ movie, rank }: { movie: Movie & { why_reason?: string }; rank: number }) {
  const { poster }    = usePoster(movie.title, movie.year)
  const [showScores, setShowScores] = useState(false)
  const { addToWatchlist, removeWatchlist, isInWatchlist } = useStore()
  const { heartSound, softClick } = useSounds()
  const inList  = isInWatchlist(movie.movieId)
  const navigate = useNavigate()

  const PLATFORMS = [
    { name: 'Netflix',   color: '#e50914', url: `https://www.netflix.com/search?q=${encodeURIComponent(movie.title)}` },
    { name: 'Prime',     color: '#00a8e1', url: `https://www.amazon.com/s?k=${encodeURIComponent(movie.title)}&i=instant-video` },
    { name: 'JustWatch', color: '#FFA500', url: `https://www.justwatch.com/in/search?q=${encodeURIComponent(movie.title)}` },
  ]

  return (
    <motion.div
      className="glass rounded-2xl overflow-hidden border border-yellow-400/15 hover:border-yellow-400/30 transition-colors"
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.08 }}
      whileHover={{ y: -4 }}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Poster */}
        <div className="relative sm:w-36 shrink-0 aspect-[2/3] sm:aspect-auto">
          <img src={poster} alt={movie.title} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/150x220/111/ffb800?text=🎬` }} />
          <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black text-xs font-black shadow-lg">
            #{rank + 1}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-display text-lg font-bold leading-tight mb-1 truncate"
              style={{ color: 'var(--text-primary)' }}>{movie.title}</h3>
            <div className="flex flex-wrap gap-1 mb-2">
              {movie.genres?.split('|').slice(0, 3).map(g => (
                <span key={g} className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/30 text-yellow-400/80">{g}</span>
              ))}
              {movie.year && <span className="text-[10px] px-1" style={{ color: 'var(--text-muted)' }}>{movie.year}</span>}
            </div>

            {/* Why chip */}
            {movie.why_reason && <div className="mb-3"><WhyChip reason={movie.why_reason} /></div>}

            {/* Match score */}
            {movie.score && (
              <div className="flex items-center gap-2 mb-3">
                <div className="text-2xl font-black font-mono" style={{ color: 'var(--gold)' }}>
                  {(movie.score * 20).toFixed(0)}%
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Match</div>
              </div>
            )}

            {/* Platform links */}
            <div className="flex gap-1.5 mb-3">
              {PLATFORMS.map(p => (
                <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-white hover:opacity-80 transition-opacity"
                  style={{ background: p.color }}>
                  {p.name}
                </a>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { softClick(); navigate(`/movie/${movie.movieId}`) }}
              className="px-3 py-1.5 rounded-lg glass border border-yellow-400/20 text-xs font-medium hover:border-yellow-400/50 transition-all"
              style={{ color: 'var(--gold)' }}>
              View Details
            </button>
            <motion.button
              onClick={() => { heartSound(); inList ? removeWatchlist(movie.movieId) : addToWatchlist(movie) }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
                inList ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                       : 'bg-white/5 border border-white/10 text-white/60 hover:border-red-400/40 hover:text-red-400'
              )}>
              {inList ? '❤️ Saved' : '🤍 Watchlist'}
            </motion.button>
            <button onClick={() => { softClick(); setShowScores(s => !s) }}
              className="px-3 py-1.5 rounded-lg glass border border-white/10 text-xs text-white/40 hover:text-white/70 transition-all flex items-center gap-1">
              <BarChart3 size={12} /> Scores {showScores ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>

          {/* Score breakdown */}
          <AnimatePresence>
            {showScores && (movie as any).mf_score != null && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Model Breakdown</p>
                <ScoreBar label="FunkSVD" value={(movie as any).mf_score}      color="#ffb800" />
                <ScoreBar label="BPR"     value={(movie as any).bpr_score}     color="#00a8e1" />
                <ScoreBar label="NeuMF"   value={(movie as any).neural_score}  color="#a855f7" />
                <ScoreBar label="Content" value={(movie as any).content_score} color="#22c55e" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── A/B Model Comparison Panel ────────────────────────────────────
const MODEL_META = {
  mf:     { label: 'FunkSVD',  color: '#ffb800', desc: 'Matrix Factorisation — learns latent user & movie factors from 20M ratings' },
  bpr:    { label: 'BPR',      color: '#00a8e1', desc: 'Bayesian Personalised Ranking — optimised for pairwise ranking over implicit feedback' },
  neural: { label: 'NeuMF',    color: '#a855f7', desc: 'Neural Matrix Factorisation — deep non-linear interactions between user and movie embeddings' },
  hybrid: { label: 'Hybrid ✦', color: '#f97316', desc: 'Weighted blend of all 4 models — the final recommendation signal' },
}

function ABPanel() {
  const [data, setData]         = useState<Record<string, any[]> | null>(null)
  const [loading, setLoading]   = useState(true)
  const [activeModel, setActiveModel] = useState<'mf' | 'bpr' | 'neural' | 'hybrid'>('hybrid')
  const navigate = useNavigate()
  const { softClick, pageTransition } = useSounds()

  useEffect(() => {
    getPerModelRecs()
      .then(setData)
      .catch(() => toast.error('Could not load model comparison'))
      .finally(() => setLoading(false))
  }, [])

  const movies = data?.[activeModel] ?? []

  return (
    <div className="glass rounded-2xl border border-yellow-400/10 overflow-hidden">
      {/* Model selector tabs */}
      <div className="flex border-b border-white/5 overflow-x-auto">
        {(Object.entries(MODEL_META) as [string, typeof MODEL_META.mf][]).map(([key, meta]) => (
          <button key={key}
            onClick={() => { softClick(); setActiveModel(key as any) }}
            className={clsx(
              'flex-1 min-w-[100px] px-4 py-3 text-xs font-semibold transition-all whitespace-nowrap border-b-2',
              activeModel === key
                ? 'border-b-2 text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            )}
            style={{ borderBottomColor: activeModel === key ? meta.color : 'transparent',
                     background: activeModel === key ? `${meta.color}15` : 'transparent' }}>
            <span style={{ color: activeModel === key ? meta.color : undefined }}>{meta.label}</span>
          </button>
        ))}
      </div>

      {/* Model description */}
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {MODEL_META[activeModel].desc}
        </p>
      </div>

      {/* Movie grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4">
          {movies.map((m: any, i: number) => (
            <motion.div key={m.movieId}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              <div className="flex flex-col gap-1 cursor-pointer"
                onClick={() => { softClick(); pageTransition(); navigate(`/movie/${m.movieId}`) }}>
                <MovieCard movie={m} onClick={() => {}} size="md" />
                <div className="px-0.5">
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{m.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: MODEL_META[activeModel].color }} />
                    <span className="text-[10px] font-mono" style={{ color: MODEL_META[activeModel].color }}>
                      {m.model_score?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function RecommendationsPage() {
  const [recs, setRecs]         = useState<Movie[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAB, setShowAB]     = useState(false)
  const { user }                = useStore()
  const navigate                = useNavigate()
  const { softClick, pageTransition } = useSounds()

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    getRecommendations()
      .then(data => setRecs(data.recommendations || []))
      .catch(() => toast.error('Could not load recommendations'))
      .finally(() => setLoading(false))
  }, [user])

  const top5 = recs.slice(0, 5)
  const rest  = recs.slice(5)

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: 'var(--bg-dark)' }}>
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Brain size={16} className="text-black" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Your Picks</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Personalised by 4 AI models working together
                </p>
              </div>
            </div>

            {/* A/B toggle */}
            <motion.button
              onClick={() => { softClick(); setShowAB(v => !v) }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                showAB
                  ? 'border-purple-500/50 text-purple-400 bg-purple-500/10'
                  : 'border-white/10 text-white/50 hover:border-purple-500/30 hover:text-purple-400 glass'
              )}>
              <FlaskConical size={15} />
              Model Comparison
              {showAB ? <EyeOff size={13} /> : <Eye size={13} />}
            </motion.button>
          </div>
        </motion.div>

        {/* A/B Panel — collapsible */}
        <AnimatePresence>
          {showAB && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-10 overflow-hidden">
              <div className="mb-3 flex items-center gap-2">
                <FlaskConical size={16} style={{ color: '#a855f7' }} />
                <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Model Comparison — Top 10 per Model
                </h2>
              </div>
              <ABPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-40 rounded-2xl shimmer" />)}
          </div>
        ) : (
          <>
            {/* Top 5 hero */}
            <div className="mb-10">
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}>
                <Sparkles size={16} style={{ color: 'var(--gold)' }} /> Top Recommendations
              </h2>
              <div className="space-y-4">
                {top5.map((m, i) => <HeroCard key={m.movieId} movie={m as any} rank={i} />)}
              </div>
            </div>

            {/* You may also like */}
            {rest.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}>
                  🍿 You May Also Like
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {rest.map((m, i) => (
                    <motion.div key={m.movieId}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}>
                      <div className="flex flex-col gap-1">
                        <MovieCard movie={m}
                          onClick={m => { softClick(); pageTransition(); navigate(`/movie/${m.movieId}`) }}
                          size="md" />
                        <p className="text-xs truncate px-1" style={{ color: 'var(--text-muted)' }}>{m.title}</p>
                        {(m as any).why_reason && (
                          <p className="text-[10px] px-1 truncate" style={{ color: 'rgba(255,184,0,0.6)' }}>
                            ✦ {(m as any).why_reason}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}