import type { PlayerRef } from '@remotion/player'
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { flushSync } from 'react-dom'
import { KEYS, readPref, writePref } from './storage'

/*
 * Browsers only let media play with sound after a user gesture, and Safari wants the actual
 * `play()` call to happen inside that gesture. Remotion's Player supports this through shared
 * audio tags: calling `player.play(event)` from a gesture "blesses" its tags for later use.
 * Every mounted ReelPlayer registers here so a tap anywhere in the feed can bless them.
 *
 * Remotion detail that shapes this file: a Player that mounts muted only creates its AudioContext
 * the first time it is unmuted, and that swap orphans the <Audio> tags already playing (voice and
 * music go silent until they remount). So the first gesture flips a global "audio unlocked" flag,
 * ReelPlayer remounts once (keeping its frame) with the AudioContext created up front, and only
 * then do we bless the new tags, all inside the same gesture.
 */

type Entry = { ref: { current: PlayerRef | null }; isActive: () => boolean; primed: boolean }
const players = new Set<Entry>()

export function registerPlayer(ref: Entry['ref'], isActive: () => boolean) {
  const entry: Entry = { ref, isActive, primed: false }
  players.add(entry)
  return () => {
    players.delete(entry)
  }
}

let audioUnlocked = false
const unlockListeners = new Set<() => void>()

export function subscribeAudioUnlock(cb: () => void) {
  unlockListeners.add(cb)
  return () => {
    unlockListeners.delete(cb)
  }
}

export function isAudioUnlocked() {
  return audioUnlocked
}

function markAudioUnlocked() {
  if (audioUnlocked) return
  audioUnlocked = true
  unlockListeners.forEach((l) => l())
}

/**
 * Call synchronously inside a user gesture. The reel on screen (re)starts its audio tags inside the
 * gesture; with `restartActive` it does so even if it is already playing (the moment sound is
 * switched on). Mounted reels that are not playing are primed once with a silent play/pause (they
 * are muted while off screen), so they can play with sound when the user scrolls to them.
 */
export function unlockAudio(ev?: Event | SyntheticEvent, { restartActive = false } = {}) {
  const token = (ev ?? ({} as Event)) as unknown as SyntheticEvent
  for (const en of players) {
    const p = en.ref.current
    if (!p) continue
    try {
      if (en.isActive()) {
        if (!p.isPlaying()) p.play(token)
        else if (restartActive) {
          p.pause()
          p.play(token)
        }
        en.primed = true
      } else if (!en.primed && !p.isPlaying()) {
        const frame = p.getCurrentFrame()
        p.play(token)
        p.pause()
        p.seekTo(frame)
        en.primed = true
      }
    } catch {
      // Priming is best effort; it must never break a tap.
    }
  }
}

export type FeedSound = {
  /** Sound is off for the feed. Starts true because unmuted autoplay is blocked. */
  muted: boolean
  /** A user gesture has happened, so sound can play. */
  unlocked: boolean
  /** Show the "Tap for sound" affordance. */
  hint: boolean
  toggle: (e?: Event | SyntheticEvent) => void
  /** First-gesture handler. Returns true when this gesture is what turned the sound on. */
  unlock: (e?: Event | SyntheticEvent) => boolean
}

/**
 * Global sound state for the feed: starts muted, the first user gesture (tap, click, key) turns
 * sound on unless the viewer muted it last time, and explicit toggles are remembered.
 */
export function useFeedSound(): FeedSound {
  const pref = useRef<string | null>(null)
  if (pref.current === null) pref.current = readPref(KEYS.sound) ?? 'unset'
  // Coming back to the feed in the same tab: the browser already allows sound
  const [muted, setMuted] = useState(() => !(isAudioUnlocked() && pref.current !== 'off'))
  const [unlocked, setUnlocked] = useState(() => isAudioUnlocked())
  const mutedRef = useRef(muted)
  const unlockedRef = useRef(unlocked)

  /** Must run inside the gesture handler. */
  const apply = useCallback((nextMuted: boolean, e?: Event | SyntheticEvent) => {
    mutedRef.current = nextMuted
    if (!unlockedRef.current) {
      unlockedRef.current = true
      // Remount the players with their AudioContext now, synchronously, so we can bless their tags below
      flushSync(() => {
        markAudioUnlocked()
        setUnlocked(true)
        setMuted(nextMuted)
      })
      unlockAudio(e, { restartActive: !nextMuted })
      return
    }
    if (!nextMuted) unlockAudio(e, { restartActive: true })
    setMuted(nextMuted)
  }, [])

  const unlock = useCallback(
    (e?: Event | SyntheticEvent) => {
      if (unlockedRef.current) {
        // Later gestures still prime reels that mounted since (silent; they are muted while off screen).
        unlockAudio(e)
        return false
      }
      const on = pref.current !== 'off'
      apply(!on, e)
      return on
    },
    [apply],
  )

  const toggle = useCallback(
    (e?: Event | SyntheticEvent) => {
      const next = !mutedRef.current
      apply(next, e)
      pref.current = next ? 'off' : 'on'
      writePref(KEYS.sound, pref.current)
    },
    [apply],
  )

  // Any click anywhere counts as the first gesture. Bubble phase on window, so a click on a sound
  // toggle has already been handled by the toggle itself (which marks the feed unlocked first).
  // A touchend that ended a scroll is not a user activation, so it only primes reels once sound is on.
  useEffect(() => {
    const onClick = (e: Event) => unlock(e)
    const onTouchEnd = (e: Event) => unlockedRef.current && unlockAudio(e)
    window.addEventListener('click', onClick)
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('click', onClick)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [unlock])

  return { muted, unlocked, hint: muted && !unlocked && pref.current !== 'off', toggle, unlock }
}
