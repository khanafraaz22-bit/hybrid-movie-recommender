import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Star, Play, Info } from 'lucide-react'
import { useStore } from '../store'
import { usePoster } from '../hooks/usePoster'
import { useSounds } from '../hooks/useSounds'
import { addWatchlist, removeWatchlist } from '../api'
import type { Movie } from '../types'
import clsx from 'clsx'

interface Props {
  movie:    Movie
  onClick?: (m: Movie) => void
  size?:    'sm' | 'md' | 'lg'
}

export default function MovieCard({ movie, onClick, size = 'md' }: Props) {
  const { poster, loading } = usePoster(movie.title, movie.year)
  const { isInWatchlist, addToWatchlist, removeWatchlist: removeLocal, getWatchlist } = useStore()
  const { softClick, heartSound } = useSounds()
  const [heartAnim, setHeartAnim] = useState(false)
  const [sparkles, setSparkles] = useState<number[]>([])
  const inList = isInWatchlist(movie.movieId)

  const handleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation()
    heartSound()
    if (inList) {
      removeLocal(movie.movieId)
      try { await removeWatchlist(movie.movieId) } catch {}
    } else {
      addToWatchlist(movie)
      setHeartAnim(true)
      setSparkles([1, 2, 3, 4, 5])
      setTimeout(() => { setHeartAnim(false); setSparkles([]) }, 600)
      try { await addWatchlist(movie.movieId) } catch {}
    }
  }

  const genres = movie.genres?.split('|').slice(0, 2) ?? []

  const heights = { sm: 'h-56', md: 'h-72', lg: 'h-96' }

  return (
    <motion.div
      className={clsx('movie-card group', heights[size])}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => { softClick(); onClick?.(movie) }}
    >
      {/* Poster */}
      <div className="relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="w-full h-full shimmer" />
        ) : (
          <img
            src={poster}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://via.placeholder.com/300x450/111111/ffb800?text=${encodeURIComponent(movie.title.slice(0,12))}`
            }}
          />
        )}

        {/* Gradient overlay */}
        <div className="overlay" />

        {/* Score badge */}
        {movie.score && (
          <div className="absolute top-2 right-2 glass px-2 py-1 rounded-full flex items-center gap-1 text-xs font-semibold text-yellow-400">
            <Star size={10} fill="currentColor" />
            {(movie.score * 2).toFixed(1)}
          </div>
        )}

        {/* Content on hover */}
        <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-white font-display font-bold text-sm leading-tight mb-1 drop-shadow-lg line-clamp-2">
            {movie.title}
          </h3>

          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {genres.map(g => (
              <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 text-yellow-400 border border-yellow-400/30">
                {g}
              </span>
            ))}
            {movie.year && (
              <span className="text-[10px] text-white/60">{movie.year}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-yellow-400/90 text-black text-xs font-semibold hover:bg-yellow-300 transition-colors"
              onClick={(e) => { e.stopPropagation(); softClick(); onClick?.(movie) }}
            >
              <Play size={12} fill="currentColor" />
              View
            </button>

            {/* Watchlist button */}
            <motion.button
              className={clsx(
                'relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                inList
                  ? 'bg-red-500/90 text-white'
                  : 'bg-black/50 text-white/70 hover:text-red-400 border border-white/20'
              )}
              onClick={handleWatchlist}
              animate={heartAnim ? { scale: [1, 1.4, 0.9, 1] } : {}}
              transition={{ duration: 0.4 }}
            >
              <Heart size={14} fill={inList ? 'currentColor' : 'none'} />

              {/* Sparkles */}
              <AnimatePresence>
                {sparkles.map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-yellow-400"
                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                    animate={{
                      scale: [0, 1, 0],
                      x: Math.cos((i / sparkles.length) * Math.PI * 2) * 20,
                      y: Math.sin((i / sparkles.length) * Math.PI * 2) * 20,
                      opacity: [1, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                ))}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Watchlist indicator when not hovering */}
        {inList && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <Heart size={10} fill="white" className="text-white" />
          </div>
        )}
      </div>
    </motion.div>
  )
}