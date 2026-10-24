import { Check, Copy } from 'lucide-react'
import { MotionConfig } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Explore } from '../components/landing/Explore'
import { SoundCtx, type LandingSound } from '../components/landing/sound'
import { WaitlistProvider, WaitlistSticker } from '../components/landing/Waitlist'
import { useWaitlist } from '../components/landing/waitlistState'
import { Workbench } from '../components/landing/Workbench'

const COMMAND = 'npx learnagram connect'

function Header() {
  const { email, focusCard } = useWaitlist()
  return (
    <header className="mx-auto flex h-16 w-full max-w-[1360px] min-[1800px]:max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-10">
      <Link to="/" aria-label="Learnagram" className="-m-1 rounded-lg p-1">
        <Logo />
      </Link>
      <nav aria-label="Main" className="flex items-center gap-2 sm:gap-6">
        <Link to="/app" className="hidden h-10 items-center rounded-md text-[15px] text-dim transition-colors hover:text-chalk sm:inline-flex">
          Open the demo app
        </Link>
        <button type="button" onClick={focusCard} className="h-10 rounded-full bg-chalk px-4 text-[14.5px] font-semibold text-night transition hover:bg-white active:scale-[0.98]">
          {email ? 'You’re on the waitlist' : 'Join the waitlist'}
        </button>
      </nav>
    </header>
  )
}

function CopyCommand() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND)
    } catch {
      // clipboard can be blocked; the command is still selectable
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-ink py-0.5 pr-0.5 pl-2.5 align-middle ring-1 ring-line">
      <code className="truncate font-mono text-[14px] text-chalk">{COMMAND}</code>
      <button type="button" onClick={copy} aria-label={copied ? 'Copied' : 'Copy command'} className="grid size-9 shrink-0 place-items-center rounded-md text-dim transition hover:bg-white/5 hover:text-chalk">
        {copied ? <Check size={16} className="text-mgreen" /> : <Copy size={15} />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </span>
  )
}

const STEPS = [
  <>
    Run <CopyCommand /> in a project where you use Claude Code.
  </>,
  <>Learnagram reads the session transcripts Claude Code already keeps on your machine and picks out the changes worth explaining.</>,
  <>Reels show up in your feed. Comment to ask the agent why it did something. When it needs a decision, you get a poll.</>,
]

function Closing() {
  return (
    <section aria-labelledby="close-title" className="mx-auto grid w-full max-w-[1360px] min-[1800px]:max-w-[1600px] gap-x-14 gap-y-12 px-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:px-10 lg:pb-32 xl:gap-x-20">
      <h2 id="close-title" className="max-w-[12em] font-serif text-[clamp(40px,5vw,76px)] leading-[1] tracking-[-0.02em] text-balance italic lg:col-start-1">
        Learn from every session you ship.
      </h2>
      <div className="lg:col-start-1 lg:row-start-2">
        <ol className="flex max-w-[40rem] flex-col gap-6">
          {STEPS.map((s, i) => (
            <li key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline text-[17px] leading-[1.6] text-chalk/90">
              <span aria-hidden className="font-serif text-[26px] leading-none text-mblue italic">
                {i + 1}
              </span>
              <p>{s}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 pl-[2.25rem] text-[15px] text-dim">Works with Claude Code today. Codex and Cursor are next.</p>
      </div>
      {/* after the steps in reading order; beside them on desktop */}
      <div className="flex justify-center sm:justify-start lg:col-start-2 lg:row-start-2 lg:items-start lg:justify-end">
        <WaitlistSticker id="email-close" />
      </div>
    </section>
  )
}

export default function Landing() {
  const [audio, setAudio] = useState({ on: false, ready: false })
  const [viewer, setViewer] = useState<number | null>(null)
  useEffect(() => {
    const prev = document.title
    document.title = 'Learnagram: understand what your coding agent shipped'
    return () => {
      document.title = prev
    }
  }, [])
  const sound = useMemo<LandingSound>(
    () => ({
      ...audio,
      set: (on: boolean) => flushSync(() => setAudio((a) => ({ on, ready: a.ready || on }))),
    }),
    [audio],
  )

  return (
    <MotionConfig reducedMotion="user">
    <SoundCtx.Provider value={sound}>
      <WaitlistProvider>
        <div className="landing min-h-dvh overflow-x-clip bg-night text-chalk">
          <a href="#hero-title" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-chalk focus:px-3 focus:py-2 focus:text-night">
            Skip to content
          </a>
          <Header />
          <main>
            <Workbench suspended={viewer !== null} />
            <Explore open={viewer} setOpen={setViewer} />
            <Closing />
          </main>
          <footer className="mx-auto flex w-full max-w-[1360px] min-[1800px]:max-w-[1600px] flex-col gap-4 px-4 pt-8 pb-12 text-[14px] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
            <Logo />
            <span>Built for the AI for Learning track by team somehow.</span>
            <Link to="/app" className="-my-2 self-start rounded-md py-2 text-chalk underline decoration-line underline-offset-4 transition hover:decoration-mblue sm:self-auto">
              Open the demo app
            </Link>
          </footer>
        </div>
      </WaitlistProvider>
    </SoundCtx.Provider>
    </MotionConfig>
  )
}
