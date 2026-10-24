import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CONCEPTS_FOR, FAKE_SESSION_LOG, ME, REPOS, type Reel } from '../data/reels'
import { ReelPlayer } from './ReelPlayer'

type Stage = 'compose' | 'running' | 'rendering' | 'preview'

const PROMPTS = ['Add rate limiting to /login', 'Stop brute-force attempts on the login route', 'Throttle the password reset endpoint']

const RENDER_STEPS = ['Reading the session transcript', 'Picking the moments worth learning', 'Animating your reels']

function LogLine({ kind, text }: { kind: string; text: string }) {
  if (kind === 'user') return <div className="text-white/90"><span className="text-white/40">&gt; </span>{text}</div>
  if (kind === 'think') return <div className="text-white/55 italic">{text}</div>
  if (kind === 'ok') return <div className="pl-4 text-mgreen">⎿ {text}</div>
  if (kind === 'done') return <div className="text-white">{text}</div>
  return <div><span className="text-mgreen">⏺</span> <span className="text-white">{text}</span></div>
}

export function CreateSheet({ open, onClose, onPublish }: { open: boolean; onClose: () => void; onPublish: (r: Reel) => void }) {
  const [stage, setStage] = useState<Stage>('compose')
  const [repo, setRepo] = useState(REPOS[1])
  const [prompt, setPrompt] = useState('')
  const [lines, setLines] = useState(0)
  const [step, setStep] = useState(0)

  const log = FAKE_SESSION_LOG(prompt, repo)

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStage('compose')
        setPrompt('')
        setLines(0)
        setStep(0)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (stage !== 'running') return
    if (lines >= log.length) {
      const t = setTimeout(() => setStage('rendering'), 900)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setLines((n) => n + 1), lines === 0 ? 200 : 650)
    return () => clearTimeout(t)
  }, [stage, lines, log.length])

  useEffect(() => {
    if (stage !== 'rendering') return
    if (step >= RENDER_STEPS.length) {
      const t = setTimeout(() => setStage('preview'), 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), 1100)
    return () => clearTimeout(t)
  }, [stage, step])

  const draft: Reel = {
    id: `r-new-${Date.now()}`,
    kind: 'session',
    author: ME,
    caption: `Asked Claude to "${prompt}". Here is what it did and why.`,
    session: { repo, title: prompt, when: 'now' },
    likes: 0,
    shares: 0,
    comments: [],
    props: { prompt, repo, concepts: CONCEPTS_FOR() },
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed inset-0 z-50 flex flex-col bg-black md:inset-auto md:top-1/2 md:left-1/2 md:h-[min(760px,90dvh)] md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:border-white/10 md:bg-[#0e0e0e]"
          role="dialog"
          aria-label="New post"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
            <button onClick={stage === 'preview' ? () => setStage('compose') : onClose} aria-label={stage === 'preview' ? 'Back' : 'Close'} className="text-white/80">
              {stage === 'preview' ? <ChevronLeft size={24} /> : <X size={22} />}
            </button>
            <h2 className="text-[16px] font-semibold">{stage === 'preview' ? 'New reel' : 'New post'}</h2>
            <span className="w-6" />
          </header>

          {stage === 'compose' && (
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault()
                if (prompt.trim()) setStage('running')
              }}
            >
              <div className="flex-1 overflow-y-auto px-4 py-5">
                <label className="text-[13px] font-medium text-white/60" htmlFor="repo">Repository</label>
                <div id="repo" className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                  {REPOS.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRepo(r)}
                      className={`shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-[12.5px] transition ${repo === r ? 'border-mblue bg-mblue/15 text-mblue' : 'border-white/15 text-white/75'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <label className="mt-6 block text-[13px] font-medium text-white/60" htmlFor="prompt">What should Claude do?</label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="Describe the change like you would to a teammate"
                  className="mt-2 w-full resize-none rounded-2xl border border-white/15 bg-white/[0.03] p-4 font-serif text-[20px] leading-snug italic outline-none placeholder:text-white/30 focus:border-white/40"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {PROMPTS.map((p) => (
                    <button type="button" key={p} onClick={() => setPrompt(p)} className="rounded-full border border-white/15 px-3 py-1.5 text-[12.5px] text-white/80 transition hover:border-white/40 active:scale-95">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="shrink-0 border-t border-white/10 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                <button disabled={!prompt.trim()} className="h-12 w-full rounded-xl bg-mblue text-[15px] font-semibold text-black transition enabled:active:scale-[0.98] disabled:opacity-40">
                  Start session
                </button>
                <p className="mt-2.5 text-center text-[12px] text-white/45">Runs in Claude Code on your machine. When it finishes, the session becomes reels.</p>
              </div>
            </form>
          )}

          {(stage === 'running' || stage === 'rendering') && (
            <div className="flex min-h-0 flex-1 flex-col px-4 py-5">
              <div className="flex items-center gap-2 text-[13px] text-white/60">
                <span className={`size-2 rounded-full ${stage === 'running' ? 'animate-pulse bg-mgreen' : 'bg-white/30'}`} />
                Claude Code in <span className="font-mono text-white/85">{repo}</span>
              </div>
              <div className="mt-3 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#07090c] p-4 font-mono text-[12.5px] leading-[1.75]">
                {log.slice(0, lines).map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                    <LogLine kind={l.kind} text={l.text} />
                  </motion.div>
                ))}
                {stage === 'running' && <span className="inline-block h-4 w-2 animate-pulse bg-white/70 align-middle" />}
              </div>
              <AnimatePresence>
                {stage === 'rendering' && (
                  <motion.ul initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2.5">
                    {RENDER_STEPS.map((s, i) => (
                      <li key={s} className={`flex items-center gap-3 text-[14px] ${i <= step ? 'text-white' : 'text-white/35'}`}>
                        {i < step ? <Check size={18} className="text-mgreen" /> : i === step ? <Loader2 size={18} className="animate-spin text-mblue" /> : <span className="size-[18px]" />}
                        {s}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}

          {stage === 'preview' && (
            <div className="flex min-h-0 flex-1 flex-col items-center gap-4 px-4 py-5">
              <div className="aspect-[9/16] min-h-0 flex-1 overflow-hidden rounded-2xl ring-1 ring-white/15">
                <ReelPlayer reel={draft} active />
              </div>
              <div className="w-full shrink-0 pb-[max(0px,env(safe-area-inset-bottom))]">
                <p className="mb-3 text-center text-[13px] text-white/55">3 more deep-dive reels are rendering and will post on their own.</p>
                <button onClick={() => onPublish(draft)} className="h-12 w-full rounded-xl bg-mblue text-[15px] font-semibold text-black transition active:scale-[0.98]">
                  Share to feed
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
