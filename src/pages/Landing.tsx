import {
  ArrowDown,
  ArrowUpRight,
  Braces,
  ChevronDown,
  CirclePlay,
  Code2,
  Film,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { ReelPoster } from '../components/feed/ReelPoster'
import { Viewer } from '../components/landing/Explore'
import { ProductStage } from '../components/landing/ProductStage'
import { Pricing } from '../components/landing/Pricing'
import { ConnectionGuide } from '../components/landing/ConnectionGuide'
import { ReelBoundary } from '../components/landing/Reel'
import { SessionLab } from '../components/landing/SessionLab'
import { SignupForm, SignupLink } from '../components/landing/SignupSection'
import { EXPLORE } from '../components/landing/session'
import { SoundCtx, type LandingSound } from '../components/landing/sound'
import './Landing.css'

function Brand() {
  return (
    <Link to="/" className="uv-brand" aria-label="Unvibe home">
      <svg viewBox="0 0 38 38" width="34" height="34" fill="none" aria-hidden="true">
        <rect width="38" height="38" rx="11" fill="currentColor" />
        <path d="M11 11v11a8 8 0 0 0 16 0V11h-5v11a3 3 0 0 1-6 0V11z" fill="#f7f5ef" />
        <path d="m22 11 5-3v3z" fill="#f7f5ef" />
      </svg>
      <span>
        unvibe<span className="uv-brand-dot">.</span>
      </span>
    </Link>
  )
}

function Header() {
  return (
    <header className="uv-header uv-container">
      <Brand />
      <nav className="uv-navigation" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#the-feed">The good stuff</a>
        <a href="#pricing">Pricing</a>
        <Link to="/connect">Connect</Link>
      </nav>
      <SignupLink className="uv-button uv-button-small uv-button-ink">
        Join the waitlist <ArrowUpRight size={16} />
      </SignupLink>
    </header>
  )
}

function Hero({ suspended }: { suspended: boolean }) {
  return (
    <section className="uv-hero uv-container" aria-labelledby="hero-title">
      <div className="uv-hero-copy">
        <div className="uv-eyebrow">
          <span className="uv-status-dot" /> FOR THE CURIOUS SIDE OF YOUR BRAIN
        </div>
        <h1 id="hero-title">
          Your agent
          <br />
          shipped it.
          <br />
          <span className="uv-headline-last">
            Now <em>get it.</em>
            <svg viewBox="0 0 335 20" fill="none" aria-hidden="true">
              <path d="M3 15C74 2 232-2 331 8M30 18C139 9 253 5 316 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="uv-hero-description">
          The code works. But do you know <em>why?</em>
          <br />
          Download the companion. Turn your Claude Code sessions
          <br className="uv-desktop-break" /> into visual reels that make the code click.
        </p>
        <div id="signup" className="uv-hero-signup">
          <SignupForm variant="hero" />
        </div>
        <div className="uv-hero-actions">
          <a href="#how-it-works" className="uv-text-link">
            <CirclePlay size={21} strokeWidth={1.6} /> See how it works
          </a>
          <Link to="/app" className="uv-text-link uv-hero-demo-link">
            Try the demo <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="uv-hero-visual" inert={suspended || undefined}>
        <ProductStage suspended={suspended} />
      </div>
      <a href="#how-it-works" className="uv-scroll-note">
        A LITTLE SCROLL GOES A LONG WAY <ArrowDown size={13} />
      </a>
    </section>
  )
}

function PromiseStrip() {
  return (
    <div className="uv-promise-strip">
      <div className="uv-container uv-promise-inner">
        <p>
          A familiar scroll.
          <br />
          <strong>A very different aftertaste.</strong>
        </p>
        <span>
          <Code2 size={21} /> Real code. Real context.
        </span>
        <span>
          <Film size={21} /> The why, made visual.
        </span>
        <span>
          <MessageCircle size={21} /> Curiosity encouraged.
        </span>
        <Sparkles className="uv-strip-star" size={29} strokeWidth={1.2} aria-hidden="true" />
      </div>
    </div>
  )
}

function Capabilities() {
  return (
    <section id="capabilities" className="uv-how uv-container" aria-labelledby="capabilities-title">
      <div className="uv-section-heading">
        <div>
          <p className="uv-eyebrow">THE DIFF IS ONLY HALF THE STORY</p>
          <h2 id="capabilities-title">
            From “it works”
            <br />
            to <em>“I get it.”</em>
          </h2>
        </div>
        <p className="uv-section-description">
          That index. That security fix. That one decision you left to the agent. There’s a lesson in every session. Here’s what it could
          look like in your feed.
        </p>
      </div>
      <SessionLab />
      <div className="uv-how-caption">
        <span>
          <Braces size={15} /> Built around the code you’re already writing.
        </span>
        <span>Try a sample, or connect your own local sessions.</span>
      </div>
    </section>
  )
}

const SHELF = [
  {
    index: 0,
    number: '01',
    category: 'SECURITY',
    title: 'Your database has no bouncer.',
    description: 'Why row level security matters more than a public API key.',
    color: '#c0c9f5',
    tag: 'Row level security',
  },
  {
    index: 2,
    number: '02',
    category: 'PERFORMANCE',
    title: 'One page. Fifty-one queries.',
    description: 'Meet the tiny loop making a very big mess.',
    color: '#b9d9b4',
    tag: 'N+1 queries',
  },
  {
    index: 3,
    number: '03',
    category: 'RELIABILITY',
    title: 'Please stop asking so fast.',
    description: 'How retries can turn a small outage into a bigger one.',
    color: '#f2b59e',
    tag: 'Retries & backoff',
  },
]

function GoodStuff({ open, setOpen }: { open: number | null; setOpen: (value: number | null) => void }) {
  const sectionRef = useRef<HTMLElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    if (!sectionRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '250px' },
    )
    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])
  return (
    <section id="the-feed" ref={sectionRef} className="uv-good-stuff" aria-labelledby="feed-title">
      <div className="uv-container">
        <div className="uv-section-heading">
          <div>
            <p className="uv-eyebrow">GOOD RABBIT HOLES START HERE</p>
            <h2 id="feed-title">
              Same thumb.
              <br />
              <em>New superpowers.</em>
            </h2>
          </div>
          <div className="uv-feed-intro">
            <p>
              Security scares. Slow queries. Things you probably shipped last Tuesday. Get the story behind the code, one reel at a time.
            </p>
            <Link to="/app" className="uv-text-link">
              Explore the demo feed <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <div className="uv-reel-shelf">
          {SHELF.map((item) => {
            const reel = EXPLORE[item.index]
            return (
              <button
                key={item.index}
                type="button"
                className="uv-reel-tile"
                onClick={(event) => {
                  returnFocus.current = event.currentTarget
                  setOpen(item.index)
                }}
                aria-label={`Play ${item.tag} sample reel`}
              >
                <div className="uv-reel-art" style={{ '--tile-color': item.color } as CSSProperties}>
                  <div className="uv-reel-poster" aria-hidden="true">
                    <ReelBoundary resetKey={reel.kind}>
                      <ReelPoster reel={{ kind: reel.kind, topic: reel.topic, caption: reel.caption }} live={near} frame={105} />
                    </ReelBoundary>
                  </div>
                  <span className="uv-reel-category">{item.category}</span>
                  <span className="uv-reel-play">
                    <CirclePlay size={22} strokeWidth={1.5} /> Watch the reel
                  </span>
                  <span className="uv-reel-number">{item.number}</span>
                </div>
                <div className="uv-reel-text">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <span>
                    {item.tag}
                    <ArrowUpRight size={16} />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
        <p className="uv-demo-footnote">A taste of the demo feed. Example sessions, real concepts, plenty of aha moments.</p>
      </div>
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

const FAQS = [
  {
    question: 'Okay, what exactly is Unvibe?',
    answer:
      'A different way to understand the code your AI agent writes. The idea is to turn meaningful changes from a coding session into short, narrated visual explanations, with questions in the comments and decisions as polls. The interactive demo lets you try that experience with example sessions.',
  },
  {
    question: 'Can I connect my own coding sessions?',
    answer:
      'Yes. Download the companion, follow its setup instructions, and connect Claude Code on your computer. Pick a saved session, review the transcript, then generate your reel and MP4 locally. Claude usage follows your own provider plan. The sample feed remains available without setup.',
  },
  {
    question: 'Is this just another feed to get lost in?',
    answer:
      'The format is familiar, but the subject is the code you’re building. Each reel explains a specific change or concept: why an index helps, how a race condition happens, or what a security fix protects. Watch, ask a question, and carry that understanding back to your project.',
  },
  {
    question: 'What can I actually try in the demo?',
    answer:
      'Play narrated reels, scroll the feed, ask questions, answer polls, and try likes and saves. The sessions, social activity, and agent replies are sample content. Questions use scripted responses, and interactions stay in your browser. No account or project access is required.',
  },
]

function Questions() {
  return (
    <section id="questions" className="uv-questions uv-container" aria-labelledby="questions-title">
      <div>
        <p className="uv-eyebrow">THE VERY REASONABLE QUESTIONS</p>
        <h2 id="questions-title">
          Curious?
          <br />
          <em>Good.</em>
        </h2>
        <p className="uv-faq-aside">That’s kind of the whole point.</p>
      </div>
      <div className="uv-faq-list">
        {FAQS.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <ChevronDown size={19} />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default function Landing() {
  const [audio, setAudio] = useState({ on: false, ready: false })
  const [viewer, setViewer] = useState<number | null>(null)
  useEffect(() => {
    const previous = document.title
    document.title = 'Unvibe — your agent shipped it. Now get it.'
    return () => {
      document.title = previous
    }
  }, [])
  const sound = useMemo<LandingSound>(
    () => ({ ...audio, set: (on: boolean) => flushSync(() => setAudio((current) => ({ on, ready: current.ready || on }))) }),
    [audio],
  )
  return (
    <MotionConfig reducedMotion="user">
      <SoundCtx.Provider value={sound}>
        <div className="uv-landing">
          <a href="#hero-title" className="uv-skip-link">
            Skip to content
          </a>
          <Header />
          <main>
            <Hero suspended={viewer !== null} />
            <PromiseStrip />
            <ConnectionGuide />
            <Capabilities />
            <GoodStuff open={viewer} setOpen={setViewer} />
            <Pricing />
            <Questions />
          </main>
          <footer className="uv-footer uv-container">
            <Brand />
            <p>For builders who give a damn about the why.</p>
            <span>
              Made by team somehow <span aria-hidden="true">↗</span>
            </span>
          </footer>
        </div>
      </SoundCtx.Provider>
    </MotionConfig>
  )
}
