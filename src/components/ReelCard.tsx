import { AnimatePresence, motion } from 'motion/react'
import { Bookmark, Heart, MessageCircle, Play, Send, SquareTerminal, Volume2, VolumeX } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react'
import { ME, type Reel } from '../data/reels'
import { Avatar } from './Avatar'
import { ReelPlaceholder, ReelPoster } from './feed/ReelPoster'
import { SoundToggle } from './feed/SoundToggle'
import { topicColor } from './feed/topics'
import { ReelPlayer, type ReelPlayerHandle } from './ReelPlayer'

export function compact(n: number) {
  if (n >= 10000) return `${Math.round(n / 1000)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

type GestureEvent = Event | SyntheticEvent

export type ReelCardProps = {
  reel: Reel
  /** This reel is the one on screen. */
  current: boolean
  /** The feed is allowed to play (tab visible, no full-screen sheet on top). */
  running: boolean
  /** Mount the Remotion Player (only the current reel and its neighbours). */
  mountPlayer: boolean
  /** Render the poster still (reels near the viewport). */
  wantPoster: boolean
  liked: boolean
  saved: boolean
  following: boolean
  vote: string | null
  muted: boolean
  soundHint: boolean
  userPaused: boolean
  /** Comments for this reel are open in the desktop side panel. */
  commentsOpen: boolean
  onLike: (id: string, force?: boolean) => void
  onSave: (id: string) => void
  onComments: (id: string) => void
  onShare: (id: string) => void
  onVote: (id: string, choice: string) => void
  onFollow: (handle: string) => void
  onToggleSound: (e?: GestureEvent) => void
  /** First-gesture hook; returns true when this gesture is what switched sound on. */
  onUnlock: (e?: GestureEvent) => boolean
  onTogglePause: (id: string) => void
  /** Press-and-hold hides the chrome; the feed hides its own chrome too. */
  onImmersive: (on: boolean) => void
}

const HOLD_MS = 220
const DOUBLE_TAP_MS = 280
const MOVE_TOLERANCE = 12

function RailButton({ label, onClick, children, count, pressed }: { label: string; onClick: () => void; children: ReactNode; count?: string; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="flex w-12 flex-col items-center gap-1 rounded-xl py-1 text-white transition-transform active:scale-90"
    >
      {children}
      {count !== undefined && <span className="text-[12.5px] font-semibold tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">{count}</span>}
    </button>
  )
}

function Rail({ reel, liked, saved, commentsOpen, onLike, onSave, onComments, onShare }: Pick<ReelCardProps, 'reel' | 'liked' | 'saved' | 'commentsOpen' | 'onLike' | 'onSave' | 'onComments' | 'onShare'>) {
  return (
    <div className="flex flex-col items-center gap-3.5">
      <RailButton label={liked ? 'Unlike' : 'Like'} pressed={liked} onClick={() => onLike(reel.id)} count={compact(reel.likes + (liked ? 1 : 0))}>
        <motion.span key={String(liked)} initial={{ scale: liked ? 0.3 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 12 }}>
          <Heart size={28} strokeWidth={1.9} className={liked ? 'fill-mred text-mred' : 'drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]'} />
        </motion.span>
      </RailButton>
      <RailButton label={`Comments, ${reel.comments.length}`} pressed={commentsOpen} onClick={() => onComments(reel.id)} count={compact(reel.comments.length)}>
        <MessageCircle size={28} strokeWidth={1.9} className={`-scale-x-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] ${commentsOpen ? 'fill-white' : ''}`} />
      </RailButton>
      <RailButton label="Share" onClick={() => onShare(reel.id)} count={compact(reel.shares)}>
        <Send size={26} strokeWidth={1.9} className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" />
      </RailButton>
      <RailButton label={saved ? 'Remove from study list' : 'Save to study list'} pressed={saved} onClick={() => onSave(reel.id)}>
        <motion.span key={String(saved)} initial={{ scale: saved ? 0.5 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }}>
          <Bookmark size={26} strokeWidth={1.9} className={saved ? 'fill-white' : 'drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]'} />
        </motion.span>
      </RailButton>
      <button
        type="button"
        onClick={() => onComments(reel.id)}
        aria-label={`Ask Claude about the ${reel.session.repo} session`}
        title={`${reel.session.title} in ${reel.session.repo}`}
        className="mt-1 grid size-11 place-items-center rounded-xl transition-transform active:scale-90"
      >
        <span className="grid size-8 place-items-center rounded-lg border-2 border-white/85 bg-black text-mblue">
          <SquareTerminal size={16} />
        </span>
      </button>
    </div>
  )
}

function PollSticker({ reel, vote, onVote }: { reel: Reel; vote: string | null; onVote: (c: string) => void }) {
  const poll = reel.poll!
  const total = poll.options.reduce((s, o) => s + o.votes, 0) + (vote ? 1 : 0)
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0, rotate: -4 }}
      animate={{ scale: 1, opacity: 1, rotate: -2 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 18 }}
      // The poll reel keeps y 1100-1600 (57%-83%) free for this sticker, below its captions
      className="absolute inset-x-0 top-[57.5%] z-20 mx-auto w-[78%] max-w-[300px] rounded-[20px] bg-white p-2.5 text-black shadow-[0_20px_60px_rgba(0,0,0,0.55)] md:p-3"
      role="group"
      aria-label="Claude is asking you to decide"
    >
      <p className="flex items-center justify-center gap-1.5 px-1 pt-0.5 pb-2 text-center text-[12.5px] font-semibold text-black/55">
        <span className="relative flex size-2">
          {!vote && <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#D97757] opacity-60" />}
          <span className={`relative inline-flex size-2 rounded-full ${vote ? 'bg-mgreen' : 'bg-[#D97757]'}`} />
        </span>
        {vote ? 'Claude got your answer' : 'Your vote goes straight to Claude'}
      </p>
      <div className="flex flex-col gap-2">
        {poll.options.map((o) => {
          const votes = o.votes + (vote === o.label ? 1 : 0)
          const pct = Math.round((votes / total) * 100)
          const mine = vote === o.label
          return (
            <button
              type="button"
              key={o.label}
              disabled={!!vote}
              onClick={() => onVote(o.label)}
              className="relative h-11 overflow-hidden rounded-[13px] bg-black/[0.06] text-[15px] font-semibold transition enabled:hover:bg-black/[0.09] enabled:active:scale-[0.97] focus-visible:outline-offset-1 md:h-12"
            >
              {vote && (
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                  className={`absolute inset-y-0 left-0 ${mine ? 'bg-mblue' : 'bg-black/12'}`}
                />
              )}
              <span className="relative flex items-center justify-between px-4">
                <span>{o.label}</span>
                {vote && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="tabular-nums">
                    {pct}%
                  </motion.span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <AnimatePresence>
        {vote && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden px-1 pt-2.5 text-[13px] leading-snug text-black/65">
            Claude picked up the session with <span className="font-semibold text-black">{vote}</span>. See its plan in the comments.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FollowButton({ following, onClick }: { following: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={following}
      className={`relative h-7 rounded-lg px-2.5 text-[13px] font-semibold transition-[background-color,border-color,transform] before:absolute before:-inset-2 before:content-[''] active:scale-95 ${
        following ? 'border border-white/0 bg-white/18 text-white backdrop-blur-md' : 'border border-white/70 text-white hover:bg-white/10'
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={String(following)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className="block">
          {following ? 'Following' : 'Follow'}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

export const ReelCard = memo(function ReelCard(props: ReelCardProps) {
  const { reel, current, running, mountPlayer, wantPoster, vote, following, muted, soundHint, userPaused } = props
  const { onLike, onComments, onVote, onFollow, onToggleSound, onUnlock, onTogglePause, onImmersive } = props

  const [holding, setHolding] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number; r: number }[]>([])
  const [expanded, setExpanded] = useState(false)
  const [flash, setFlash] = useState<{ id: number; muted: boolean } | null>(null)
  const [started, setStarted] = useState(false)
  const [posterMounted, setPosterMounted] = useState(wantPoster)
  if (wantPoster && !posterMounted) setPosterMounted(true)

  const bar = useRef<HTMLDivElement>(null)
  const player = useRef<ReelPlayerHandle>(null)
  const press = useRef<{ x: number; y: number; moved: boolean; held: boolean } | null>(null)
  const holdTimer = useRef<number | undefined>(undefined)
  const tapTimer = useRef<number | undefined>(undefined)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)
  const currentRef = useRef(current)
  currentRef.current = current
  const startedRef = useRef(false)

  const onProgress = useCallback((p: number) => {
    if (bar.current) bar.current.style.transform = `scaleX(${p})`
    if (p > 0 && currentRef.current && !startedRef.current) {
      startedRef.current = true
      setStarted(true)
    }
  }, [])

  // Once a reel leaves the screen it rewinds (after ReelPlayer's delay), so bring the poster back with it.
  useEffect(() => {
    if (current) return
    const t = setTimeout(() => {
      startedRef.current = false
      setStarted(false)
      setExpanded(false)
      if (bar.current) bar.current.style.transform = 'scaleX(0)'
    }, 460)
    return () => clearTimeout(t)
  }, [current])

  // Centre speaker flash whenever sound changes on the reel you are watching.
  const prevMuted = useRef(muted)
  useEffect(() => {
    if (prevMuted.current === muted) return
    prevMuted.current = muted
    if (!current) return
    setFlash({ id: Date.now(), muted })
    const t = setTimeout(() => setFlash(null), 750)
    return () => clearTimeout(t)
  }, [muted, current])

  useEffect(() => () => {
    clearTimeout(holdTimer.current)
    clearTimeout(tapTimer.current)
  }, [])

  const endHold = () => {
    setHolding(false)
    onImmersive(false)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    press.current = { x: e.clientX, y: e.clientY, moved: false, held: false }
    clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      const p = press.current
      if (!p || p.moved) return
      p.held = true
      setHolding(true)
      onImmersive(true)
    }, HOLD_MS)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.moved) return
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE) {
      p.moved = true
      if (!p.held) clearTimeout(holdTimer.current)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    clearTimeout(holdTimer.current)
    const p = press.current
    press.current = null
    if (!p) return
    if (p.held) {
      endHold()
      onUnlock(e)
      return
    }
    if (p.moved) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const now = performance.now()
    const last = lastTap.current
    if (last && now - last.t < DOUBLE_TAP_MS && Math.hypot(x - last.x, y - last.y) < 60) {
      // Double tap: like, never unlike (Instagram behaviour)
      clearTimeout(tapTimer.current)
      lastTap.current = null
      onLike(reel.id, true)
      const id = now
      setBursts((b) => [...b, { id, x, y, r: Math.round(Math.random() * 30 - 15) }])
      setTimeout(() => setBursts((b) => b.filter((h) => h.id !== id)), 950)
      return
    }
    lastTap.current = { t: now, x, y }
    // The very first tap switches sound on right away, inside the gesture, instead of waiting for the double-tap window.
    const unlockedNow = onUnlock(e)
    const native = e.nativeEvent
    tapTimer.current = window.setTimeout(() => {
      lastTap.current = null
      if (unlockedNow) return
      if (userPaused) onTogglePause(reel.id)
      else onToggleSound(native)
    }, DOUBLE_TAP_MS)
  }

  const onPointerCancel = () => {
    clearTimeout(holdTimer.current)
    if (press.current?.held) endHold()
    press.current = null
  }

  // Scrubbing on the progress bar
  const scrubTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    if (bar.current) bar.current.style.transform = `scaleX(${p})`
    player.current?.seekToProgress(p)
  }

  const playerPaused = !running || userPaused || holding || scrubbing
  const showPoster = !mountPlayer || !started
  const chromeHidden = holding
  const isMine = reel.author.handle === ME.handle
  const accent = reel.topic ? topicColor(reel.topic) : null

  return (
    <section
      className="relative flex h-full w-full snap-start snap-always items-center justify-center md:gap-4"
      aria-roledescription="reel"
      aria-label={`${reel.author.handle}: ${reel.caption}`}
    >
      <div className="relative h-full w-full overflow-hidden bg-black md:aspect-[9/16] md:h-auto md:max-h-[calc(100%-32px)] md:w-[min(calc((100dvh-32px)*0.5625),calc(100%-88px))] md:rounded-xl md:ring-1 md:ring-white/10">
        {/* Video */}
        <div className="absolute inset-0">{mountPlayer && <ReelPlayer reel={reel} active={current} paused={playerPaused} muted={muted || !current} onProgress={onProgress} handleRef={player} />}</div>

        {/* Poster: covers the Player until the reel actually starts, so fast scrolling never shows black */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: showPoster ? 1 : 0, transition: showPoster ? 'none' : 'opacity 320ms ease-out' }}
        >
          {posterMounted ? <ReelPoster reel={reel} /> : <ReelPlaceholder reel={reel} />}
        </div>

        {/* Gesture surface: tap = sound, double tap = like, press and hold = pause */}
        <div
          className="absolute inset-0 touch-pan-y select-none [-webkit-touch-callout:none]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={(e) => e.pointerType === 'mouse' && onPointerCancel()}
          onContextMenu={(e) => e.preventDefault()}
        />

        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent transition-opacity duration-200 md:h-20 md:from-black/35 ${chromeHidden ? 'opacity-0' : ''}`}
        />
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent transition-[height,opacity] duration-300 ${expanded ? 'h-[62%]' : 'h-[36%]'} ${chromeHidden ? 'opacity-0' : ''}`}
        />

        {/* Centre feedback: paused, and the speaker flash after a sound change */}
        <AnimatePresence>
          {userPaused && current && !holding && (
            <motion.div key="paused" initial={{ opacity: 0, scale: 1.25 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid size-[72px] place-items-center rounded-full bg-black/45 ring-1 ring-white/10 backdrop-blur-md">
                <Play size={30} className="translate-x-0.5 fill-white text-white" />
              </span>
            </motion.div>
          )}
          {flash && !userPaused && (
            <motion.div
              key={flash.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="pointer-events-none absolute inset-0 grid place-items-center"
              role="status"
              aria-label={flash.muted ? 'Sound off' : 'Sound on'}
            >
              <span className="grid size-16 place-items-center rounded-full bg-black/50 ring-1 ring-white/10 backdrop-blur-md">
                {flash.muted ? <VolumeX size={26} /> : <Volume2 size={26} />}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Double-tap hearts */}
        <AnimatePresence>
          {bursts.map((b) => (
            <motion.div
              key={b.id}
              initial={{ scale: 0, opacity: 1, rotate: b.r }}
              animate={{ scale: [0, 1.25, 0.95, 1], y: [0, 0, 0, -90], opacity: [1, 1, 1, 0] }}
              transition={{ duration: 0.9, times: [0, 0.22, 0.4, 1], ease: 'easeOut' }}
              className="pointer-events-none absolute z-30"
              style={{ left: b.x - 52, top: b.y - 52 }}
            >
              <Heart size={104} className="fill-mred text-mred drop-shadow-[0_8px_24px_rgba(252,98,85,0.45)]" />
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>{reel.poll && current && !holding && <PollSticker reel={reel} vote={vote} onVote={(c) => onVote(reel.id, c)} />}</AnimatePresence>

        {/* Speaker toggle, top-right of the video like Instagram */}
        <div className={`absolute top-[max(6px,env(safe-area-inset-top))] right-2 z-20 transition-opacity duration-200 md:top-2.5 md:right-2.5 ${chromeHidden ? 'pointer-events-none opacity-0' : ''}`}>
          <SoundToggle muted={muted} hint={soundHint} onToggle={onToggleSound} />
        </div>

        {/* Bottom overlay */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 pr-[76px] pb-5 pl-4 transition-opacity duration-200 md:pr-4 md:pb-5 ${chromeHidden ? 'opacity-0' : ''}`}
        >
          <div className="pointer-events-auto flex min-w-0 items-center gap-2.5">
            <Avatar person={reel.author} size={32} />
            <span className="truncate text-[14.5px] font-semibold [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">{reel.author.handle}</span>
            {!isMine && <FollowButton following={following} onClick={() => onFollow(reel.author.handle)} />}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="pointer-events-auto -my-0.5 rounded-md py-0.5 text-left text-[14px] leading-[1.4] text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]"
          >
            <span className={expanded ? 'block max-h-[34dvh] overflow-y-auto' : 'line-clamp-2 [@media(max-height:740px)]:line-clamp-1'}>{reel.caption}</span>
          </button>
          <div className="pointer-events-auto flex min-w-0 items-center gap-2">
            {reel.topic && accent && (
              <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-black/35 pr-2.5 pl-2 text-[12px] font-semibold tracking-wide ring-1 ring-white/15 backdrop-blur-md" style={{ color: accent }}>
                <span className="size-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
                {reel.topic}
              </span>
            )}
            <button
              type="button"
              onClick={() => onComments(reel.id)}
              className="relative flex h-7 min-w-0 items-center gap-1.5 rounded-full bg-white/14 pr-3 pl-2.5 text-[12px] ring-1 ring-white/10 backdrop-blur-md transition before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] hover:bg-white/20 active:scale-[0.97]"
              title={`${reel.session.title} in ${reel.session.repo}`}
            >
              <SquareTerminal size={13} className="shrink-0 text-mblue" />
              <span className="truncate">
                <span className="font-semibold">{reel.session.title}</span>
                <span className="text-white/60"> · {reel.session.repo}</span>
              </span>
            </button>
          </div>
        </div>

        <div className={`absolute right-1.5 bottom-4 z-10 transition-opacity duration-200 md:hidden ${chromeHidden ? 'pointer-events-none opacity-0' : ''}`}>
          <Rail {...props} />
        </div>

        {/* Progress, draggable to scrub */}
        <div
          className={`group absolute inset-x-0 bottom-0 z-20 h-3.5 cursor-pointer touch-none transition-opacity duration-200 ${chromeHidden ? 'opacity-0' : ''}`}
          onPointerDown={(e) => {
            if (!mountPlayer) return
            e.currentTarget.setPointerCapture(e.pointerId)
            setScrubbing(true)
            scrubTo(e)
          }}
          onPointerMove={(e) => scrubbing && scrubTo(e)}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
          aria-hidden
        >
          <div className={`absolute inset-x-0 bottom-0 bg-white/20 transition-[height] duration-150 ${scrubbing ? 'h-[5px]' : 'h-[3px] group-hover:h-[5px]'}`}>
            <div ref={bar} className="h-full origin-left bg-white" style={{ transform: 'scaleX(0)' }} />
          </div>
        </div>
      </div>

      <div className="hidden self-end pb-6 md:block">
        <Rail {...props} />
      </div>
    </section>
  )
})
