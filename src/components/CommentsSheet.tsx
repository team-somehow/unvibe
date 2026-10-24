import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { Heart, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ME, type Comment, type Reel } from '../data/reels'
import { Avatar } from './Avatar'

const SUGGESTIONS: Record<string, string[]> = {
  'r-index': ['Does an index slow down writes?', 'How did you know it was slow?', 'When should I add one?'],
  'r-injection': ['Does my ORM protect me?', 'Why not just escape the input?', 'How did you catch this?'],
  'r-race': ['Can that lock deadlock?', 'What about double retries?'],
  'r-jwt': ['Should I encrypt the token?', 'Where does the secret live?'],
  'r-poll': ['Which would you pick and why?'],
}

function StreamText({ text }: { text: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 2)), 16)
    return () => clearInterval(id)
  }, [text])
  return <>{text.slice(0, n)}</>
}

function CommentRow({ c }: { c: Comment & { fresh?: boolean } }) {
  const [liked, setLiked] = useState(false)
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 py-3">
      <Avatar person={c.author} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-semibold">{c.agent ? 'Claude' : c.author.handle}</span>
          {c.agent && <span className="rounded-md bg-[#D97757]/20 px-1.5 py-px text-[11px] font-medium text-[#F0A285]">ran this session</span>}
          <span className="text-white/45">{c.time}</span>
        </div>
        <p className={`mt-0.5 text-[14px] leading-relaxed ${c.agent ? 'text-white' : 'text-white/90'}`}>
          {c.fresh ? <StreamText text={c.text} /> : c.text}
        </p>
      </div>
      <button onClick={() => setLiked((l) => !l)} aria-label="Like comment" className="flex flex-col items-center gap-0.5 self-start pt-1 text-white/50">
        <Heart size={14} className={liked ? 'fill-mred text-mred' : ''} />
        <span className="text-[11px] tabular-nums">{c.likes + (liked ? 1 : 0) || ''}</span>
      </button>
    </motion.li>
  )
}

type Props = {
  reel: Reel | null
  typing: boolean
  onClose: () => void
  onPost: (text: string) => void
}

export function CommentsSheet({ reel, typing, onClose, onPost }: Props) {
  const [text, setText] = useState('')
  const list = useRef<HTMLDivElement>(null)
  const drag = useDragControls()

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [reel?.comments.length, typing])

  const submit = (t: string) => {
    const v = t.trim()
    if (!v) return
    onPost(v)
    setText('')
  }

  const suggestions = reel ? (SUGGESTIONS[reel.id] ?? ['What did you change here?', 'Explain it like I am new to this']) : []

  return (
    <AnimatePresence>
      {reel && (
        <>
          <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/50" />
          <motion.div
            key="sheet"
            role="dialog"
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
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[72dvh] max-w-lg flex-col rounded-t-3xl border border-white/10 bg-[#121212] md:bottom-4 md:h-[min(720px,85dvh)] md:rounded-3xl"
          >
            <div onPointerDown={(e) => drag.start(e)} className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2.5 active:cursor-grabbing">
              <span className="h-1 w-10 rounded-full bg-white/25" />
              <div className="relative flex w-full items-center justify-center py-3">
                <h2 className="text-[15px] font-semibold">Comments</h2>
                <button onClick={onClose} aria-label="Close comments" className="absolute right-4 text-white/60 hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div ref={list} className="no-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-4">
              <ul>
                {reel.comments.map((c) => (
                  <CommentRow key={c.id} c={c} />
                ))}
              </ul>
              <AnimatePresence>
                {typing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 py-3 text-[13px] text-white/60">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="size-1.5 rounded-full bg-[#D97757]" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12 }} />
                      ))}
                    </span>
                    Claude is reading the session transcript
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="shrink-0 border-t border-white/10 px-3 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
              <div className="no-scrollbar mb-2.5 flex gap-2 overflow-x-auto">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => submit(s)} className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[12.5px] text-white/85 transition hover:border-white/40 active:scale-95">
                    {s}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submit(text)
                }}
                className="flex items-center gap-2.5"
              >
                <Avatar person={ME} size={32} />
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ask Claude about this change"
                  className="min-w-0 flex-1 rounded-full border border-white/15 bg-transparent px-4 py-2 text-[14px] outline-none placeholder:text-white/40 focus:border-white/40"
                />
                <button type="submit" disabled={!text.trim()} className="px-1 text-[14px] font-semibold text-mblue disabled:opacity-40">
                  Post
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
