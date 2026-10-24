import { Thumbnail } from '@remotion/player'
import { memo } from 'react'
import type { Reel } from '../../data/reels'
import { COMPOSITIONS, FPS, HEIGHT, WIDTH, type ReelKind } from '../../reels/registry'
import { topicColor } from './topics'

const EMPTY = {}

// 1.5s in: every reel has its title and first caption on screen by then
const POSTER_FRAME = 45

export function posterFrame(kind: ReelKind) {
  return Math.min(COMPOSITIONS[kind].frames - 1, POSTER_FRAME)
}

/** A still of the reel, rendered in the browser by Remotion, shown before (and while) its Player mounts. */
export const ReelPoster = memo(function ReelPoster({ reel }: { reel: Pick<Reel, 'kind' | 'props'> }) {
  const { component, frames } = COMPOSITIONS[reel.kind]
  return (
    <Thumbnail
      component={component}
      inputProps={reel.props ?? EMPTY}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      durationInFrames={frames}
      fps={FPS}
      frameToDisplay={posterFrame(reel.kind)}
      style={{ width: '100%', height: '100%', background: '#000' }}
    />
  )
})

/** Cheap stand-in for reels far from the viewport: the stage grid plus the caption, never a black hole. */
export function ReelPlaceholder({ reel }: { reel: Pick<Reel, 'caption' | 'topic'> }) {
  const color = reel.topic ? topicColor(reel.topic) : '#58C4DD'
  return (
    <div
      className="absolute inset-0 grid place-items-center overflow-hidden bg-black px-10"
      style={{
        backgroundImage:
          'linear-gradient(rgba(88,196,221,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(88,196,221,0.06) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div className="absolute inset-x-0 top-1/4 mx-auto size-72 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
      <p className="relative line-clamp-4 text-center font-serif text-[26px] leading-tight text-white/80 italic">{reel.caption}</p>
    </div>
  )
}
