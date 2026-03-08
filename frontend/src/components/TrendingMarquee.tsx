import { motion } from 'framer-motion'
import type { Movie } from '../types'
import { usePoster } from '../hooks/usePoster'
import { useNavigate } from 'react-router-dom'
import { useSounds } from '../hooks/useSounds'

function MarqueeItem({ movie }: { movie: Movie }) {
  const { poster } = usePoster(movie.title, movie.year)
  const navigate   = useNavigate()
  const { softClick, pageTransition } = useSounds()

  return (
    <motion.div
      className="flex items-center gap-3 mx-6 shrink-0 cursor-pointer group"
      whileHover={{ scale: 1.05 }}
      onClick={() => { softClick(); pageTransition(); navigate(`/movie/${movie.movieId}`) }}
    >
      <img src={poster} alt={movie.title}
        className="w-10 h-14 object-cover rounded-lg shadow-lg group-hover:shadow-yellow-400/20 transition-shadow"
        onError={e => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/40x56/111/ffb800?text=🎬` }}
      />
      <div>
        <p className="text-sm font-medium leading-tight group-hover:text-yellow-400 transition-colors"
          style={{ color: 'var(--text-primary)', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {movie.title}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{movie.year}</p>
      </div>
      <span className="text-yellow-400/30 ml-2 text-lg">✦</span>
    </motion.div>
  )
}

export default function TrendingMarquee({ movies }: { movies: Movie[] }) {
  if (!movies || !movies.length) return null
  const doubled = [...movies, ...movies]

  return (
    <div className="py-3 border-y glass overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 mb-1 px-4">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--gold)', opacity: 0.6 }}>
          ✦ Now Trending
        </span>
      </div>
      <div className="flex animate-marquee">
        {doubled.map((m, i) => <MarqueeItem key={`${m.movieId}-${i}`} movie={m} />)}
      </div>
    </div>
  )
}