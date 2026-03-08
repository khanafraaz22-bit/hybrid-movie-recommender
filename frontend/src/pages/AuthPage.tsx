import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Film, Mail, User, Lock, ArrowLeft } from 'lucide-react'
import { useStore } from '../store'
import { login, signup } from '../api'
import { useSounds } from '../hooks/useSounds'
import toast from 'react-hot-toast'

const BLURRED_MOVIES = [
  'Inception', 'The Dark Knight', 'Interstellar', 'Pulp Fiction',
  'The Matrix', 'Fight Club', 'Goodfellas', 'Schindler\'s List'
]

export default function AuthPage() {
  const [mode, setMode]           = useState<'login' | 'signup'>('signup')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})

  const navigate = useNavigate()
  const { setUser } = useStore()
  const { softClick, successSound, pageTransition } = useSounds()

  const validate = () => {
    const e: Record<string, string> = {}
    if (mode === 'signup' && !name.trim()) e.name = 'Name is required'
    if (!email.includes('@')) e.email = 'Enter a valid email'
    if (password.length < 6) e.password = 'Min 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    softClick()
    setLoading(true)
    try {
      const data = mode === 'signup'
        ? await signup(name, email, password)
        : await login(email, password)
      setUser({ ...data })
      successSound()
      toast.success(mode === 'signup' ? `Welcome, ${data.name}! 🎬` : `Welcome back, ${data.name}!`)
      pageTransition()
      setTimeout(() => navigate('/discover'), 400)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    softClick()
    setMode(m => m === 'login' ? 'signup' : 'login')
    setErrors({})
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-dark)' }}>

      {/* Blurred poster mosaic background */}
      <div className="fixed inset-0 z-0 opacity-10">
        <div className="w-full h-full grid grid-cols-4 grid-rows-2">
          {BLURRED_MOVIES.map((m, i) => (
            <div key={i} className="overflow-hidden">
              <div className="w-full h-full shimmer"
                style={{ background: `hsl(${30 + i*20}, 60%, 15%)`, filter: 'blur(8px)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Gradient overlay */}
      <div className="fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(255,140,0,0.06) 0%, transparent 70%)' }} />

      {/* Back button */}
      <motion.button
        className="fixed top-5 left-5 z-20 flex items-center gap-2 text-sm px-3 py-2 glass rounded-xl border border-yellow-400/20 text-white/60 hover:text-yellow-400 transition-colors"
        whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
        onClick={() => { softClick(); navigate('/') }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 150 }}
      >
        {/* Top logo */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="flex items-center gap-3"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg"
              style={{ boxShadow: '0 0 30px rgba(255,184,0,0.4)' }}>
              <Film size={24} className="text-black" />
            </div>
            <span className="font-display font-bold text-xl text-gold-glow">AK's Cinema</span>
          </motion.div>
        </div>

        {/* Form card */}
        <div className="glass rounded-3xl p-8 border border-yellow-400/15"
          style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(255,184,0,0.05)' }}>

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-yellow-400/20 mb-8">
            {(['signup', 'login'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setErrors({}) }}
                className={`flex-1 py-2.5 text-sm font-medium transition-all capitalize ${
                  mode === m
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold'
                    : 'text-white/50 hover:text-white/80'
                }`}>
                {m === 'signup' ? 'Sign Up' : 'Log In'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'signup' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'signup' ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Heading */}
              <div className="mb-6">
                <h2 className="font-display text-2xl font-bold text-white">
                  {mode === 'signup' ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {mode === 'signup'
                    ? 'We use this to remember your movie taste and personalise recommendations.'
                    : 'Sign in to see your personalised picks.'}
                </p>
              </div>

              {/* Name field (signup only) */}
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-medium mb-1.5 text-white/50">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      className={`cinema-input w-full pl-10 pr-4 py-3 text-sm ${errors.name ? 'border-red-500/50' : ''}`}
                      placeholder="Your full name"
                      value={name} onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit()}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                </motion.div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-white/50">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    className={`cinema-input w-full pl-10 pr-4 py-3 text-sm ${errors.email ? 'border-red-500/50' : ''}`}
                    placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-white/50">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={`cinema-input w-full pl-10 pr-10 py-3 text-sm ${errors.password ? 'border-red-500/50' : ''}`}
                    placeholder="Min 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                  />
                  <button onClick={() => { softClick(); setShowPw(!showPw) }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
              </div>

              {/* Submit */}
              <motion.button
                onClick={submit}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="btn-gold w-full py-3.5 mt-2 text-base rounded-xl relative overflow-hidden"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                  </span>
                ) : (
                  <span>{mode === 'signup' ? 'Create Account →' : 'Sign In →'}</span>
                )}
              </motion.button>

              {/* Toggle mode */}
              <p className="text-center text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <button onClick={toggle} className="font-medium hover:underline transition-all"
                  style={{ color: 'var(--gold)' }}>
                  {mode === 'signup' ? 'Log in' : 'Sign up'}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}