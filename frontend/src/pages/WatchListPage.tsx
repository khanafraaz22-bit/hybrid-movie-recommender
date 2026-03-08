import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { useSounds } from '../hooks/useSounds'
import { usePoster } from '../hooks/usePoster'
import { removeWatchlist } from '../api'
import type { Movie } from '../types'

function WatchlistItem({ movie, onRemove }: { movie: Movie; onRemove: () => void }) {
  const { poster } = usePoster(movie.title, movie.year)
  const navigate = useNavigate()
  const { softClick, pageTransition } = useSounds()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className="glass rounded-xl overflow-hidden border border-yellow-400/10 hover:border-yellow-400/25 transition-colors flex items-center gap-4 p-3 cursor-pointer group"
      onClick={() => { softClick(); pageTransition(); navigate(`/movie/${movie.movieId}`) }}
    >
      <img src={poster} alt={movie.title}
        className="w-12 h-16 object-cover rounded-lg shrink-0"
        onError={e => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/60x80/111/ffb800?text=🎬` }}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-sm truncate">{movie.title}</h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
          {movie.genres?.split('|').slice(0, 2).join(' · ')}
          {movie.year && ` · ${movie.year}`}
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-all"
      >
        <Trash2 size={16} />
      </motion.button>
    </motion.div>
  )
}

export default function WatchlistPage() {
  const { removeWatchlist: removeLocal, getWatchlist } = useStore()
  const { heartSound } = useSounds()
  const watchlist = getWatchlist()

  const handleRemove = async (movie: Movie) => {
    heartSound()
    removeLocal(movie.movieId)
    try { await removeWatchlist(movie.movieId) } catch {}
  }

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: 'var(--bg-dark)' }}>
      <div className="max-w-2xl mx-auto px-4">
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Heart size={28} className="text-red-400" fill="currentColor" />
            My Watchlist
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {watchlist.length} {watchlist.length === 1 ? 'movie' : 'movies'} saved
          </p>
        </motion.div>

        <AnimatePresence mode="popLayout">
          {watchlist.length === 0 ? (
            <motion.div
              key="empty"
              className="flex flex-col items-center justify-center py-24 gap-4 text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl"
              >
                🍿
              </motion.div>
              <p className="font-display text-xl">Your watchlist is empty</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Add movies by clicking the heart icon on any movie card
              </p>
            </motion.div>
          ) : (
            <motion.div className="space-y-3" layout>
              {watchlist.map(m => (
                <WatchlistItem key={m.movieId} movie={m} onRemove={() => handleRemove(m)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}