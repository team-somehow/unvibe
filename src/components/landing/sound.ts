import type { PlayerRef } from '@remotion/player'
import { createContext, useContext, type SyntheticEvent } from 'react'

/** Page-wide sound state. `ready` turns true on the first "sound on" gesture and never goes back. */
export type LandingSound = {
  on: boolean
  ready: boolean
  /** Call inside the click handler: commits synchronously so the remounted Player can be blessed in the same gesture. */
  set: (on: boolean) => void
}

export const SoundCtx = createContext<LandingSound>({ on: false, ready: false, set: () => {} })
export const useLandingSound = () => useContext(SoundCtx)

/**
 * Inside a user gesture: (re)start the player's audio tags so Safari lets them play. `playing` says whether
 * the reel should keep playing afterwards; otherwise it is primed with a silent play/pause.
 */
export function blessPlayer(p: PlayerRef | null, e: SyntheticEvent, playing: boolean) {
  if (!p) return
  try {
    p.unmute()
    if (playing) {
      if (p.isPlaying()) p.pause()
      p.play(e)
    } else {
      const f = p.getCurrentFrame()
      p.play(e)
      p.pause()
      p.seekTo(f)
    }
  } catch {
    // best effort; a sound toggle must never throw
  }
}

export function playSfx(name: 'pop' | 'success', volume = 0.35) {
  try {
    const a = new Audio()
    a.crossOrigin = 'anonymous'
    a.src = `/audio/shared/sfx-${name}.mp3`
    a.volume = volume
    void a.play().catch(() => {})
  } catch {
    // optional
  }
}
