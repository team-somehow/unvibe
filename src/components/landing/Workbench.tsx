import type { PlayerRef } from '@remotion/player'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { flushSync } from 'react-dom'
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Heart, MessageCircle, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode, type SyntheticEvent } from 'react'
import { CLAUDE, ME, agentReply } from '../../data/reels'
import { COMPOSITIONS, type ReelKind } from '../../reels/registry'
import { Avatar } from '../Avatar'
import { findTitle, fly, writeProgress, type Flight } from './fly'
import { posterFrame } from './poster'
import { LandingPlayer, ReelBoundary } from './Reel'
import { REPO, SESSION, SLIDES, lineFor, writeBack, type Line } from './session'
import { blessPlayer, playSfx, useLandingSound } from './sound'
import { Breakable, Transcript } from './Transcript'
import { WaitlistSticker } from './Waitlist'

const END = SLIDES.length
const POLL = SLIDES.findIndex((s) => s.kind === 'poll')

type Reply = { q: string; a: string; shown: number; typing: boolean }

function inViewport(el: Element) {
  const r = el.getBoundingClientRect()
  if (!(r.bottom > 0 && r.top < window.innerHeight && r.width > 0)) return false
  const scroller = el.closest('[data-scroll]')
  if (!scroller) return true
  const c = scroller.getBoundingClientRect()
  return r.top >= c.top - 2 && r.bottom <= c.bottom + 2
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

/** Instagram-style speaker button; reads "Tap for sound" until someone uses it. */
function SoundButton({ on, hint, onToggle }: { on: boolean; hint: boolean; onToggle: (e: SyntheticEvent) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle(e)
      }}
      aria-pressed={on}
      aria-label={on ? 'Turn sound off' : 'Turn sound on'}
      className="flex h-11 min-w-11 items-center justify-end rounded-full focus-visible:outline-offset-0"
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 520, damping: 40 }} className="flex h-8 items-center gap-1.5 overflow-hidden rounded-full bg-black/55 px-[8px] text-white ring-1 ring-white/15">
        <motion.span layout="position" className="grid size-[18px] shrink-0 place-items-center">
          {on ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </motion.span>
        <AnimatePresence initial={false}>
          {hint && !on && (
            <motion.span key="hint" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.22 }} className="pr-1 text-[13px] font-semibold whitespace-nowrap">
              Tap for sound
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  )
}

/**
 * Suggested questions under the reel. Only the chips that fit on one row are shown, so nothing is ever cut off;
 * asking one makes room for the next. Where the row is a hover popover (short desktop screens) they wrap instead.
 */
function Chips({ chips, onAsk }: { chips: string[]; onAsk: (q: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [fits, setFits] = useState(chips.length)
  const key = chips.join('|')
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const kids = [...el.children] as HTMLElement[]
      let n = 0
      for (const k of kids) {
        if (k.offsetTop + k.offsetHeight > el.clientHeight + 1) break
        n += 1
      }
      setFits(Math.max(1, n))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [key])
  return (
    <div ref={ref} className="ask-chips mb-2 flex h-9 flex-wrap gap-2 overflow-hidden empty:pointer-events-none">
      {chips.map((c, i) => (
        <button
          key={c}
          type="button"
          onClick={() => onAsk(c)}
          aria-hidden={i >= fits || undefined}
          tabIndex={i >= fits ? -1 : undefined}
          className={`h-9 max-w-full shrink-0 truncate rounded-full bg-night-2 px-3 text-[13px] whitespace-nowrap sm:px-3.5 sm:text-[13.5px] text-chalk ring-1 ring-line transition hover:bg-[#12294a] hover:ring-[#2a4a70] active:scale-[0.97] ${i >= fits ? 'invisible' : ''}`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

function RoundButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full bg-night-2 text-chalk ring-1 ring-line transition hover:bg-[#12294a] hover:ring-[#2a4a70] active:scale-95 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  )
}

export function Workbench({ suspended }: { suspended: boolean }) {
  const reduce = !!useReducedMotion()
  // Tablet and up show the whole session beside the reel; phones show its current line above the reel
  const wide = useMedia('(min-width: 768px)')
  const desktop = useMedia('(min-width: 1024px)')
  const coarse = useMedia('(pointer: coarse)')
  const sound = useLandingSound()

  const playerRef = useRef<PlayerRef>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const wellRef = useRef<HTMLDivElement>(null)
  const stripLineRef = useRef<HTMLParagraphElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const flightRef = useRef<Flight | null>(null)
  const tokenRef = useRef(0)
  const pendingRef = useRef<{ token: number; fly: boolean } | null>(null)
  const lastFrame = useRef(0)
  // where a Player remounting with audio (see LandingPlayer) picks up again
  const [resumeAt, setResumeAt] = useState(0)

  const [slide, setSlide] = useState(0)
  const [kind, setKind] = useState<ReelKind>(SLIDES[0].kind)
  const [switchId, setSwitchId] = useState(0)
  const [lit, setLit] = useState(reduce)
  const [started, setStarted] = useState(false)
  const [flying, setFlying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)
  const [printed, setPrinted] = useState(reduce ? SESSION.length : 0)
  const [vote, setVote] = useState<string | null>(null)
  const [extra, setExtra] = useState(0)
  const [reply, setReply] = useState<Reply | null>(null)
  const [draft, setDraft] = useState('')
  const [asked, setAsked] = useState<string[]>([])
  const [hint, setHint] = useState(true)
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [flash, setFlash] = useState<{ id: number; icon: 'play' | 'pause' } | null>(null)
  const [sheet, setSheet] = useState(false)
  const [live, setLive] = useState('')

  const slideRef = useRef(slide)
  slideRef.current = slide
  const voteRef = useRef(vote)
  voteRef.current = vote

  const current = slide < END ? SLIDES[slide] : null
  const activeKind = lit && current ? current.kind : null
  const atEnd = slide >= END
  const wantPlay = started && !flying && !userPaused && inView && pageVisible && !suspended && !atEnd

  const lines = useMemo(() => {
    if (!vote) return SESSION
    return [...SESSION.filter((l) => !l.waiting), ...writeBack(vote).slice(0, extra)]
  }, [vote, extra])

  const sourceFor = useCallback(
    (k: ReelKind): HTMLElement | null => {
      if (wide) return wellRef.current?.querySelector<HTMLElement>(`[data-reel="${k}"]`) ?? null
      return stripLineRef.current
    },
    [wide],
  )

  /** Put reel `next` on stage. With `fly`, its transcript line lifts off and becomes the reel's title. */
  const switchTo = useCallback(
    (next: number, opts: { fly?: boolean } = {}) => {
      const token = ++tokenRef.current
      flightRef.current?.cancel()
      flightRef.current = null
      setReply(null)
      setSlide(next)
      setLit(true)
      if (next >= END) {
        setFlying(false)
        playerRef.current?.pause()
        setLive('End of this session.')
        return
      }
      const s = SLIDES[next]
      setKind(s.kind)
      setLive(`Playing: ${s.name}`)
      const wantFly = opts.fly !== false && !reduce
      setFlying(wantFly)
      lastFrame.current = 0
      pendingRef.current = { token, fly: wantFly }
      setSwitchId((n) => n + 1)
    },
    [reduce],
  )

  // After a switch commits: rewind, then fly the line into the reel and start it when it lands
  useLayoutEffect(() => {
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    const p = playerRef.current
    if (!p) {
      setFlying(false)
      setStarted(true)
      return
    }
    p.pause()
    p.seekTo(0)
    if (progressRef.current) progressRef.current.style.transform = 'scaleX(0)'
    if (!pending.fly) {
      setStarted(true)
      return
    }
    let raf = 0
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        if (pending.token !== tokenRef.current) return
        const source = sourceFor(SLIDES[slideRef.current]?.kind ?? kind)
        const stage = stageRef.current
        if (!source || !stage || !inViewport(source) || !inViewport(stage)) {
          setFlying(false)
          setStarted(true)
          return
        }
        const title = findTitle(playerRef.current?.getContainerNode() ?? null)
        const f = fly({ source, stage: () => stageRef.current, title })
        flightRef.current = f
        void f.landed.then(() => {
          if (pending.token !== tokenRef.current) return f.cancel()
          setFlying(false)
          setStarted(true)
          setUserPaused(false)
          if (!title) return f.release()
          const t0 = performance.now()
          const check = () => {
            if (pending.token !== tokenRef.current) return f.cancel()
            const node = title.node
            if (!node.isConnected || writeProgress(node) >= 0.995 || performance.now() - t0 > 1800) return f.release()
            requestAnimationFrame(check)
          }
          requestAnimationFrame(check)
        })
      })
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switchId])

  // Play and pause follow everything that can hold the reel: flight, user pause, scroll, tab, viewer
  useEffect(() => {
    const p = playerRef.current
    if (!p) return
    if (wantPlay) p.play()
    else p.pause()
  }, [wantPlay, switchId, sound.ready])

  useLayoutEffect(() => {
    const p = playerRef.current
    if (!p) return
    if (sound.on) p.unmute()
    else p.mute()
  }, [sound.on, sound.ready])

  // Frame-driven progress line, the end of a reel, and the loop while Claude waits on a vote
  useEffect(() => {
    const p = playerRef.current
    if (!p) return
    const frames = COMPOSITIONS[kind].frames
    const onFrame = (e: { detail: { frame: number } }) => {
      lastFrame.current = e.detail.frame
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${e.detail.frame / Math.max(1, frames - 1)})`
    }
    const onEnded = () => {
      if (slideRef.current === POLL && !voteRef.current) {
        p.seekTo(0)
        p.play()
        return
      }
      switchTo(slideRef.current + 1)
    }
    p.addEventListener('frameupdate', onFrame)
    p.addEventListener('ended', onEnded)
    return () => {
      p.removeEventListener('frameupdate', onFrame)
      p.removeEventListener('ended', onEnded)
    }
  }, [kind, switchTo, sound.ready])

  // The one orchestrated moment: the session prints, then its first important line becomes the first reel
  useEffect(() => {
    if (reduce) {
      setPrinted(SESSION.length)
      setLit(true)
      // nothing autoplays: show the reel's opening title as a still until someone presses play
      const t = window.setTimeout(() => playerRef.current?.seekTo(posterFrame(SLIDES[0].kind)), 50)
      return () => clearTimeout(t)
    }
    let cancelled = false
    let iv = 0
    let to = 0
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts?.ready ?? Promise.resolve()
    void Promise.race([fonts, new Promise((r) => setTimeout(r, 400))]).then(() => {
      if (cancelled) return
      let i = 0
      iv = window.setInterval(() => {
        i += 1
        setPrinted(i)
        if (i >= SESSION.length) {
          clearInterval(iv)
          // unless someone already picked a line while the session was printing
          to = window.setTimeout(() => !cancelled && tokenRef.current === 0 && switchTo(0), 240)
        }
      }, 45)
    })
    return () => {
      cancelled = true
      clearInterval(iv)
      clearTimeout(to)
    }
  }, [reduce, switchTo])

  useEffect(() => () => flightRef.current?.cancel(), [])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio >= 0.3), { threshold: [0, 0.3, 0.6] })
    io.observe(el)
    const vis = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', vis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  // Claude's reply: a short "replying" beat, then the answer streams in
  useEffect(() => {
    if (!reply) return
    if (reply.typing) {
      const t = setTimeout(() => setReply((r) => (r ? { ...r, typing: false, shown: reduce ? r.a.length : 0 } : r)), reduce ? 0 : 700)
      return () => clearTimeout(t)
    }
    if (reply.shown >= reply.a.length) {
      setLive(`Claude replied: ${reply.a}`)
      return
    }
    const t = setTimeout(() => setReply((r) => (r ? { ...r, shown: Math.min(r.a.length, r.shown + 3) } : r)), 33)
    return () => clearTimeout(t)
  }, [reply, reduce])

  // After a vote the session carries on in the transcript
  useEffect(() => {
    if (!vote) return
    const total = writeBack(vote).length
    if (extra >= total) return
    const t = setTimeout(() => setExtra((n) => n + 1), reduce ? 0 : extra === 0 ? 260 : 110)
    return () => clearTimeout(t)
  }, [vote, extra, reduce])

  useEffect(() => {
    const el = wellRef.current?.querySelector('[data-scroll]')
    if (el && extra) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [extra, reduce])

  const toggleSound = (e: SyntheticEvent) => {
    setHint(false)
    const next = !sound.on
    if (next) {
      if (!sound.ready) flushSync(() => setResumeAt(playerRef.current?.getCurrentFrame() ?? lastFrame.current))
      sound.set(true)
      blessPlayer(playerRef.current, e, wantPlay)
    } else {
      sound.set(false)
      playerRef.current?.mute()
    }
  }

  const togglePause = () => {
    if (atEnd) return
    if (!started) {
      playerRef.current?.seekTo(0)
      setStarted(true)
      setUserPaused(false)
      setFlash({ id: Date.now(), icon: 'play' })
      return
    }
    setUserPaused((v) => {
      setFlash({ id: Date.now(), icon: v ? 'play' : 'pause' })
      return !v
    })
  }

  const pick = (k: ReelKind) => {
    const i = SLIDES.findIndex((s) => s.kind === k)
    if (i < 0) return
    setUserPaused(false)
    setSheet(false)
    switchTo(i)
  }

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(END, slide + delta))
    if (next === slide) return
    setUserPaused(false)
    switchTo(next)
  }

  const ask = (q: string) => {
    const question = q.trim()
    if (!question || !current) return
    setReply({ q: question, a: agentReply(current.replyId, question), shown: 0, typing: true })
    setAsked((a) => [...a, question])
    setDraft('')
  }

  const castVote = (choice: string) => {
    if (vote) return
    setVote(choice)
    setExtra(0)
    setLive(`Sent. Claude is carrying on with ${choice}.`)
    if (sound.on) playSfx('pop')
  }

  const onRegionKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement
    if (t.closest('input,textarea')) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'm' || e.key === 'M') {
      toggleSound(e)
    } else if ((e.key === ' ' || e.key === 'k') && t === e.currentTarget) {
      e.preventDefault()
      togglePause()
    }
  }

  // Tap pauses, a sideways swipe changes reel (vertical drags stay page scroll)
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null)
  const onDown = (e: RPointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY, t: performance.now() }
  }
  const onUp = (e: RPointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) return go(dx < 0 ? 1 : -1)
    if (Math.hypot(dx, dy) < 10) togglePause()
  }

  const stripLine = current ? lineFor(current.kind) : null
  const hintText = coarse ? 'Tap a highlighted line to watch its reel.' : 'Click a highlighted line to watch its reel.'
  const showPoll = current?.kind === 'poll' && started && !flying

  return (
    <section aria-labelledby="hero-title" className="mx-auto grid w-full max-w-[1360px] min-[1800px]:max-w-[1600px] px-4 pt-6 pb-8 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-6 lg:px-10 lg:pt-[clamp(12px,3svh,40px)] lg:pb-20 lg:gap-x-14 xl:gap-x-20">
      {/* On tablets this column dissolves so the headline spans the page and the session sits beside the reel */}
      <div className="flex min-w-0 flex-col md:contents lg:flex lg:h-0 lg:min-h-full">
        <h1 id="hero-title" className="hero-title font-serif italic md:col-span-2">
          <span className="block">You shipped it.</span>
          <span className="block">Do you understand it?</span>
        </h1>
        <p className="mt-4 max-w-[36em] text-[17px] leading-[1.55] text-pretty text-dim sm:text-[18px] md:col-span-2 lg:mt-5 lg:max-w-[38em] short:mt-3 lg:text-[clamp(17px,1.25vw,20px)]">
          Your agent writes code faster than you can review it. Learnagram reads your Claude Code sessions and turns the changes that matter into short explainer reels.
        </p>

        <div ref={wellRef} className="mt-7 hidden min-h-0 min-w-0 flex-1 flex-col rounded-[14px] bg-ink ring-1 ring-line/70 md:flex md:h-0 md:min-h-full lg:h-auto lg:min-h-0 xl:mt-8 short:mt-5">
          <div className="flex items-baseline justify-between gap-4 px-6 pt-4 pb-2 text-[13px] text-dim short:pt-3">
            <span className="font-mono">~/{REPO}</span>
            <span>Claude Code, 2 hours ago</span>
          </div>
          <div data-scroll className="well-lines min-h-0 flex-1 overflow-y-auto px-6 pb-3 font-mono">
            <Transcript lines={lines} active={activeKind} printed={vote ? lines.length : printed} sweepKey={switchId} onPick={(k) => pick(k)} hintId="line-hint" wrap={!desktop} />
          </div>
          <p id="line-hint" className="px-6 pt-2 pb-4 text-[14px] text-dim short:pb-3">
            {hintText}
          </p>
        </div>
      </div>

      <div className="mt-7 flex min-w-0 flex-col items-start lg:mt-0">
        {/* Phone: the line on stage, with the whole session one tap away */}
        <div className="mb-3 w-full max-w-[420px] rounded-[14px] bg-ink px-4 pt-3 pb-3.5 ring-1 ring-line/70 md:hidden">
          <div className="flex items-center justify-between gap-3 text-[13px] text-dim">
            <span className="truncate font-mono">~/{REPO}</span>
            <button type="button" onClick={() => setSheet(true)} className="-my-2 -mr-2 h-11 shrink-0 rounded-lg px-2 font-medium text-mblue underline-offset-4 hover:underline">
              Full session
            </button>
          </div>
          <p ref={stripLineRef} className="mt-1 flex font-mono text-[13px] leading-[21px] text-myellow">
            <span aria-hidden className="w-[2ch] shrink-0">
              ⏺
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]"><Breakable text={atEnd ? lines[lines.length - 1].text : (stripLine?.text ?? '')} /></span>
          </p>
        </div>

        <div className="flex w-full items-center gap-4 md:w-auto">
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Reels from this session"
            tabIndex={0}
            onKeyDown={onRegionKey}
            className="rounded-[28px] focus-visible:outline-offset-4"
          >
            <div ref={stageRef} className="landing-stage relative isolate overflow-hidden rounded-[28px] bg-black ring-1 ring-white/10" style={{ touchAction: 'pan-y' }}>
              <div aria-hidden className="absolute inset-0">
                <ReelBoundary resetKey={kind} fallback={<div className="absolute inset-0 grid place-items-center bg-black p-8 text-center font-serif text-[22px] text-white/70 italic">{current?.name}</div>}>
                  <LandingPlayer kind={kind} playerRef={playerRef} audioReady={sound.ready} initialFrame={resumeAt} />
                </ReelBoundary>
              </div>

              {/* A tap anywhere on the picture pauses; a sideways swipe moves between reels */}
              <button
                type="button"
                aria-label={!started ? 'Play reel' : userPaused ? 'Play reel' : 'Pause reel'}
                onPointerDown={onDown}
                onPointerUp={onUp}
                onPointerCancel={() => (swipe.current = null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    togglePause()
                  }
                }}
                className="absolute inset-0 z-10 cursor-pointer rounded-[28px] focus-visible:outline-offset-[-4px]"
              />

              {/* Top bar */}
              <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-1 transition-opacity sm:p-1.5 ${atEnd ? 'opacity-0' : ''}`}>
                <div className="pointer-events-auto flex gap-1 lg:hidden">
                  <button type="button" onClick={() => go(-1)} disabled={slide === 0} aria-label="Previous reel" className="grid size-11 place-items-center rounded-full disabled:opacity-30">
                    <span className="grid size-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15">
                      <ChevronLeft size={18} />
                    </span>
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Next reel" className="grid size-11 place-items-center rounded-full">
                    <span className="grid size-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15">
                      <ChevronRight size={18} />
                    </span>
                  </button>
                </div>
                <div className="pointer-events-auto ml-auto flex items-center">
                  <button
                    type="button"
                    onClick={togglePause}
                    aria-label={wantPlay || (!userPaused && started) ? 'Pause' : 'Play'}
                    className="hidden size-11 place-items-center rounded-full lg:grid"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15">{userPaused || !started ? <Play size={16} className="translate-x-px" /> : <Pause size={16} />}</span>
                  </button>
                  <SoundButton on={sound.on} hint={hint} onToggle={toggleSound} />
                </div>
              </div>

              {/* Caption and rail, the Reels way */}
              {!atEnd && current && (
                <>
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[24%] bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  <div className={`pointer-events-none absolute right-[2.6%] bottom-[14%] z-20 flex flex-col items-center gap-1 transition-opacity duration-200 ${reply ? 'opacity-0' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setLiked((l) => ({ ...l, [current.kind]: !l[current.kind] }))}
                      aria-pressed={!!liked[current.kind]}
                      aria-label="Like"
                      className="pointer-events-auto grid size-11 place-items-center text-white"
                    >
                      <motion.span key={String(!!liked[current.kind])} initial={reduce ? false : { scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}>
                        <Heart size={25} strokeWidth={1.9} className={liked[current.kind] ? 'fill-mred text-mred' : ''} />
                      </motion.span>
                    </button>
                    <button type="button" onClick={() => inputRef.current?.focus()} aria-label="Ask Claude about this reel" className="pointer-events-auto grid size-11 place-items-center text-white">
                      <MessageCircle size={25} strokeWidth={1.9} className="-scale-x-100" />
                    </button>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3.5 pb-4 sm:px-4">
                    <p className="line-clamp-2 pr-12 text-[13px] leading-[1.38] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:text-[13.5px]">
                      <span className="font-semibold">you</span> {current.caption}
                    </p>
                  </div>
                  <div aria-hidden className="absolute inset-x-0 bottom-0 z-20 h-[2px] bg-white/20">
                    <div ref={progressRef} className="h-full origin-left bg-white" style={{ transform: 'scaleX(0)' }} />
                  </div>
                </>
              )}

              {/* Claude's poll, as a sticker: the vote goes back into the session */}
              <AnimatePresence>
                {showPoll && (
                  <motion.div
                    key="poll"
                    initial={reduce ? { opacity: 0 } : { scale: 0.85, opacity: 0, rotate: -5 }}
                    animate={{ scale: 1, opacity: 1, rotate: -2 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={reduce ? { duration: 0.12 } : { delay: 0.6, type: 'spring', stiffness: 260, damping: 18 }}
                    role="group"
                    aria-label="Claude is asking you to decide"
                    className="absolute inset-x-0 bottom-[31%] z-30 mx-auto w-[78%] max-w-[300px] rounded-[20px] bg-white p-3 text-night shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
                  >
                    <p className="flex items-center justify-center gap-1.5 pb-2.5 text-center text-[12.5px] font-semibold text-night/60">
                      <span className="relative flex size-2">
                        {!vote && <span className="absolute inline-flex size-full animate-ping rounded-full bg-claude opacity-60" />}
                        <span className={`relative inline-flex size-2 rounded-full ${vote ? 'bg-[#2F7D32]' : 'bg-claude'}`} />
                      </span>
                      {vote ? 'Claude got your answer' : 'Your answer goes straight to Claude'}
                    </p>
                    <div className="flex flex-col gap-2">
                      {['Redis', 'Postgres'].map((o) => {
                        const mine = vote === o
                        return (
                          <button
                            key={o}
                            type="button"
                            disabled={!!vote}
                            aria-pressed={mine}
                            onClick={() => castVote(o)}
                            className={`relative h-11 overflow-hidden rounded-[13px] text-[15px] font-semibold transition enabled:hover:bg-night/[0.09] enabled:active:scale-[0.97] ${vote && !mine ? 'bg-night/[0.04] text-night/40' : 'bg-night/[0.06]'}`}
                          >
                            {mine && <motion.span aria-hidden initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} className="absolute inset-0 origin-left bg-mblue" />}
                            <span className="relative">{o}</span>
                          </button>
                        )
                      })}
                    </div>
                    <AnimatePresence>
                      {vote && (
                        <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden px-1 pt-2.5 text-center text-[13px] leading-snug text-night/70">
                          Sent. Claude is carrying on with <span className="font-semibold text-night">{vote}</span>.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Claude's answer slides up over the empty lower part of the reel */}
              <AnimatePresence>
                {reply && !atEnd && (
                  <motion.div
                    key="reply"
                    initial={reduce ? { opacity: 0 } : { y: '100%' }}
                    animate={reduce ? { opacity: 1 } : { y: 0 }}
                    exit={reduce ? { opacity: 0 } : { y: '100%' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                    className="absolute inset-x-0 bottom-0 z-30 flex h-[50%] flex-col justify-end bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0.94)_26%,#000_60%)] px-3.5 pb-4"
                  >
                    <button type="button" onClick={() => setReply(null)} className="-mr-1.5 mb-1 flex h-9 items-center gap-1 self-end rounded-full px-2.5 text-[12.5px] font-medium text-white/70 hover:text-white">
                      <X size={14} /> Hide reply
                    </button>
                    <div className="flex items-start gap-2.5">
                      <Avatar person={ME} size={26} />
                      <p className="min-w-0 pt-[3px] text-[13.5px] leading-snug text-white">
                        <span className="font-semibold">you</span> {reply.q}
                      </p>
                    </div>
                    <div className="mt-3 flex items-start gap-2.5">
                      <Avatar person={CLAUDE} size={26} />
                      <div className="min-w-0 pt-[3px] text-[13.5px] leading-snug text-white">
                        <span className="font-semibold">claude</span> <span className="ml-0.5 rounded-full bg-white/12 px-1.5 py-px align-[1px] text-[11px] font-medium text-white/75">ran this session</span>
                        {reply.typing ? (
                          <span className="mt-1 flex items-center gap-1 text-white/60">
                            Claude is replying
                            <span className="ml-0.5 inline-flex gap-[3px]" aria-hidden>
                              {[0, 1, 2].map((i) => (
                                <span key={i} className="size-1 animate-pulse rounded-full bg-white/70" style={{ animationDelay: `${i * 160}ms` }} />
                              ))}
                            </span>
                          </span>
                        ) : (
                          <p className="mt-1 text-white/90">{reply.a.slice(0, reply.shown)}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* The end of the session */}
              <AnimatePresence>
                {atEnd && (
                  <motion.div
                    key="end"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="landing-grid absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-black px-[8%] text-center"
                  >
                    <p className="font-serif text-[clamp(22px,2.1vw,28px)] leading-[1.2] text-white italic">That’s everything worth knowing from this session.</p>
                    <WaitlistSticker id="email-end" tone="card" />
                    <button type="button" onClick={() => switchTo(0)} className="flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-medium text-white/80 hover:text-white">
                      <RotateCcw size={15} /> Watch from the start
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reduced motion: nothing plays until asked */}
              {!started && reduce && !atEnd && (
                <button type="button" onClick={togglePause} className="absolute inset-0 z-30 grid place-items-center bg-black/30">
                  <span className="flex h-12 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-night">
                    <Play size={16} className="fill-night" /> Play reel
                  </span>
                </button>
              )}

              <AnimatePresence>
                {flash && (
                  <motion.span
                    key={flash.id}
                    aria-hidden
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 1.1] }}
                    transition={{ duration: 0.6, times: [0, 0.25, 1] }}
                    onAnimationComplete={() => setFlash(null)}
                    className="pointer-events-none absolute top-1/2 left-1/2 z-30 -mt-8 -ml-8 grid size-16 place-items-center rounded-full bg-black/55 text-white"
                  >
                    {flash.icon === 'pause' ? <Pause size={26} /> : <Play size={26} className="translate-x-0.5" />}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden flex-col gap-3 lg:flex">
            <RoundButton label="Previous reel" onClick={() => go(-1)} disabled={slide === 0}>
              <ChevronUp size={20} />
            </RoundButton>
            <RoundButton label="Next reel" onClick={() => go(1)} disabled={atEnd}>
              <ChevronDown size={20} />
            </RoundButton>
          </div>
        </div>

        {/* Ask the agent that did the work */}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            ask(draft)
          }}
          className="ask-bar group/ask relative mt-3 w-full max-w-[420px] lg:max-w-none"
        >
          {/* always rendered, so the row keeps its height (and the session beside it keeps its size) when it empties */}
          <Chips chips={current && !atEnd ? current.chips.filter((c) => !asked.includes(c)) : []} onAsk={ask} />
          <div className="flex h-12 items-center gap-2 rounded-full bg-night-2 pr-1.5 pl-2 ring-1 ring-line focus-within:ring-mblue">
            <Avatar person={CLAUDE} size={30} />
            <label htmlFor="ask" className="sr-only">
              Question for Claude
            </label>
            <input
              ref={inputRef}
              id="ask"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={atEnd ? 'Pick a reel to ask about it' : 'Ask Claude about this reel'}
              disabled={atEnd}
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-chalk outline-none placeholder:text-dim/80 disabled:opacity-60 lg:text-[15px]"
            />
            <button type="submit" disabled={!draft.trim()} aria-label="Send question" className="grid size-9 shrink-0 place-items-center rounded-full bg-chalk text-night transition disabled:bg-white/10 disabled:text-dim">
              <ArrowUp size={18} />
            </button>
          </div>
        </form>
      </div>

      <p className="sr-only" aria-live="polite">
        {live}
      </p>

      {/* Phone: the whole session as a sheet */}
      <AnimatePresence>
        {sheet && <SessionSheet onClose={() => setSheet(false)} lines={lines} active={activeKind} sweepKey={switchId} onPick={pick} hint={hintText} />}
      </AnimatePresence>
    </section>
  )
}

function SessionSheet({ onClose, lines, active, sweepKey, onPick, hint }: { onClose: () => void; lines: Line[]; active: ReelKind | null; sweepKey: number; onPick: (k: ReelKind) => void; hint: string }) {
  const reduce = !!useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panelRef.current) {
        const f = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')]
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
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus({ preventScroll: true })
    }
  }, [onClose])
  return (
    <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        initial={reduce ? false : { y: '100%' }}
        animate={{ y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 40 }}
        drag={reduce ? false : 'y'}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => (info.offset.y > 90 || info.velocity.y > 500) && onClose()}
        className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-[22px] bg-ink pb-[max(20px,env(safe-area-inset-bottom))] ring-1 ring-line"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
          <div>
            <h2 id="sheet-title" className="font-mono text-[14px] text-chalk">
              ~/{REPO}
            </h2>
            <p className="text-[13px] text-dim">{hint}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close session" className="-mr-2 grid size-11 place-items-center rounded-full text-dim hover:text-chalk">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[calc(82dvh-80px)] overflow-y-auto px-5 pt-2 pb-2 font-mono text-[13px] leading-[22px]">
          <Transcript lines={lines} active={active} printed={lines.length} sweepKey={sweepKey} onPick={(k) => onPick(k)} wrap />
        </div>
      </motion.div>
    </motion.div>
  )
}
