import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, ChevronLeft, Loader2, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CONCEPTS_FOR, FAKE_SESSION_LOG, ME, REPOS, SESSION_SUGGESTIONS, type Reel } from '../data/reels'
import { ReelPlayer } from './ReelPlayer'

type Stage = 'compose' | 'running' | 'rendering' | 'preview'

const PROMPTS = ['Add rate limiting to /login', 'Stop brute-force attempts on the login route', 'Throttle the password reset endpoint']

const RENDER_STEPS = ['Reading the session transcript', 'Picking the moments worth learning', 'Animating your reels']

const STEPS: { id: Stage[]; label: string }[] = [
  { id: ['compose'], label: 'Prompt' },
  { id: ['running'], label: 'Session' },
  { id: ['rendering', 'preview'], label: 'Reel' },
]

function LogLine({ kind, text }: { kind: string; text: string }) {
  if (kind === 'user') return <div className="text-white/90"><span className="text-[#D97757]">&gt; </span>{text}</div>
  if (kind === 'think') return <div className="text-white/50 italic">✻ {text}</div>
  if (kind === 'ok') return <div className="pl-4 text-mgreen">⎿ {text}</div>
  if (kind === 'done') return <div className="pt-1 text-white">{text}</div>
  return (
    <div>
      <span className="text-mgreen">⏺</span> <span className="text-white">{text}</span>
    </div>
  )
}

function Elapsed({ running }: { running: boolean }) {
  const [s, setS] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setS((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  return <span className="font-mono tabular-nums">{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</span>
}

export function CreateSheet({ open, muted = true, onClose, onPublish }: { open: boolean; muted?: boolean; onClose: () => void; onPublish: (r: Reel) => void }) {
  const [stage, setStage] = useState<Stage>('compose')
  const [repo, setRepo] = useState(REPOS[1])
  const [prompt, setPrompt] = useState('')
  const [caption, setCaption] = useState('')
  const [lines, setLines] = useState(0)
  const [step, setStep] = useState(0)
  const dialog = useRef<HTMLDivElement>(null)
  const logEnd = useRef<HTMLDivElement>(null)

  const log = useMemo(() => FAKE_SESSION_LOG(prompt, repo), [prompt, repo])

  useEffect(() => {
    if (open) {
      const prev = document.activeElement as HTMLElement | null
      return () => prev?.focus?.({ preventScroll: true })
    }
    const t = setTimeout(() => {
      setStage('compose')
      setPrompt('')
      setCaption('')
      setLines(0)
      setStep(0)
    }, 300)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (stage !== 'running') return
    if (lines >= log.length) {
      const t = setTimeout(() => setStage('rendering'), 800)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setLines((n) => n + 1), lines === 0 ? 250 : log[lines]?.kind === 'think' ? 900 : 600)
    return () => clearTimeout(t)
  }, [stage, lines, log])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    if (stage !== 'rendering') return
    if (step >= RENDER_STEPS.length) {
      const t = setTimeout(() => setStage('preview'), 450)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), 1050)
    return () => clearTimeout(t)
  }, [stage, step])

  const start = () => {
    if (!prompt.trim()) return
    setCaption(`Asked Claude to "${prompt.trim()}". Here is what it did and why.`)
    setLines(0)
    setStep(0)
    setStage('running')
  }

  const reelProps = useMemo(() => ({ prompt: prompt.trim(), repo, concepts: CONCEPTS_FOR() }), [prompt, repo])
  const draft = useMemo<Reel>(
    () => ({
      id: 'r-new',
      kind: 'session',
      topic: 'Security',
      author: ME,
      caption,
      session: { repo, title: prompt.trim(), when: 'now' },
      likes: 0,
      shares: 0,
      comments: [],
      suggestions: SESSION_SUGGESTIONS,
      props: reelProps,
    }),
    [caption, prompt, repo, reelProps],
  )

  const stepIndex = STEPS.findIndex((s) => s.id.includes(stage))
  const renderPct = stage === 'preview' ? 100 : Math.round((step / RENDER_STEPS.length) * 100)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 hidden bg-black/70 backdrop-blur-sm md:block" />
          <motion.div
            key="dialog"
            ref={dialog}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            onAnimationComplete={() => dialog.current?.contains(document.activeElement) || dialog.current?.focus({ preventScroll: true })}
            tabIndex={-1}
            className="fixed inset-0 z-50 flex flex-col bg-black outline-none md:inset-0 md:m-auto md:h-[min(780px,92dvh)] md:w-[440px] md:overflow-hidden md:rounded-[22px] md:border md:border-white/10 md:bg-[#0d0d0d] md:shadow-[0_30px_100px_rgba(0,0,0,0.6)]"
            role="dialog"
            aria-modal="true"
            aria-label="New post"
          >
            <header className="shrink-0 border-b border-white/10 px-2 pt-[max(4px,env(safe-area-inset-top))]">
              <div className="flex h-12 items-center justify-between">
                <button
                  type="button"
                  onClick={stage === 'preview' ? () => setStage('compose') : onClose}
                  aria-label={stage === 'preview' ? 'Back to prompt' : 'Close'}
                  className="grid size-11 place-items-center rounded-full text-white/80 transition hover:bg-white/8 hover:text-white"
                >
                  {stage === 'preview' ? <ChevronLeft size={24} /> : <X size={22} />}
                </button>
                <h2 className="text-[16px] font-semibold">{stage === 'preview' ? 'Sample reel preview' : 'Sample session demo'}</h2>
                <span className="size-11" />
              </div>
              <ol className="flex items-center gap-1.5 px-2 pb-3" aria-label="Progress">
                {STEPS.map((s, i) => (
                  <li key={s.label} className="flex flex-1 flex-col gap-1.5" aria-current={i === stepIndex ? 'step' : undefined}>
                    <span className="h-[3px] overflow-hidden rounded-full bg-white/12">
                      <motion.span
                        className="block h-full rounded-full bg-mblue"
                        initial={false}
                        animate={{ width: i < stepIndex ? '100%' : i === stepIndex ? (i === 2 ? `${Math.max(12, renderPct)}%` : stage === 'running' ? `${Math.max(10, (lines / log.length) * 100)}%` : '35%') : '0%' }}
                        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                      />
                    </span>
                    <span className={`text-[11.5px] font-medium transition-colors ${i <= stepIndex ? 'text-white/80' : 'text-white/35'}`}>{s.label}</span>
                  </li>
                ))}
              </ol>
            </header>

            <AnimatePresence mode="wait" initial={false}>
              {stage === 'compose' && (
                <motion.form
                  key="compose"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="flex min-h-0 flex-1 flex-col"
                  onSubmit={(e) => {
                    e.preventDefault()
                    start()
                  }}
                >
                  <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-5">
                    <Link to="/connect" onClick={onClose} className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-mblue/25 bg-mblue/[0.06] p-3.5 text-[13px] font-medium text-mblue">
                      <span>Connect local sessions <span className="mt-1 block text-[11px] font-normal text-white/50">Make a real reel from your own Claude Code session.</span></span>
                      <ArrowRight size={18} className="shrink-0" />
                    </Link>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-white/55" id="repo-label">
                        Repository
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px] text-white/45">
                        <span className="size-1.5 rounded-full bg-white/35" /> Sample session demo
                      </span>
                    </div>
                    <div role="radiogroup" aria-labelledby="repo-label" className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1">
                      {REPOS.map((r) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={repo === r}
                          key={r}
                          onClick={() => setRepo(r)}
                          className={`h-9 shrink-0 rounded-full border px-3.5 font-mono text-[12.5px] transition ${repo === r ? 'border-mblue bg-mblue/12 text-mblue' : 'border-white/14 text-white/70 hover:border-white/35'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <label className="mt-7 block text-[13px] font-medium text-white/55" htmlFor="prompt">
                      What should Claude do?
                    </label>
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          start()
                        }
                      }}
                      rows={4}
                      autoFocus
                      placeholder="Describe the change like you would to a teammate"
                      className="mt-2.5 w-full resize-none rounded-2xl border border-white/14 bg-white/[0.03] p-4 font-serif text-[21px] leading-snug italic outline-none placeholder:text-white/28 focus:border-mblue/60 focus:bg-white/[0.05]"
                    />
                    <p className="mt-5 text-[12px] font-medium tracking-wide text-white/40 uppercase">Try</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {PROMPTS.map((p) => (
                        <button
                          type="button"
                          key={p}
                          onClick={() => setPrompt(p)}
                          className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3.5 py-2 text-left text-[14px] transition active:scale-[0.99] ${prompt === p ? 'border-mblue/60 bg-mblue/8 text-white' : 'border-white/10 text-white/75 hover:border-white/25 hover:text-white'}`}
                        >
                          {p}
                          <ArrowRight size={15} className="shrink-0 opacity-40" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 border-t border-white/10 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                    <button
                      type="submit"
                      disabled={!prompt.trim()}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mblue text-[15px] font-semibold text-black transition enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:opacity-35"
                    >
                      Try the sample session
                    </button>
                    <p className="mt-2.5 text-center text-[12px] text-white/45">A simulated session with a sample reel. No code runs on your machine in this demo.</p>
                  </div>
                </motion.form>
              )}

              {(stage === 'running' || stage === 'rendering') && (
                <motion.div
                  key="running"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="flex min-h-0 flex-1 flex-col px-4 py-5"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between text-[13px] text-white/60">
                    <span className="flex items-center gap-2">
                      <span className="relative flex size-2">
                        {stage === 'running' && <span className="absolute inline-flex size-full animate-ping rounded-full bg-mgreen opacity-60" />}
                        <span className={`relative inline-flex size-2 rounded-full ${stage === 'running' ? 'bg-mgreen' : 'bg-white/30'}`} />
                      </span>
                      {stage === 'running' ? 'Playing the sample session' : 'Sample session finished'}
                    </span>
                    <Elapsed running={stage === 'running'} />
                  </div>
                  <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07090c]">
                    <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-white/8 px-3.5">
                      <span className="size-2.5 rounded-full bg-white/12" />
                      <span className="size-2.5 rounded-full bg-white/12" />
                      <span className="size-2.5 rounded-full bg-white/12" />
                      <span className="ml-2 truncate font-mono text-[11.5px] text-white/40">claude · ~/{repo}</span>
                    </div>
                    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4 font-mono text-[12.5px] leading-[1.75]">
                      {log.slice(0, lines).map((l, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                          <LogLine kind={l.kind} text={l.text} />
                        </motion.div>
                      ))}
                      {stage === 'running' && <span className="mt-1 inline-block h-4 w-2 animate-pulse bg-white/70 align-middle" />}
                      <div ref={logEnd} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {stage === 'rendering' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <div className="flex items-center gap-2 pt-5 pb-3 text-[13px] font-medium text-white/80">
                          <Sparkles size={15} className="text-myellow" /> Turning it into reels
                        </div>
                        <ul className="space-y-2.5">
                          {RENDER_STEPS.map((s, i) => (
                            <li key={s} className={`flex items-center gap-3 text-[14px] transition-colors ${i <= step ? 'text-white' : 'text-white/35'}`}>
                              <span className="grid size-5 place-items-center">
                                {i < step ? (
                                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                                    <Check size={18} className="text-mgreen" />
                                  </motion.span>
                                ) : i === step ? (
                                  <Loader2 size={17} className="animate-spin text-mblue" />
                                ) : (
                                  <span className="size-1.5 rounded-full bg-white/25" />
                                )}
                              </span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {stage === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex min-h-0 flex-1 flex-col items-center gap-3.5 px-4 pt-4"
                >
                  <div className="relative aspect-[9/16] min-h-0 flex-1 overflow-hidden rounded-2xl bg-black ring-1 ring-white/12">
                    <ReelPlayer reel={draft} active muted={muted} />
                  </div>
                  <div className="w-full shrink-0 pb-[max(16px,env(safe-area-inset-bottom))]">
                    <label htmlFor="caption" className="sr-only">
                      Caption
                    </label>
                    <textarea
                      id="caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-[14px] leading-snug outline-none focus:border-mblue/60"
                    />
                    <p className="mt-2 mb-3 text-center text-[12.5px] text-white/50">This sample reel is added to your current demo feed.</p>
                    <button
                      type="button"
                      onClick={() => onPublish({ ...draft, id: `r-new-${Date.now()}`, caption: caption.trim() || draft.caption })}
                      className="h-12 w-full rounded-xl bg-mblue text-[15px] font-semibold text-black transition hover:brightness-110 active:scale-[0.98]"
                    >
                      Share to feed
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
