import { useEffect, useRef } from 'react'
import { useStore } from '../store'

export default function CursorTrail() {
  const cursorRef  = useRef<HTMLDivElement>(null)
  const ringRef    = useRef<HTMLDivElement>(null)
  const trailsRef  = useRef<HTMLDivElement[]>([])
  const posRef     = useRef({ x: 0, y: 0 })
  const ringPos    = useRef({ x: 0, y: 0 })
  const { theme }  = useStore()

  useEffect(() => {
    const cursor = cursorRef.current!
    const ring   = ringRef.current!
    const gold   = '#ffb800'

    const move = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY }
      cursor.style.left = `${e.clientX}px`
      cursor.style.top  = `${e.clientY}px`

      // Spawn trail dot
      const dot = document.createElement('div')
      dot.style.cssText = `
        position:fixed; border-radius:50%; pointer-events:none; z-index:9998;
        width:6px; height:6px; mix-blend-mode:screen;
        background:${gold}; opacity:0.6;
        left:${e.clientX - 3}px; top:${e.clientY - 3}px;
        transition: opacity 0.4s, transform 0.4s;
      `
      document.body.appendChild(dot)
      setTimeout(() => { dot.style.opacity = '0'; dot.style.transform = 'scale(0)' }, 10)
      setTimeout(() => { dot.remove() }, 450)
    }

    const down = () => { cursor.style.transform = 'translate(-50%,-50%) scale(0.6)'; ring.style.transform = 'translate(-50%,-50%) scale(0.8)' }
    const up   = () => { cursor.style.transform = 'translate(-50%,-50%) scale(1)';   ring.style.transform = 'translate(-50%,-50%) scale(1)' }

    let raf: number
    const animateRing = () => {
      ringPos.current.x += (posRef.current.x - ringPos.current.x) * 0.12
      ringPos.current.y += (posRef.current.y - ringPos.current.y) * 0.12
      ring.style.left = `${ringPos.current.x}px`
      ring.style.top  = `${ringPos.current.y}px`
      raf = requestAnimationFrame(animateRing)
    }
    animateRing()

    window.addEventListener('mousemove', move)
    window.addEventListener('mousedown', down)
    window.addEventListener('mouseup',   up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup',   up)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      {/* Main dot */}
      <div ref={cursorRef} className="cursor-dot"
        style={{ width: 10, height: 10, background: '#ffb800', left: -20, top: -20,
          transform: 'translate(-50%,-50%)', boxShadow: '0 0 8px #ffb800' }} />
      {/* Trailing ring */}
      <div ref={ringRef} className="cursor-dot"
        style={{ width: 32, height: 32, border: '1.5px solid rgba(255,184,0,0.5)',
          background: 'transparent', left: -20, top: -20, transform: 'translate(-50%,-50%)' }} />
    </>
  )
}