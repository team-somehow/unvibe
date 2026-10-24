import { Player, type PlayerRef } from '@remotion/player'
import {
  memo,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type Ref,
} from 'react'
import type { Reel } from '../data/reels'
import { getReelComposition, FPS, HEIGHT, WIDTH } from '../reels/registry'
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
  /** Frame shown before playback and after rewinding; useful for a paused lesson preview. */
  initialFrame?: number
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

export function ReelPlayer({
  reel,
  active,
  paused = false,
  loop = true,
  muted = true,
  initialFrame = 0,
  onProgress,
  onEnded,
  handleRef,
  rewindDelayMs = 450,
}: Props) {
  const ref = useRef<PlayerRef>(null)
  const { component, frames } = getReelComposition(reel)
  const playing = useRef(false)
  playing.current = active && !paused
  const startFrame = Math.min(frames - 1, Math.max(0, Number.isFinite(initialFrame) ? Math.round(initialFrame) : 0))
  const lastFrame = useRef(startFrame)

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
      lastFrame.current = startFrame
      ref.current?.seekTo(startFrame)
    }, rewindDelayMs)
    return () => clearTimeout(t)
  }, [active, rewindDelayMs, unlocked, startFrame])

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
    <StablePlayer
      key={unlocked ? 'audio' : 'silent'}
      playerRef={ref}
      component={component}
      inputProps={reel.props ?? EMPTY}
      frames={frames}
      initialFrame={Math.min(lastFrame.current, frames - 1)}
      loop={loop}
      initiallyMuted={!unlocked}
    />
  )
}

const PLAYER_STYLE = { width: '100%', height: '100%', background: '#000' }

type StableProps = {
  playerRef: Ref<PlayerRef>
  component: ComponentType<Record<string, unknown>>
  inputProps: Record<string, unknown>
  frames: number
  initialFrame: number
  loop: boolean
  initiallyMuted: boolean
}

/*
 * Re-rendering a Remotion <Player> re-renders the whole composition, a long task for the bigger reels. Play,
 * pause, mute and seek all go through the ref, so the element itself only needs to render when the reel changes.
 * initialFrame and initiallyMuted are read on mount only (a remount is keyed above), so they are not compared.
 */
const StablePlayer = memo(
  function StablePlayer({ playerRef, component, inputProps, frames, initialFrame, loop, initiallyMuted }: StableProps) {
    return (
      <Player
        ref={playerRef}
        component={component}
        inputProps={inputProps}
        durationInFrames={frames}
        fps={FPS}
        compositionWidth={WIDTH}
        compositionHeight={HEIGHT}
        initialFrame={initialFrame}
        loop={loop}
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        spaceKeyToPlayOrPause={false}
        initiallyMuted={initiallyMuted}
        numberOfSharedAudioTags={8}
        acknowledgeRemotionLicense
        style={PLAYER_STYLE}
      />
    )
  },
  (a, b) =>
    a.playerRef === b.playerRef &&
    a.component === b.component &&
    a.inputProps === b.inputProps &&
    a.frames === b.frames &&
    a.loop === b.loop,
)
