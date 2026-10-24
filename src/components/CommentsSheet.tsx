import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { ArrowUp, Heart, SquareTerminal, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ME, type Comment, type Reel } from '../data/reels'
import { Avatar } from './Avatar'
import { topicColor } from './feed/topics'

const FALLBACK_SUGGESTIONS: Record<string, string[]> = {
  'r-index': ['Does an index slow down writes?', 'How did you know it was slow?', 'When should I add one?'],
  'r-injection': ['Does my ORM protect me?', 'Why not just escape the input?', 'How did you catch this?'],
  'r-race': ['Can that lock deadlock?', 'What about double retries?'],
  'r-jwt': ['Should I encrypt the token?', 'Where does the secret live?'],
  'r-poll': ['Which would you pick and why?'],
}
const DEFAULT_SUGGESTIONS = ['What did you change here?', 'Explain it like I am new to this']

const THINKING = ['Reading the session transcript', 'Finding the lines it changed', 'Writing a reply']

// Shimmering status text; the keyframes live in FeedApp's scoped stylesheet (lg-shimmer)
const SHIMMER = {
  backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.45) 40%, #fff 50%, rgba(255,255,255,0.45) 60%, rgba(255,255,255,0.45) 100%)',
  backgroundSize: '250% 100%',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  animation: 'lg-shimmer 1.6s linear infinite',
} as const

// Agent replies stream in once; reopening the sheet shows them complete.
const streamed = new Set<string>()

function StreamText({ id, text, onTick }: { id: string; text: string; onTick?: () => void }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(() => (streamed.has(id) || reduce ? text.length : 0))
  const tick = useRef(onTick)
  useEffect(() => {
    tick.current = onTick
  })
  useEffect(() => {
    if (n >= text.length) {
      streamed.add(id)
      return
    }
    // Word by word, with a little jitter so it reads like it is being written
    const t = setTimeout(() => {
      const next = text.indexOf(' ', n + 1)
      setN(next === -1 ? text.length : next)
      tick.current?.()
    }, 26 + Math.random() * 44)
    return () => clearTimeout(t)
  }, [n, text, id])
  const done = n >= text.length
  return (
    <>
      {text.slice(0, n)}
      {!done && <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[2px] animate-pulse rounded-[1px] bg-[#D97757]" />}
    </>
  )
}

function AgentTyping() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, THINKING.length - 1)), 750)
    return () => clearInterval(id)
  }, [])
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="flex gap-3 py-3" role="status" aria-live="polite">
      <span className="relative grid size-[34px] shrink-0 place-items-center">
        <motion.span aria-hidden className="absolute -inset-[3px] rounded-full border-2 border-[#D97757]/70 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} />
        <Avatar person={{ handle: 'claude', color: '#D97757' }} size={34} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-semibold">Claude</span>
          <span className="flex gap-[3px]">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="size-[5px] rounded-full bg-[#D97757]" animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
            ))}
          </span>
        </div>
        <p className="relative mt-0.5 h-5 overflow-hidden text-[14px] leading-5">
          <AnimatePresence initial={false}>
            <motion.span
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-x-0 top-0 truncate"
              style={SHIMMER}
            >
              {THINKING[step]}…
            </motion.span>
          </AnimatePresence>
        </p>
      </div>
    </motion.div>
  )
}

function CommentRow({ c, onTick }: { c: Comment; onTick?: () => void }) {
  const [liked, setLiked] = useState(false)
  const [fresh] = useState(() => !!c.fresh && !streamed.has(c.id))
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={`relative -mx-2 flex gap-3 rounded-2xl px-2 py-3 ${c.agent ? 'before:absolute before:inset-y-1.5 before:left-0 before:w-[2px] before:rounded-full before:bg-[#D97757]/50' : ''}`}
    >
      {fresh && <motion.span aria-hidden className="absolute inset-0 rounded-2xl bg-[#D97757]/10" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 2.4, duration: 1.2 }} />}
      <Avatar person={c.author} size={34} />
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
          <span className="font-semibold">{c.agent ? 'Claude' : c.author.handle}</span>
          {c.agent && <span className="rounded-md bg-[#D97757]/18 px-1.5 py-px text-[11px] font-medium text-[#F0A285]">ran this session</span>}
          <span className="text-white/40">{c.time}</span>
        </div>
        <p className={`mt-0.5 text-[14px] leading-relaxed break-words ${c.agent ? 'text-white' : 'text-white/88'}`}>{fresh ? <StreamText id={c.id} text={c.text} onTick={onTick} /> : c.text}</p>
      </div>
      <button
        type="button"
        onClick={() => setLiked((l) => !l)}
        aria-label={liked ? 'Unlike comment' : 'Like comment'}
        aria-pressed={liked}
        className="relative -mt-1.5 -mr-2 flex size-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full text-white/45 transition hover:text-white/80"
      >
        <motion.span key={String(liked)} initial={{ scale: liked ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}>
          <Heart size={14} className={liked ? 'fill-mred text-mred' : ''} />
        </motion.span>
        <span className="h-3 text-[11px] leading-3 tabular-nums">{c.likes + (liked ? 1 : 0) || ''}</span>
      </button>
    </motion.li>
  )
}

type BodyProps = {
  reel: Reel
  typing: boolean
  onPost: (text: string) => void
  /** Show the reel's caption and session as the first item (side panel). */
  showCaption?: boolean
  autoFocus?: boolean
}

function CommentsBody({ reel, typing, onPost, showCaption = false, autoFocus = false }: BodyProps) {
  const generated = reel.kind === 'generated'
  const [text, setText] = useState('')
  const [used, setUsed] = useState<string[]>([])
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const stick = useRef(true)

  const toBottom = (smooth = true) => {
    const el = list.current
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  useLayoutEffect(() => {
    stick.current = true
    toBottom(false)
  }, [reel.id])

  useEffect(() => {
    stick.current = true
    toBottom()
  }, [reel.comments.length, typing])

  useEffect(() => {
    if (autoFocus) input.current?.focus({ preventScroll: true })
  }, [autoFocus])

  const submit = (t: string) => {
    const v = t.trim()
    if (!v) return
    onPost(v)
    setText('')
  }

  const suggestions = (reel.suggestions ?? (generated ? ['What changed in this session?', 'Summarize the takeaways'] : FALLBACK_SUGGESTIONS[reel.id] ?? DEFAULT_SUGGESTIONS)).filter((s) => !used.includes(s))
  const accent = reel.topic ? topicColor(reel.topic) : null

  return (
    <>
      <div
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
      >
        {showCaption && (
          <div className="flex gap-3 border-b border-white/8 pt-4 pb-4">
            <Avatar person={reel.author} size={34} />
            <div className="min-w-0 flex-1 text-[14px] leading-relaxed">
              <span className="mr-1.5 font-semibold">{reel.author.handle}</span>
              <span className="text-white/90">{reel.caption}</span>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                {reel.topic && accent && (
                  <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-white/6 px-2 font-semibold" style={{ color: accent }}>
                    <span className="size-1.5 rounded-full" style={{ background: accent }} />
                    {reel.topic}
                  </span>
                )}
                <span className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-full bg-white/6 px-2 text-white/70">
                  <SquareTerminal size={12} className="shrink-0 text-mblue" />
                  <span className="truncate">
                    {reel.session.title} · <span className="font-mono text-[11.5px]">{reel.session.repo}</span>
                  </span>
                </span>
                <span className="text-white/35">{reel.session.when}</span>
              </div>
            </div>
          </div>
        )}
        {reel.comments.length === 0 && !typing ? (
          <div className="grid place-items-center px-6 py-14 text-center">
            <span className="mb-3 grid size-12 place-items-center rounded-full bg-[#D97757]/15">
              <Avatar person={generated ? { handle: 'lesson notes', color: '#a6c9ac' } : { handle: 'claude', color: '#D97757' }} size={28} />
            </span>
            <p className="text-[15px] font-semibold">No comments yet</p>
            <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-white/50">{generated ? 'Look up an explanation from this saved lesson. For a new AI answer, return to the original Claude Code session.' : 'Ask Claude anything about this session. It read every line it changed.'}</p>
          </div>
        ) : (
          <ul className="pt-1">
            {reel.comments.map((c) => (
              <CommentRow key={c.id} c={c} onTick={() => toBottom(false)} />
            ))}
          </ul>
        )}
        <AnimatePresence>{typing && !generated && <AgentTyping key="typing" />}</AnimatePresence>
        <div className="h-2" />
      </div>
      <div className="shrink-0 border-t border-white/10 px-3 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
        <AnimatePresence initial={false}>
          {suggestions.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-2.5 [mask-image:linear-gradient(90deg,transparent,#000_12px,#000_calc(100%-28px),transparent)]">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => {
                      setUsed((u) => [...u, s])
                      submit(s)
                    }}
                    disabled={typing}
                    className="h-9 shrink-0 rounded-full border border-white/14 bg-white/[0.03] px-3.5 text-[13px] text-white/85 transition hover:border-white/35 hover:bg-white/[0.06] active:scale-95 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(text)
          }}
          className="flex items-center gap-2.5"
        >
          <Avatar person={ME} size={32} />
          <div className="relative min-w-0 flex-1">
            <input
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={generated ? 'Look up something in this lesson…' : 'Ask Claude about this change…'}
              aria-label={generated ? 'Look up something in this saved lesson' : 'Ask Claude about this change'}
              enterKeyHint="send"
              className="h-11 w-full rounded-full border border-white/14 bg-white/[0.03] pr-12 pl-4 text-[14px] outline-none placeholder:text-white/40 focus:border-mblue/60 focus:bg-white/[0.05]"
            />
            <AnimatePresence>
              {text.trim() && (
                <motion.button
                  type="submit"
                  aria-label="Send"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                  className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-mblue text-black"
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </form>
        {generated && <p className="mt-2 pl-10 text-[10px] leading-relaxed text-white/40">Local lesson lookup. Replies quote saved content; no new AI request is sent.</p>}
      </div>
    </>
  )
}

type Props = {
  reel: Reel | null
  typing: boolean
  onClose: () => void
  onPost: (text: string) => void
}

/** Bottom sheet on phones, floating card on tablets. */
export function CommentsSheet({ reel, typing, onClose, onPost }: Props) {
  const drag = useDragControls()
  const dialog = useRef<HTMLDivElement>(null)

  // Return focus to whatever opened the sheet
  useEffect(() => {
    if (!reel) return
    const prev = document.activeElement as HTMLElement | null
    dialog.current?.focus({ preventScroll: true })
    return () => prev?.focus?.({ preventScroll: true })
  }, [!!reel]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {reel && (
        <>
          <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/55 md:backdrop-blur-[2px]" />
          <motion.div
            key="sheet"
            ref={dialog}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Comments"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 110 || i.velocity.y > 600) && onClose()}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[74dvh] max-w-lg flex-col rounded-t-[22px] border border-b-0 border-white/10 bg-[#121212] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] outline-none md:bottom-4 md:h-[min(720px,86dvh)] md:rounded-[22px] md:border-b"
          >
            <div onPointerDown={(e) => drag.start(e)} className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2.5 active:cursor-grabbing">
              <span className="h-1 w-10 rounded-full bg-white/25" />
              <div className="relative flex w-full items-center justify-center py-2.5">
                <h2 className="text-[15px] font-semibold">
                  Comments <span className="font-normal text-white/45 tabular-nums">{reel.comments.length}</span>
                </h2>
                <button type="button" onClick={onClose} aria-label="Close comments" className="absolute right-2 grid size-11 place-items-center rounded-full text-white/60 transition hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col border-t border-white/10">
              <CommentsBody reel={reel} typing={typing} onPost={onPost} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/** Desktop (>= 1100px): comments live in a panel beside the reel, Instagram-web style, and follow the reel on screen. */
export function CommentsPanel({ reel, typing, onClose, onPost, width }: Props & { reel: Reel; width: number }) {
  return (
    <motion.aside
      key="panel"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 40 }}
      className="relative h-full shrink-0 overflow-hidden py-4 pr-4"
      aria-label="Comments"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#101010]" style={{ width: width - 16 }}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 pr-1.5 pl-4">
          <h2 className="text-[15px] font-semibold">
            Comments <span className="font-normal text-white/45 tabular-nums">{reel.comments.length}</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Close comments" className="grid size-11 place-items-center rounded-full text-white/60 transition hover:bg-white/8 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={reel.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="flex min-h-0 flex-1 flex-col">
            <CommentsBody reel={reel} typing={typing} onPost={onPost} showCaption />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}
