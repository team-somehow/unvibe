import type { PlayerRef } from '@remotion/player'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { flushSync } from 'react-dom'
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { COMPOSITIONS } from '../../reels/registry'
import { LandingPlayer, ReelBoundary, ReelStill } from './Reel'
import { EXPLORE } from './session'
import { blessPlayer, useLandingSound } from './sound'

function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color }} />
}

/** Other people's sessions, as an Instagram profile grid. Tiles are stills; one opens a viewer with a live Player. */
export function Explore({ open, setOpen }: { open: number | null; setOpen: (i: number | null) => void }) {
  const gridRef = useRef<HTMLUListElement>(null)
  const [near, setNear] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    io.observe(el)
    // stills are cheap; render them once the hero has settled so a fast scroll never meets empty tiles
    const idle = window.setTimeout(() => setNear(true), 4000)
    return () => {
      io.disconnect()
      clearTimeout(idle)
    }
  }, [])

  return (
    <section aria-labelledby="explore-title" className="mx-auto grid w-full max-w-[1360px] min-[1800px]:max-w-[1600px] gap-x-14 gap-y-10 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:px-10 lg:pt-28 lg:pb-36 xl:gap-x-20">
      <div className="max-w-[30rem] lg:pt-2">
        <h2 id="explore-title" className="font-serif text-[clamp(34px,4vw,56px)] leading-[1.04] tracking-[-0.015em] text-balance italic">
          Learn from other people’s sessions
        </h2>
        <p className="mt-5 text-[17px] leading-[1.6] text-dim">
          Leaked keys, open tables, retry storms. Every developer’s agent runs into something different, and each one is a lesson you don’t have to learn in production. Follow people and their sessions join your feed.
        </p>
        <Link to="/app" className="mt-6 inline-flex h-11 items-center rounded-full px-5 text-[15px] font-semibold text-chalk ring-1 ring-line transition hover:bg-night-2 hover:ring-[#2a4a70]">
          Scroll the feed in the demo app
        </Link>
      </div>
      <ul ref={gridRef} className="grid grid-cols-2 gap-[2px] overflow-hidden rounded-[20px] bg-line/40 md:grid-cols-3">
        {EXPLORE.map((r, i) => (
          <li key={r.kind} className="relative">
            <button
              type="button"
              onClick={(e) => {
                returnFocus.current = e.currentTarget
                setOpen(i)
              }}
              aria-label={`Watch ${r.topic}, from ${r.author.handle}`}
              className="group/tile relative block aspect-[3/4] w-full overflow-hidden bg-black text-left focus-visible:z-10 focus-visible:outline-offset-[-3px]"
            >
              <div aria-hidden className="absolute inset-x-0 top-0 aspect-[9/16]">
                {near ? (
                  <ReelBoundary resetKey={r.kind}>
                    <ReelStill kind={r.kind} />
                  </ReelBoundary>
                ) : (
                  <div className="landing-grid absolute inset-0" />
                )}
              </div>
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black from-25% via-black/75 to-transparent md:h-[44%]" />
              <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" className="absolute top-3 right-3 hidden text-white/90 md:block" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <path d="M3 8.5h18M8.5 3l3 5.5M14 3l3 5.5" />
                <path d="M10.2 12.2v4.6l4-2.3z" fill="currentColor" stroke="none" />
              </svg>
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-white sm:text-[14px]">
                  <Dot color={r.author.color} /> {r.author.handle}
                </p>
                <p className="mt-0.5 text-[13px] text-white/70">{r.topic}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {open !== null && (
          <Viewer
            index={open}
            setIndex={setOpen}
            onClose={() => {
              setOpen(null)
              requestAnimationFrame(() => returnFocus.current?.focus({ preventScroll: true }))
            }}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

export function Viewer({ index, setIndex, onClose }: { index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const reduce = !!useReducedMotion()
  const sound = useLandingSound()
  const playerRef = useRef<PlayerRef>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const lastFrame = useRef(0)
  // where a Player remounting with audio (see LandingPlayer) picks up again
  const [resumeAt, setResumeAt] = useState(0)
  const r = EXPLORE[index]
  const n = EXPLORE.length

  const go = (d: number) => {
    lastFrame.current = 0
    setPaused(false)
    setIndex((index + d + n) % n)
  }

  useEffect(() => {
    closeRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if ((e.target as HTMLElement).closest('input')) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'Tab' && panelRef.current) {
        // only buttons that are actually shown: the side arrows are hidden on phones
        const f = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')].filter((b) => b.getClientRects().length > 0)
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  useLayoutEffect(() => {
    const p = playerRef.current
    if (!p) return
    if (sound.on) p.unmute()
    else p.mute()
  }, [sound.on, sound.ready])

  useEffect(() => {
    const p = playerRef.current
    if (!p) return
    p.seekTo(lastFrame.current)
    if (paused) p.pause()
    else p.play()
  }, [paused, index, sound.ready])

  useEffect(() => {
    const p = playerRef.current
    if (!p) return
    const frames = COMPOSITIONS[r.kind].frames
    const onFrame = (e: { detail: { frame: number } }) => {
      lastFrame.current = e.detail.frame
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${e.detail.frame / Math.max(1, frames - 1)})`
    }
    const onEnded = () => {
      p.seekTo(0)
      p.play()
    }
    p.addEventListener('frameupdate', onFrame)
    p.addEventListener('ended', onEnded)
    return () => {
      p.removeEventListener('frameupdate', onFrame)
      p.removeEventListener('ended', onEnded)
    }
  }, [r.kind, sound.ready])

  const toggleSound = (e: SyntheticEvent) => {
    e.stopPropagation()
    if (!sound.on) {
      if (!sound.ready) flushSync(() => setResumeAt(playerRef.current?.getCurrentFrame() ?? lastFrame.current))
      sound.set(true)
      blessPlayer(playerRef.current, e, !paused)
    } else {
      sound.set(false)
      playerRef.current?.mute()
    }
  }

  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: RPointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY })
  const onUp = (e: RPointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) return go(dx < 0 ? 1 : -1)
    if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) return onClose()
    if (Math.hypot(dx, dy) < 10) setPaused((v) => !v)
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <div className="absolute inset-0 bg-[#020812]/92" onClick={onClose} aria-hidden />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${r.topic}, from ${r.author.handle}`}
        initial={reduce ? false : { scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={reduce ? undefined : { scale: 0.97, y: 8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="relative flex items-center gap-4"
      >
        <button type="button" onClick={() => go(-1)} aria-label="Previous reel" className="hidden size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:grid">
          <ChevronLeft size={22} />
        </button>
        {/* nothing behind the viewer scrolls, so it owns every drag: sideways changes reel, down closes */}
        <div className="viewer-stage relative overflow-hidden bg-black md:rounded-[24px] md:ring-1 md:ring-white/10" style={{ touchAction: 'none' }}>
          <div aria-hidden className="absolute inset-0">
            <ReelBoundary resetKey={r.kind}>
              <LandingPlayer kind={r.kind} playerRef={playerRef} audioReady={sound.ready} initialFrame={resumeAt} />
            </ReelBoundary>
          </div>
          <button type="button" aria-label={paused ? 'Play reel' : 'Pause reel'} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (swipe.current = null)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setPaused((v) => !v))} className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-offset-[-4px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-2 pt-[max(8px,env(safe-area-inset-top))]">
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="pointer-events-auto grid size-11 place-items-center rounded-full">
              <span className="grid size-9 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15">
                <X size={18} />
              </span>
            </button>
            <div className="pointer-events-auto flex items-center">
              <button type="button" onClick={() => setPaused((v) => !v)} aria-label={paused ? 'Play' : 'Pause'} className="grid size-11 place-items-center rounded-full">
                <span className="grid size-9 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15">{paused ? <Play size={16} className="translate-x-px" /> : <Pause size={16} />}</span>
              </button>
              <button type="button" onClick={toggleSound} aria-pressed={sound.on} aria-label={sound.on ? 'Turn sound off' : 'Turn sound on'} className="grid size-11 place-items-center rounded-full">
                <span className="grid size-9 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15">{sound.on ? <Volume2 size={17} /> : <VolumeX size={17} />}</span>
              </button>
            </div>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[24%] bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <Dot color={r.author.color} size={22} />
              {r.author.handle}
              <span className="font-normal text-white/60">{r.topic}</span>
            </p>
            <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-snug text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">{r.caption}</p>
          </div>
          <div aria-hidden className="absolute inset-x-0 bottom-0 z-20 h-[2px] bg-white/20">
            <div ref={progressRef} className="h-full origin-left bg-white" style={{ transform: 'scaleX(0)' }} />
          </div>
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Next reel" className="hidden size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:grid">
          <ChevronRight size={22} />
        </button>
      </motion.div>
    </motion.div>
  )
}
