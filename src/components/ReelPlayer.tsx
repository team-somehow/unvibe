import { Player, type PlayerRef } from '@remotion/player'
import { useEffect, useRef } from 'react'
import type { Reel } from '../data/reels'
import { COMPOSITIONS, FPS, HEIGHT, WIDTH } from '../reels/registry'

type Props = {
  reel: Pick<Reel, 'kind' | 'props'>
  active: boolean
  paused?: boolean
  loop?: boolean
  onProgress?: (p: number) => void
  onEnded?: () => void
}

export function ReelPlayer({ reel, active, paused = false, loop = true, onProgress, onEnded }: Props) {
  const ref = useRef<PlayerRef>(null)
  const { component, frames } = COMPOSITIONS[reel.kind]

  useEffect(() => {
    const p = ref.current
    if (!p) return
    if (active && !paused) p.play()
    else p.pause()
  }, [active, paused, reel.kind])

  useEffect(() => {
    if (!active) ref.current?.seekTo(0)
  }, [active])

  useEffect(() => {
    const p = ref.current
    if (!p) return
    const onFrame = (e: { detail: { frame: number } }) => onProgress?.(e.detail.frame / (frames - 1))
    const ended = () => onEnded?.()
    p.addEventListener('frameupdate', onFrame)
    p.addEventListener('ended', ended)
    return () => {
      p.removeEventListener('frameupdate', onFrame)
      p.removeEventListener('ended', ended)
    }
  }, [frames, onProgress, onEnded])

  return (
    <Player
      ref={ref}
      component={component}
      inputProps={reel.props ?? {}}
      durationInFrames={frames}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      loop={loop}
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      acknowledgeRemotionLicense
      style={{ width: '100%', height: '100%', background: '#000' }}
    />
  )
}
