import { Player, Thumbnail, type PlayerRef } from '@remotion/player'
import { Component, memo, type ReactNode, type Ref } from 'react'
import { COMPOSITIONS, FPS, HEIGHT, WIDTH, type ReelKind } from '../../reels/registry'
import { posterFrame } from './poster'

const EMPTY = {}

/** Reels are edited live by other people; a reel that throws shows a quiet card instead of breaking the page. */
export class ReelBoundary extends Component<{ children: ReactNode; resetKey: string; fallback?: ReactNode }, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  static getDerivedStateFromProps(props: { resetKey: string }, state: { failed: boolean; key: string }) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null
  }
  componentDidCatch() {}
  render() {
    if (this.state.failed) return this.props.fallback ?? <div className="absolute inset-0 bg-black" />
    return this.props.children
  }
}

/**
 * One Remotion Player for a landing surface. Swapping `kind` keeps the same Player (and its blessed audio tags).
 * A Player that mounts muted only creates its AudioContext when first unmuted, which orphans audio already
 * playing, so once sound is allowed (`audioReady`) it remounts once, at the same frame, with audio set up front.
 */
export function LandingPlayer({ kind, playerRef, audioReady, initialFrame = 0 }: { kind: ReelKind; playerRef: Ref<PlayerRef>; audioReady: boolean; initialFrame?: number }) {
  const { component, frames } = COMPOSITIONS[kind]
  return (
    <Player
      key={audioReady ? 'audio' : 'silent'}
      ref={playerRef}
      initialFrame={Math.max(0, Math.min(initialFrame, frames - 1))}
      initiallyMuted={!audioReady}
      component={component}
      inputProps={EMPTY}
      durationInFrames={frames}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      loop={false}
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      numberOfSharedAudioTags={8}
      acknowledgeRemotionLicense
      style={{ width: '100%', height: '100%', background: '#000' }}
    />
  )
}

export const ReelStill = memo(function ReelStill({ kind, frame }: { kind: ReelKind; frame?: number }) {
  const { component, frames } = COMPOSITIONS[kind]
  return (
    <Thumbnail
      component={component}
      inputProps={EMPTY}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      durationInFrames={frames}
      fps={FPS}
      frameToDisplay={frame ?? posterFrame(kind)}
      style={{ width: '100%', height: '100%', background: '#000' }}
    />
  )
})
