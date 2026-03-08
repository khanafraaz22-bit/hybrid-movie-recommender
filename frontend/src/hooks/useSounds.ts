import { useCallback } from 'react'

// Generate soft click sounds using Web Audio API — no files needed
const createAudioContext = () => {
  if (typeof window === 'undefined') return null
  return new (window.AudioContext || (window as any).webkitAudioContext)()
}

let ctx: AudioContext | null = null

const getCtx = () => {
  if (!ctx) ctx = createAudioContext()
  return ctx
}

const playTone = (freq: number, duration: number, gain: number, type: OscillatorType = 'sine') => {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gainNode = c.createGain()
  osc.connect(gainNode)
  gainNode.connect(c.destination)
  osc.frequency.value = freq
  osc.type = type
  gainNode.gain.setValueAtTime(gain, c.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  osc.start(c.currentTime)
  osc.stop(c.currentTime + duration)
}

export const useSounds = () => {
  const softClick = useCallback(() => {
    playTone(800, 0.08, 0.1, 'sine')
  }, [])

  const heartSound = useCallback(() => {
    playTone(523, 0.1, 0.12, 'sine')
    setTimeout(() => playTone(659, 0.15, 0.1, 'sine'), 80)
  }, [])

  const pageTransition = useCallback(() => {
    playTone(400, 0.2, 0.07, 'sine')
  }, [])

  const successSound = useCallback(() => {
    playTone(523, 0.1, 0.1, 'sine')
    setTimeout(() => playTone(659, 0.1, 0.1, 'sine'), 100)
    setTimeout(() => playTone(784, 0.2, 0.1, 'sine'), 200)
  }, [])

  return { softClick, heartSound, pageTransition, successSound }
}