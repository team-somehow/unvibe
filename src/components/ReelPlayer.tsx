import { Player, type PlayerRef } from '@remotion/player'
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useSyncExternalStore, type Ref } from 'react'
import type { Reel } from '../data/reels'
import { COMPOSITIONS, FPS, HEIGHT, WIDTH } from '../reels/registry'
import { isAudioUnlocked, registerPlayer, subscribeAudioUnlock } from './feed/sound'

const EMPTY = {}

export type ReelPlayerHandle = {
  /** Seek to a fraction (0..1) of the reel. */
  seekToProgress: (p: number) => void
}

type Props = {
  reel: Pick<Reel, 'kind' | 'props'>
  active: boolean
  paused?: boolean
  loop?: boolean
  /** Reels start muted so autoplay is allowed; unmute only after a user gesture. */
  muted?: boolean
  onProgress?: (p: number) => void
  onEnded?: () => void
  /** Imperative controls (seeking), used by the feed's scrubber. */
  handleRef?: Ref<ReelPlayerHandle>
  /**
   * How long an inactive reel keeps its last frame before rewinding to the start. The delay keeps a reel
   * that is scrolling out of view from visibly jumping back to frame 0.
   */
  rewindDelayMs?: number
}

export function ReelPlayer({ reel, active, paused = false, loop = true, muted = true, onProgress, onEnded, handleRef, rewindDelayMs = 450 }: Props) {
  const ref = useRef<PlayerRef>(null)
  const { component, frames } = COMPOSITIONS[reel.kind]
  const playing = useRef(false)
  playing.current = active && !paused
  const lastFrame = useRef(0)

  // Before the first user gesture players mount muted and without an AudioContext. Remotion creates
  // the context on first unmute and that orphans <Audio> tags already playing, so once sound is
  // unlocked the Player remounts (same frame) with its context created up front. See feed/sound.ts.
  const feedUnlocked = useSyncExternalStore(subscribeAudioUnlock, isAudioUnlocked, () => false)
  // Same fix for pages that just flip `muted` off from their own button (the landing hero): remount once
  const [everUnmuted, setEverUnmuted] = useState(!muted)
  if (!muted && !everUnmuted) setEverUnmuted(true)
  const unlocked = feedUnlocked || everUnmuted

  useImperativeHandle(
    handleRef,
    () => ({
      seekToProgress: (p: number) => ref.current?.seekTo(Math.round(Math.min(1, Math.max(0, p)) * (frames - 1))),
    }),
    [frames],
  )

  // Lets a tap anywhere in the feed unlock this player's audio tags inside the user gesture.
  useLayoutEffect(() => registerPlayer(ref, () => playing.current), [unlocked])

  // Layout effect, so a freshly mounted (unmuted) player is muted before anything can play
  useLayoutEffect(() => {
    const p = ref.current
    if (!p) return
    if (muted) p.mute()
    else p.unmute()
  }, [muted, unlocked])

  useEffect(() => {
    const p = ref.current
    if (!p) return
    if (active && !paused) p.play()
    else p.pause()
  }, [active, paused, reel.kind, unlocked])

  useEffect(() => {
    if (active) return
    const t = setTimeout(() => {
      lastFrame.current = 0
      ref.current?.seekTo(0)
    }, rewindDelayMs)
    return () => clearTimeout(t)
  }, [active, rewindDelayMs, unlocked])

  useEffect(() => {
    const p = ref.current
    if (!p) return
    const onFrame = (e: { detail: { frame: number } }) => {
      lastFrame.current = e.detail.frame
      onProgress?.(e.detail.frame / (frames - 1))
    }
    const ended = () => onEnded?.()
    p.addEventListener('frameupdate', onFrame)
    p.addEventListener('ended', ended)
    return () => {
      p.removeEventListener('frameupdate', onFrame)
      p.removeEventListener('ended', ended)
    }
  }, [frames, onProgress, onEnded, unlocked])

  return (
    <Player
      key={unlocked ? 'audio' : 'silent'}
      ref={ref}
      component={component}
      inputProps={reel.props ?? EMPTY}
      durationInFrames={frames}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      initialFrame={Math.min(lastFrame.current, frames - 1)}
      loop={loop}
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      initiallyMuted={!unlocked}
      numberOfSharedAudioTags={8}
      acknowledgeRemotionLicense
      style={{ width: '100%', height: '100%', background: '#000' }}
    />
  )
}
