import { AnimatePresence, motion } from 'motion/react'
import { Bookmark, Heart, MessageCircle, Pause, Send, SquareTerminal } from 'lucide-react'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { Reel } from '../data/reels'
import { Avatar } from './Avatar'
import { ReelPlayer } from './ReelPlayer'

export function compact(n: number) {
  if (n >= 10000) return `${Math.round(n / 1000)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

type Props = {
  reel: Reel
  active: boolean
  near: boolean
  liked: boolean
  saved: boolean
  vote: string | null
  onLike: (force?: boolean) => void
  onSave: () => void
  onComments: () => void
  onShare: () => void
  onVote: (choice: string) => void
}

function RailButton({ label, onClick, children, count }: { label: string; onClick: () => void; children: ReactNode; count?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-1 text-white transition active:scale-90">
      {children}
      {count !== undefined && <span className="text-[13px] font-medium tabular-nums drop-shadow">{count}</span>}
    </button>
  )
}

function Rail({ reel, liked, saved, onLike, onSave, onComments, onShare }: Omit<Props, 'active' | 'near' | 'vote' | 'onVote'>) {
  return (
    <div className="flex flex-col items-center gap-5">
      <RailButton label={liked ? 'Unlike' : 'Like'} onClick={() => onLike()} count={compact(reel.likes + (liked ? 1 : 0))}>
        <motion.span key={String(liked)} initial={{ scale: liked ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
          <Heart size={28} strokeWidth={1.8} className={liked ? 'fill-mred text-mred' : 'drop-shadow'} />
        </motion.span>
      </RailButton>
      <RailButton label="Comments" onClick={onComments} count={compact(reel.comments.length)}>
        <MessageCircle size={28} strokeWidth={1.8} className="-scale-x-100 drop-shadow" />
      </RailButton>
      <RailButton label="Share" onClick={onShare} count={compact(reel.shares)}>
        <Send size={26} strokeWidth={1.8} className="drop-shadow" />
      </RailButton>
      <RailButton label={saved ? 'Remove from saved' : 'Save'} onClick={onSave}>
        <Bookmark size={26} strokeWidth={1.8} className={saved ? 'fill-white' : 'drop-shadow'} />
      </RailButton>
      <div className="mt-1 grid size-8 place-items-center rounded-lg border-2 border-white/80 bg-black text-mblue" title={reel.session.repo}>
        <SquareTerminal size={16} />
      </div>
    </div>
  )
}

function PollSticker({ reel, vote, onVote }: { reel: Reel; vote: string | null; onVote: (c: string) => void }) {
  const poll = reel.poll!
  const total = poll.options.reduce((s, o) => s + o.votes, 0) + (vote ? 1 : 0)
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, rotate: -3 }}
      animate={{ scale: 1, opacity: 1, rotate: -2 }}
      transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 18 }}
      className="absolute inset-x-0 bottom-[22%] z-10 mx-auto w-[78%] max-w-[300px] rounded-2xl bg-white p-3 text-black shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-1 pb-2 text-center text-[13px] font-semibold text-black/60">Your answer goes straight to Claude</p>
      <div className="flex flex-col gap-2">
        {poll.options.map((o) => {
          const votes = o.votes + (vote === o.label ? 1 : 0)
          const pct = Math.round((votes / total) * 100)
          const mine = vote === o.label
          return (
            <button
              key={o.label}
              disabled={!!vote}
              onClick={() => onVote(o.label)}
              className="relative h-11 overflow-hidden rounded-xl bg-black/[0.06] text-[15px] font-semibold transition enabled:active:scale-[0.97]"
            >
              {vote && (
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                  className={`absolute inset-y-0 left-0 ${mine ? 'bg-mblue' : 'bg-black/15'}`}
                />
              )}
              <span className="relative flex items-center justify-between px-4">
                <span>{o.label}</span>
                {vote && <span className="tabular-nums">{pct}%</span>}
              </span>
            </button>
          )
        })}
      </div>
      <AnimatePresence>
        {vote && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden px-1 pt-2 text-[13px] leading-snug text-black/70">
            Claude resumed the session with {vote}.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ReelCard(props: Props) {
  const { reel, active, near, vote, onLike, onComments, onVote } = props
  const [paused, setPaused] = useState(false)
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([])
  const [expanded, setExpanded] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  const tapTimer = useRef<number | null>(null)

  const onProgress = useCallback((p: number) => {
    if (bar.current) bar.current.style.transform = `scaleX(${p})`
  }, [])

  const onTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (tapTimer.current) {
      clearTimeout(tapTimer.current)
      tapTimer.current = null
      onLike(true)
      const id = Date.now()
      setBursts((b) => [...b, { id, x, y }])
      setTimeout(() => setBursts((b) => b.filter((h) => h.id !== id)), 900)
      return
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null
      setPaused((p) => !p)
    }, 260)
  }

  const isPaused = paused && active

  return (
    <section className="relative flex h-full w-full snap-start snap-always items-center justify-center md:gap-5">
      <div className="relative h-full w-full overflow-hidden bg-black md:aspect-[9/16] md:h-[calc(100%-32px)] md:w-auto md:rounded-2xl md:ring-1 md:ring-white/10">
        <div className="absolute inset-0" onClick={onTap}>
          {near && <ReelPlayer reel={reel} active={active} paused={isPaused} onProgress={onProgress} />}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        <AnimatePresence>
          {isPaused && (
            <motion.div initial={{ opacity: 0, scale: 1.3 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid size-16 place-items-center rounded-full bg-black/50 backdrop-blur">
                <Pause size={28} className="fill-white text-white" />
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {bursts.map((b) => (
            <motion.div
              key={b.id}
              initial={{ scale: 0, opacity: 1, rotate: -15 }}
              animate={{ scale: [0, 1.3, 1], y: [0, 0, -80], opacity: [1, 1, 0] }}
              transition={{ duration: 0.85, times: [0, 0.3, 1] }}
              className="pointer-events-none absolute"
              style={{ left: b.x - 48, top: b.y - 48 }}
            >
              <Heart size={96} className="fill-mred text-mred drop-shadow-2xl" />
            </motion.div>
          ))}
        </AnimatePresence>

        {reel.poll && active && <PollSticker reel={reel} vote={vote} onVote={onVote} />}

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 px-4 pb-5 pr-16 md:pr-4">
          <div className="flex items-center gap-2.5">
            <Avatar person={reel.author} size={32} />
            <span className="text-[15px] font-semibold">{reel.author.handle}</span>
            {reel.author.handle !== 'you' && (
              <button className="rounded-lg border border-white/60 px-2.5 py-0.5 text-[13px] font-semibold transition active:scale-95">Follow</button>
            )}
          </div>
          <button onClick={() => setExpanded((e) => !e)} className={`text-left text-[14px] leading-snug text-white/95 ${expanded ? '' : 'line-clamp-2'}`}>
            {reel.caption}
          </button>
          <button onClick={onComments} className="flex w-fit max-w-full items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[12.5px] backdrop-blur-md transition active:scale-95">
            <SquareTerminal size={14} className="shrink-0 text-mblue" />
            <span className="truncate">
              <span className="font-medium">{reel.session.title}</span>
              <span className="text-white/60"> in {reel.session.repo}</span>
            </span>
          </button>
        </div>

        <div className="absolute bottom-24 right-2.5 md:hidden">
          <Rail {...props} />
        </div>

        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
          <div ref={bar} className="h-full origin-left bg-white/90" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>

      <div className="hidden self-end pb-10 md:block">
        <Rail {...props} />
      </div>

    </section>
  )
}
