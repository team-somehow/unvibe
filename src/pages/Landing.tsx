import { Thumbnail } from '@remotion/player'
import { AnimatePresence, motion } from 'motion/react'
import { Heart, MessageCircle, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { ReelPlayer } from '../components/ReelPlayer'
import { COMPOSITIONS, FPS, HEIGHT, WIDTH, type ReelKind } from '../reels/registry'

const CYCLE: ReelKind[] = ['index', 'injection', 'race', 'jwt']
const CAPTIONS: Record<string, string> = {
  index: 'Claude added one line to a migration and my orders page got 400x faster.',
  injection: 'My login lookup was one quote away from dumping every user.',
  race: 'A double-tap on Pay spent money twice. Here is the race condition.',
  jwt: 'I put the user role in a JWT and assumed nobody could read it.',
}

function Waitlist({ id }: { id: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'error' | 'done'>('idle')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setState('error')
    try {
      const list = JSON.parse(localStorage.getItem('waitlist') ?? '[]')
      localStorage.setItem('waitlist', JSON.stringify([...new Set([...list, email])]))
    } catch {
      // storage can be blocked; the confirmation still shows
    }
    setState('done')
  }

  return (
    <div className="w-full max-w-[460px]">
      <AnimatePresence mode="wait">
        {state === 'done' ? (
          <motion.p key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-mgreen/40 bg-mgreen/10 px-5 py-4 text-[15px] leading-relaxed text-chalk" role="status">
            You're on the list. We'll email <span className="font-medium text-mgreen">{email}</span> when the beta opens.
          </motion.p>
        ) : (
          <motion.form key="form" exit={{ opacity: 0 }} onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={id} className="sr-only">Email address</label>
            <input
              id={id}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (state === 'error') setState('idle')
              }}
              placeholder="you@company.com"
              aria-invalid={state === 'error'}
              className={`h-12 w-full min-w-0 rounded-xl border sm:flex-1 bg-night-2/80 px-4 text-[15px] text-chalk outline-none placeholder:text-dim/70 focus:border-mblue ${state === 'error' ? 'border-mred' : 'border-line'}`}
            />
            <button className="h-12 shrink-0 rounded-xl bg-myellow px-5 text-[15px] font-semibold text-night transition hover:brightness-105 active:scale-[0.98]">
              Join the waitlist
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      {state === 'error' && <p className="mt-2 text-[13px] text-mred">Enter an email like name@company.com.</p>}
    </div>
  )
}

function Phone() {
  const [i, setI] = useState(0)
  const kind = CYCLE[i % CYCLE.length]
  return (
    <div className="relative mx-auto w-[min(300px,72vw)] lg:w-[340px]">
      <div className="relative aspect-[9/19] overflow-hidden rounded-[44px] border-[10px] border-[#1a1d22] bg-black shadow-[0_40px_120px_-20px_rgba(88,196,221,0.35)]">
        <div className="absolute top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute inset-0 top-6">
          <ReelPlayer key={kind} reel={{ kind }} active loop={false} onEnded={() => setI((n) => n + 1)} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute right-3 bottom-16 flex flex-col items-center gap-4 text-white">
          <Heart size={22} className="fill-mred text-mred" />
          <MessageCircle size={22} className="-scale-x-100" />
          <Send size={20} />
        </div>
        <div className="absolute bottom-5 left-4 right-14 text-[12px] leading-snug text-white/90">
          <span className="font-semibold">you</span> {CAPTIONS[kind]}
        </div>
        <div className="absolute inset-x-6 bottom-2 flex gap-1">
          {CYCLE.map((k, j) => (
            <span key={k} className={`h-0.5 flex-1 rounded-full ${j === i % CYCLE.length ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute top-[58%] -right-4 w-56 rounded-2xl border border-line bg-night-2/95 p-3 text-[12.5px] leading-snug shadow-2xl backdrop-blur sm:-right-24"
      >
        <div className="mb-1 flex items-center gap-1.5 font-semibold">
          <span className="size-2 rounded-full bg-[#D97757]" /> Claude
        </div>
        Each insert also updates the index, so writes get slightly slower. Your reads outnumber writes 50 to 1.
      </motion.div>
    </div>
  )
}

const TRANSCRIPT: { t: string; reel?: ReelKind; note?: string }[] = [
  { t: '> the orders page is really slow, fix it' },
  { t: '⏺ Bash(psql -c "EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42")' },
  { t: '  ⎿ Seq Scan on orders (cost=0.00..48213.00) 1.8s' },
  { t: '⏺ Update(migrations/0042_orders_index.sql)', reel: 'index', note: 'Why a single index made this 400x faster' },
  { t: '⏺ Read(src/auth/lookup.ts)' },
  { t: '⏺ Update(src/auth/lookup.ts): use a parameterized query', reel: 'injection', note: 'The SQL injection hiding in the old lookup' },
  { t: '⏺ Update(src/payments/charge.ts): SELECT … FOR UPDATE', reel: 'race', note: 'How two taps on Pay spent money twice' },
  { t: '⏺ Bash(npm test)' },
  { t: '  ⎿ 42 passed' },
]

function Transcript() {
  const [hover, setHover] = useState<ReelKind>('index')
  const marked = TRANSCRIPT.filter((l) => l.reel)
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
      <div className="overflow-x-auto rounded-2xl border border-line bg-[#040c16] p-5 font-mono text-[12.5px] leading-[2] sm:p-6 sm:text-[13px]">
        {TRANSCRIPT.map((l, i) =>
          l.reel ? (
            <button
              key={i}
              onMouseEnter={() => setHover(l.reel!)}
              onFocus={() => setHover(l.reel!)}
              onClick={() => setHover(l.reel!)}
              className={`-mx-2 block w-[calc(100%+16px)] rounded-md px-2 text-left whitespace-nowrap transition ${hover === l.reel ? 'bg-myellow/12 text-myellow' : 'text-chalk underline decoration-myellow/60 decoration-dotted underline-offset-4'}`}
            >
              {l.t}
            </button>
          ) : (
            <div key={i} className={`whitespace-nowrap ${l.t.startsWith('>') ? 'text-chalk' : 'text-dim'}`}>{l.t}</div>
          ),
        )}
      </div>
      <div className="flex gap-5">
        <div className="w-[140px] shrink-0 overflow-hidden rounded-2xl ring-1 ring-line sm:w-[170px]">
          <Thumbnail
            key={hover}
            component={COMPOSITIONS[hover].component}
            compositionWidth={WIDTH}
            compositionHeight={HEIGHT}
            durationInFrames={COMPOSITIONS[hover].frames}
            fps={FPS}
            frameToDisplay={Math.floor(COMPOSITIONS[hover].frames * 0.5)}
            style={{ width: '100%', aspectRatio: '9 / 16' }}
          />
        </div>
        <ul className="flex flex-col gap-4 pt-1">
          {marked.map((l) => (
            <li key={l.reel}>
              <button onClick={() => setHover(l.reel!)} onMouseEnter={() => setHover(l.reel!)} className={`text-left font-serif text-[19px] leading-snug italic transition ${hover === l.reel ? 'text-myellow' : 'text-dim hover:text-chalk'}`}>
                {l.note}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const STEPS = [
  { title: 'Connect Claude Code', body: 'One command links Learnagram to the session transcripts Claude Code already keeps on your machine.', code: 'npx learnagram connect' },
  { title: 'Sessions become reels', body: 'Each session is cut into 30-second explainers of the decisions that mattered, animated like a good math lecture.' },
  { title: 'Scroll, ask, decide', body: 'Comment to ask the agent that did the work. When it needs a decision from you, it shows up as a poll in your feed.' },
]

export default function Landing() {
  return (
    <div className="min-h-dvh bg-night text-chalk">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px] opacity-60"
        style={{
          backgroundImage: 'linear-gradient(rgba(88,196,221,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(88,196,221,0.07) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 60% 30%, black, transparent)',
        }}
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-5 text-[14px]">
          <a href="#how" className="hidden text-dim hover:text-chalk sm:inline">How it works</a>
          <Link to="/app" className="rounded-full border border-line px-4 py-2 font-medium transition hover:border-mblue hover:text-mblue">
            Try the demo
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16 lg:pb-28">
        <div>
          <h1 className="font-serif text-[clamp(44px,7vw,84px)] leading-[0.98] font-normal tracking-[-0.02em] italic">
            You shipped it.
            <br />
            Do you understand it?
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-dim sm:text-[18px]">
            Learnagram turns your Claude Code sessions into short explainer reels. Scroll through what your agent changed, why it mattered, and what would have broken without it.
          </p>
          <div className="mt-8">
            <Waitlist id="email-hero" />
            <p className="mt-3 text-[13px] text-dim">Works with Claude Code today. Codex and Cursor are next.</p>
          </div>
        </div>
        <Phone />
      </section>

      <section className="relative border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="max-w-2xl font-serif text-[clamp(32px,4.5vw,52px)] leading-[1.05] italic">The lines you approved without reading</h2>
          <p className="mt-5 mb-12 max-w-[36rem] text-[17px] leading-relaxed text-dim">
            An agent makes dozens of decisions in one session. Most are routine. A few are the difference between a fast app and a breach, and they scroll past in the terminal. Learnagram finds those and explains them.
          </p>
          <Transcript />
        </div>
      </section>

      <section id="how" className="relative border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="font-serif text-[clamp(32px,4.5vw,52px)] leading-[1.05] italic">How it works</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t border-line pt-6">
                <span className="font-serif text-[40px] leading-none text-mblue italic">{i + 1}</span>
                <h3 className="mt-4 text-[19px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-dim">{s.body}</p>
                {s.code && <code className="mt-4 inline-block rounded-lg border border-line bg-[#040c16] px-3 py-2 font-mono text-[13px] text-myellow">{s.code}</code>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="max-w-3xl font-serif text-[clamp(36px,5.5vw,68px)] leading-[1.02] italic">Learn from every session you ship.</h2>
          <Waitlist id="email-footer" />
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-[13px] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <span>Built for the AI for Learning track by team somehow.</span>
        </div>
      </footer>
    </div>
  )
}
