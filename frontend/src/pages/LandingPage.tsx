import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useStore } from '../store'
import { useSounds } from '../hooks/useSounds'

// ── Starry night with shooting stars ─────────────────────────────
function StarryNight() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    // Static stars
    const stars = Array.from({ length: 280 }, () => ({
      x:   Math.random() * canvas.width,
      y:   Math.random() * canvas.height,
      r:   Math.random() * 1.6 + 0.2,
      a:   Math.random(),
      spd: Math.random() * 0.004 + 0.001,
      dir: Math.random() > 0.5 ? 1 : -1,
    }))

    // Shooting stars
    type Shoot = { x: number; y: number; len: number; spd: number; angle: number; a: number; active: boolean; timer: number }
    const shoots: Shoot[] = Array.from({ length: 5 }, () => ({
      x: 0, y: 0, len: 0, spd: 0, angle: 0, a: 0, active: false, timer: Math.random() * 300
    }))

    const resetShoot = (s: Shoot) => {
      s.x     = Math.random() * canvas.width * 0.7
      s.y     = Math.random() * canvas.height * 0.4
      s.len   = Math.random() * 180 + 80
      s.spd   = Math.random() * 14 + 8
      s.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3
      s.a     = 1
      s.active= true
      s.timer = Math.random() * 400 + 200
    }

    let raf: number
    const draw = () => {
      // Deep night sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
      grad.addColorStop(0,   '#000008')
      grad.addColorStop(0.5, '#050510')
      grad.addColorStop(1,   '#0a0520')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Twinkle stars
      for (const s of stars) {
        s.a += s.spd * s.dir
        if (s.a > 1 || s.a < 0.1) s.dir *= -1
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220, 210, 255, ${s.a})`
        ctx.fill()
      }

      // Shooting stars
      for (const s of shoots) {
        if (!s.active) {
          s.timer--
          if (s.timer <= 0) resetShoot(s)
          continue
        }
        s.x += Math.cos(s.angle) * s.spd
        s.y += Math.sin(s.angle) * s.spd
        s.a -= 0.025

        if (s.a <= 0 || s.x > canvas.width || s.y > canvas.height) {
          s.active = false
          s.timer  = Math.random() * 400 + 200
          continue
        }

        const tail = ctx.createLinearGradient(
          s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len,
          s.x, s.y
        )
        tail.addColorStop(0, `rgba(255,255,255,0)`)
        tail.addColorStop(1, `rgba(255,240,200,${s.a})`)

        ctx.beginPath()
        ctx.moveTo(s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len)
        ctx.lineTo(s.x, s.y)
        ctx.strokeStyle = tail
        ctx.lineWidth   = 2
        ctx.stroke()

        // Bright head
        ctx.beginPath()
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,220,${s.a})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />
}

// ── Sunrise with animated birds ───────────────────────────────────
function SunriseBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Sky gradient — pre-dawn to warm morning */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #1a0a2e 0%, #3d1a5e 15%, #8b3a7a 30%, #d46a3a 50%, #f0a050 65%, #ffd080 80%, #fff4cc 100%)'
      }} />

      {/* Sun rising */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: '18%' }}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 3, ease: 'easeOut' }}
      >
        {/* Sun glow */}
        <div className="absolute inset-0 rounded-full" style={{
          width: '160px', height: '160px',
          background: 'radial-gradient(circle, rgba(255,220,80,0.8), rgba(255,150,30,0.3) 60%, transparent 80%)',
          filter: 'blur(20px)',
          transform: 'translate(-50%, -50%) scale(2.5)',
          top: '50%', left: '50%'
        }} />
        {/* Sun disk */}
        <div className="w-20 h-20 rounded-full" style={{
          background: 'radial-gradient(circle at 40% 40%, #fff5a0, #ffcc00 50%, #ff8c00)',
          boxShadow: '0 0 60px rgba(255,200,0,0.8), 0 0 120px rgba(255,150,0,0.4)'
        }} />
      </motion.div>

      {/* Horizon glow */}
      <div className="absolute bottom-0 left-0 right-0 h-48" style={{
        background: 'linear-gradient(to top, rgba(255,160,50,0.5), transparent)',
        filter: 'blur(20px)'
      }} />

      {/* Clouds */}
      {[
        { w: 220, h: 55, top: '22%', left: '-5%', dur: 25, delay: 0 },
        { w: 160, h: 40, top: '30%', left: '60%', dur: 30, delay: 4 },
        { w: 280, h: 65, top: '40%', left: '20%', dur: 22, delay: 8 },
        { w: 130, h: 35, top: '18%', left: '40%', dur: 35, delay: 2 },
      ].map((c, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{
            width: c.w, height: c.h, top: c.top, left: c.left,
            background: 'rgba(255,255,255,0.25)',
            filter: 'blur(14px)',
          }}
          animate={{ x: [0, 50, 0] }}
          transition={{ duration: c.dur, repeat: Infinity, ease: 'easeInOut', delay: c.delay }}
        />
      ))}

      {/* Birds — animated SVG paths */}
      {[
        { x: '10%', y: '35%', scale: 1.0, delay: 0,   dur: 18 },
        { x: '15%', y: '32%', scale: 0.8, delay: 0.5, dur: 20 },
        { x: '20%', y: '38%', scale: 0.7, delay: 1,   dur: 22 },
        { x: '60%', y: '28%', scale: 0.9, delay: 2,   dur: 16 },
        { x: '65%', y: '25%', scale: 0.7, delay: 2.5, dur: 19 },
        { x: '70%', y: '30%', scale: 0.6, delay: 3,   dur: 21 },
        { x: '40%', y: '20%', scale: 1.1, delay: 1.5, dur: 24 },
      ].map((b, i) => (
        <motion.div key={i} className="absolute"
          style={{ left: b.x, top: b.y, scale: b.scale }}
          animate={{
            x:    [0, 120, 260, 420, 600],
            y:    [0, -15, 5, -10, 0],
          }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'linear', delay: b.delay }}
        >
          {/* Simple bird shape */}
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
            <path d="M12 6 Q6 0 0 3 Q6 4 12 6 Q18 4 24 3 Q18 0 12 6Z"
              fill="rgba(30,10,60,0.75)" />
          </svg>
        </motion.div>
      ))}
    </div>
  )
}

const QUOTES = [
  "Every movie finds its audience. Let us find yours.",
  "Great stories deserve to be discovered.",
  "Your next favourite film is one click away.",
  "Cinema is a mirror by which we see ourselves.",
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { user, theme, toggleTheme } = useStore()
  const { softClick, pageTransition } = useSounds()
  const [exiting, setExiting]   = useState(false)
  const dark  = theme === 'dark'
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]

  useEffect(() => { if (user) navigate('/discover') }, [user])

  const enter = () => {
    softClick(); pageTransition()
    setExiting(true)
    setTimeout(() => navigate('/auth'), 700)
  }

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.7 }}
        >
          {/* Background */}
          {dark ? <StarryNight /> : <SunriseBackground />}

          {/* Theme toggle — top right */}
          <motion.button
            className="fixed top-5 right-5 z-50 p-3 rounded-full glass border border-white/20 hover:border-yellow-400/50 transition-all"
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
            onClick={() => { softClick(); toggleTheme() }}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark
              ? <Sun size={20} className="text-yellow-300" />
              : <Moon size={20} className="text-indigo-800" />
            }
          </motion.button>

          {/* Central glow */}
          <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[600px] rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, rgba(255,184,0,0.5), transparent 70%)', filter: 'blur(80px)' }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 gap-8 max-w-3xl">

            <motion.div
              initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-6xl animate-float"
            >
              🎬
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.9 }}
            >
              <p className="text-sm font-mono uppercase tracking-[0.4em] mb-3"
                style={{ color: dark ? 'rgba(255,184,0,0.8)' : 'rgba(80,30,120,0.8)' }}>
                A.K. Presents
              </p>
              <h1
                className="font-display font-black leading-none"
                style={{
                  fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
                  lineHeight: 1.1,
                  color: dark ? '#ffcc55' : '#2d0a5e',
                  textShadow: dark
                    ? '0 0 30px rgba(255,184,0,0.5), 0 0 60px rgba(255,184,0,0.2)'
                    : '0 0 30px rgba(255,180,0,0.3)',
                }}
              >
                AK's Hybrid
                <br />
                <span className="italic">Movie Recommender</span>
              </h1>
              <p className="mt-4 text-base font-light max-w-lg mx-auto"
                style={{ color: dark ? 'rgba(200,190,255,0.5)' : 'rgba(60,20,100,0.55)' }}>
                Four models. Perfect recommendations.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.6, type: 'spring', stiffness: 200 }}
            >
              <motion.button
                onClick={enter}
                whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.95 }}
                className="btn-gold animate-pulse-glow px-10 py-4 text-lg font-display font-bold rounded-2xl relative overflow-hidden"
                style={{ letterSpacing: '0.05em' }}
              >
                <span className="absolute inset-0 shimmer opacity-30 rounded-2xl" />
                <span className="relative z-10 flex items-center gap-3">
                  Enter the Cinema <span className="text-xl">→</span>
                </span>
              </motion.button>
            </motion.div>

            <motion.div
              className="flex items-center gap-3 w-48"
              style={{ opacity: 0.3 }}
              initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 1 }}
            >
              <div className="flex-1 h-px"
                style={{ background: dark ? 'rgba(255,220,150,0.5)' : 'rgba(80,30,120,0.4)' }} />
              <span style={{ color: dark ? 'rgba(255,220,150,0.7)' : 'rgba(80,30,120,0.6)' }}>✦</span>
              <div className="flex-1 h-px"
                style={{ background: dark ? 'rgba(255,220,150,0.5)' : 'rgba(80,30,120,0.4)' }} />
            </motion.div>
          </div>

          {/* Bottom quote */}
          <motion.div
            className="fixed bottom-8 left-0 right-0 text-center px-4 z-10"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <p className="font-display italic text-base"
              style={{ color: dark ? 'rgba(200,190,255,0.45)' : 'rgba(60,20,100,0.5)' }}>
              "{quote}"
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}