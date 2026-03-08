import { useState, useEffect } from 'react'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || ''
const FALLBACK = 'https://via.placeholder.com/300x450/111111/ffb800?text=🎬'

const cache = new Map<string, string>()

export const usePoster = (title: string, year?: number | null) => {
  const [poster, setPoster] = useState<string>(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!title) { setLoading(false); return }

    const key = `${title}-${year}`
    if (cache.has(key)) {
      setPoster(cache.get(key)!)
      setLoading(false)
      return
    }

    if (!TMDB_API_KEY) {
      // No API key — use a deterministic placeholder with movie title
      const color = intToHex(hashCode(title))
      const url = `https://via.placeholder.com/300x450/${color}/ffffff?text=${encodeURIComponent(title.slice(0, 15))}`
      cache.set(key, url)
      setPoster(url)
      setLoading(false)
      return
    }

    const query = encodeURIComponent(title)
    const yearParam = year ? `&year=${year}` : ''
    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}${yearParam}`)
      .then(r => r.json())
      .then(data => {
        const path = data.results?.[0]?.poster_path
        const url = path
          ? `https://image.tmdb.org/t/p/w342${path}`
          : FALLBACK
        cache.set(key, url)
        setPoster(url)
      })
      .catch(() => setPoster(FALLBACK))
      .finally(() => setLoading(false))
  }, [title, year])

  return { poster, loading }
}

function hashCode(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
function intToHex(n: number) {
  return ((n & 0xffffff) | 0x202020).toString(16).padStart(6, '0')
}