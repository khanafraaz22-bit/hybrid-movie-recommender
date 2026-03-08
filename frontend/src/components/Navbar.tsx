import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Film, Search, Heart, LogOut, Sun, Moon, ChevronLeft, Trash2, User } from 'lucide-react'
import { useStore } from '../store'
import { logout, deleteAccount } from '../api'
import { useSounds } from '../hooks/useSounds'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function Navbar() {
  const { user, setUser, theme, toggleTheme, getWatchlist } = useStore()
  const watchlist = getWatchlist()
  const navigate = useNavigate()
  const location = useLocation()
  const { softClick, pageTransition } = useSounds()
  const [showMenu, setShowMenu] = useState(false)

  const showBack = location.pathname !== '/discover'

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
      navigate('/')
      toast.success('Account deleted.')
    } catch {
      toast.error('Failed to delete account.')
    }
  }

  const nav = (to: string) => {
    softClick(); pageTransition(); navigate(to)
  }

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-yellow-400/10"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          {showBack && (
            <motion.button
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { softClick(); navigate(-1) }}
              className="flex items-center gap-1 text-sm text-yellow-400/70 hover:text-yellow-400 transition-colors mr-2"
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </motion.button>
          )}
          <button onClick={() => nav('/discover')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Film size={16} className="text-black" />
            </div>
            <span className="font-display font-bold text-sm hidden sm:inline" style={{ color: 'var(--gold)' }}>
              AK's Cinema
            </span>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => nav('/discover')}
            className="p-2 rounded-lg hover:bg-yellow-400/10 transition-colors text-white/60 hover:text-white"
          >
            <Search size={18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => nav('/watchlist')}
            className="relative p-2 rounded-lg hover:bg-yellow-400/10 transition-colors text-white/60 hover:text-white"
          >
            <Heart size={18} />
            {watchlist.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {watchlist.length > 9 ? '9+' : watchlist.length}
              </span>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { softClick(); toggleTheme() }}
            className="p-2 rounded-lg hover:bg-yellow-400/10 transition-colors text-white/60 hover:text-white"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>

          {user && (
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => { softClick(); setShowMenu(!showMenu) }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-yellow-400/20 text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black text-xs font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm text-white/80">{user.name.split(' ')[0]}</span>
              </motion.button>

              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 top-full mt-2 w-48 glass rounded-xl border border-yellow-400/20 overflow-hidden z-50"
                >
                  <div className="p-3 border-b border-white/5">
                    <p className="text-xs text-white/40">Signed in as</p>
                    <p className="text-sm font-medium text-white/80 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { softClick(); setShowMenu(false); navigate('/profile') }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <User size={14} /> My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} /> Delete account
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  )
}