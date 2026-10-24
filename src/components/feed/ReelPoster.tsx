import { Thumbnail, type ThumbnailRef } from '@remotion/player'
import { memo, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import type { Reel } from '../../data/reels'
import { COMPOSITIONS, getReelComposition, FPS, HEIGHT, WIDTH, type ReelKind } from '../../reels/registry'
import { topicColor } from './topics'

const EMPTY = {}

// 1.5s in: every reel has its title and first caption on screen by then
const POSTER_FRAME = 45

export function posterFrame(kind: ReelKind) {
  return Math.min(COMPOSITIONS[kind].frames - 1, POSTER_FRAME)
}

type PosterReel = Pick<Reel, 'kind' | 'props'>

/*
 * Poster cache. A Remotion <Thumbnail> renders the whole composition through React (and creates <audio> tags
 * for every sound in it), which costs a long main-thread task per poster and keeps that memory for as long as
 * it stays mounted. The reels are pure DOM/SVG at a given frame, so each poster is rendered live exactly once,
 * its DOM is cloned into this cache, and from then on every poster of that reel is a cheap static clone.
 */
const cache = new Map<string, HTMLElement>()
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function posterKey(reel: PosterReel, frame: number) {
  // The audio can be an offline data URI. Its bytes do not affect the still and should
  // never be copied into a potentially multi-megabyte DOM cache key.
  if (reel.kind === 'generated' && reel.props && 'lesson' in reel.props) {
    const { narration, ...visual } = reel.props.lesson
    return `generated@${frame}:${JSON.stringify(visual)}:${narration?.durationSeconds ?? ''}`
  }
  return `${reel.kind}@${frame}:${reel.props ? JSON.stringify(reel.props) : ''}`
}

const STAGE_CSS = `position:absolute;left:0;top:0;width:${WIDTH}px;height:${HEIGHT}px;display:flex;overflow:hidden;transform-origin:0 0;`

function capture(key: string, ref: ThumbnailRef | null) {
  const stage = ref?.getContainerNode()?.querySelector('.__remotion-player')
  if (!stage || !stage.childNodes.length) return false
  const master = document.createElement('div')
  master.style.cssText = STAGE_CSS
  stage.childNodes.forEach((n) => master.appendChild(n.cloneNode(true)))
  // Sounds and their preloading belong to the live Player only
  master.querySelectorAll('audio, video').forEach((n) => n.remove())
  cache.set(key, master)
  listeners.forEach((l) => l())
  return true
}

/** A clone of the cached poster, fitted (contain, centred) exactly like the Player fits its canvas. */
function StaticPoster({ cacheKey }: { cacheKey: string }) {
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = host.current
    const master = cache.get(cacheKey)
    if (!el || !master) return
    const stage = master.cloneNode(true) as HTMLElement
    el.appendChild(stage)
    const fit = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      const s = Math.min(w / WIDTH, h / HEIGHT)
      stage.style.transform = `translate(${(w - WIDTH * s) / 2}px, ${(h - HEIGHT * s) / 2}px) scale(${s})`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => {
      ro.disconnect()
      stage.remove()
    }
  }, [cacheKey])
  return <div ref={host} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }} />
}

/** Renders the reel once through Remotion, then hands its DOM to the cache (which swaps this for a StaticPoster). */
function LivePoster({ reel, frame, cacheKey }: { reel: PosterReel; frame: number; cacheKey: string }) {
  const { component, frames } = getReelComposition(reel)
  const ref = useRef<ThumbnailRef>(null)
  useEffect(() => {
    let tries = 0
    let raf = 0
    const tick = () => {
      if (capture(cacheKey, ref.current) || ++tries > 30) return
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cacheKey])
  return (
    <Thumbnail
      ref={ref}
      component={component}
      inputProps={reel.props ?? EMPTY}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      durationInFrames={frames}
      fps={FPS}
      frameToDisplay={frame}
      style={{ width: '100%', height: '100%', background: '#000' }}
    />
  )
}

/**
 * A still of the reel, shown before (and while) its Player mounts. Cached posters are always shown; an
 * uncached one is rendered live only when `live` allows it (the feed schedules that work for moments when
 * nothing is moving), and until then the cheap placeholder stands in. Never a black hole either way.
 */
export const ReelPoster = memo(function ReelPoster({ reel, live = true, frame }: { reel: PosterReel & Partial<Pick<Reel, 'caption' | 'topic'>>; live?: boolean; frame?: number }) {
  const f = frame ?? posterFrame(reel.kind)
  const key = posterKey(reel, f)
  const cached = useSyncExternalStore(subscribe, () => cache.has(key), () => false)
  if (cached) return <StaticPoster cacheKey={key} />
  if (live) return <LivePoster reel={reel} frame={f} cacheKey={key} />
  return <ReelPlaceholder reel={reel} />
})

/** Cheap stand-in for reels far from the viewport: the stage grid plus the caption, never a black hole. */
export function ReelPlaceholder({ reel }: { reel: Partial<Pick<Reel, 'caption' | 'topic'>> }) {
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
      {reel.caption && <p className="relative line-clamp-4 text-center font-serif text-[26px] leading-tight text-white/80 italic">{reel.caption}</p>}
    </div>
  )
}
