import type { PlayerRef } from '@remotion/player'
import {
  ArrowDown,
  ArrowUpRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Send,
  Signal,
  Volume2,
  VolumeX,
  Wifi,
} from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react'
import { flushSync } from 'react-dom'
import { COMPOSITIONS, type ReelKind } from '../../reels/registry'
import { LandingPlayer, ReelBoundary } from './Reel'
import { posterFrame } from './poster'
import { blessPlayer, useLandingSound } from './sound'
import './ProductStage.css'

const TOPICS: {
  kind: ReelKind
  label: string
  title: string
  prompt: string
  file: string
  before: string
  after: string
  code: string[]
}[] = [
  {
    kind: 'index',
    label: 'Indexes',
    title: 'Why did Claude add this index?',
    prompt: 'make the orders page faster',
    file: '0042_orders_index.sql',
    before: '1.8 s',
    after: '4 ms',
    code: ['+ CREATE INDEX idx_orders_user_id', '+   ON orders (user_id);'],
  },
  {
    kind: 'race',
    label: 'Race conditions',
    title: 'Two taps. Two charges. One bug.',
    prompt: 'fix the double charge bug',
    file: 'src/payments/charge.ts',
    before: '2 charges',
    after: '1 charge',
    code: ['+ await db.transaction(async (tx) => {', '+   await tx.lock(wallet.id);'],
  },
  {
    kind: 'injection',
    label: 'SQL injection',
    title: 'The login query with an open door.',
    prompt: 'secure the login lookup',
    file: 'src/auth/lookup.ts',
    before: 'unsafe query',
    after: 'parameterized',
    code: ["- `WHERE email = '${email}'`", '+ query("WHERE email = $1", [email])'],
  },
]

/** A single real reel, wrapped in the feed it belongs to. */
export function ProductStage({ suspended = false }: { suspended?: boolean }) {
  const sound = useLandingSound()
  const reduce = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<PlayerRef>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [topicIndex, setTopicIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [visible, setVisible] = useState(false)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const [resumeAt, setResumeAt] = useState(() => posterFrame('index'))
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const interacted = useRef(false)
  const autoStarted = useRef(false)
  const lastFrame = useRef(posterFrame('index'))
  const topic = TOPICS[topicIndex]
  const shouldPlay = playing && visible && !hidden && !suspended

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 })
    observer.observe(stage)
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    if (reduce && !interacted.current) {
      setPlaying(false)
      return
    }
    if (!visible || hidden || reduce || interacted.current) return
    const timer = window.setTimeout(() => {
      if (!autoStarted.current) {
        autoStarted.current = true
        lastFrame.current = 40
        playerRef.current?.seekTo(40)
      }
      setPlaying(true)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [visible, hidden, reduce])

  useLayoutEffect(() => {
    const player = playerRef.current
    if (!player) return
    player.seekTo(lastFrame.current)
    if (sound.on) player.unmute()
    else player.mute()
  }, [topic.kind, sound.ready, sound.on])

  useEffect(() => {
    const player = playerRef.current
    if (!player) return
    if (shouldPlay) player.play()
    else player.pause()
  }, [shouldPlay, topic.kind, sound.ready])

  useEffect(() => {
    const player = playerRef.current
    if (!player) return
    const onFrame = (event: { detail: { frame: number } }) => {
      lastFrame.current = event.detail.frame
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${event.detail.frame / (COMPOSITIONS[topic.kind].frames - 1)})`
    }
    const onEnded = () => {
      player.seekTo(0)
      if (shouldPlay) player.play()
    }
    player.addEventListener('frameupdate', onFrame)
    player.addEventListener('ended', onEnded)
    return () => {
      player.removeEventListener('frameupdate', onFrame)
      player.removeEventListener('ended', onEnded)
    }
  }, [topic.kind, sound.ready, shouldPlay])

  const changeTopic = (index: number) => {
    interacted.current = true
    const next = (index + TOPICS.length) % TOPICS.length
    lastFrame.current = posterFrame(TOPICS[next].kind)
    setResumeAt(lastFrame.current)
    setTopicIndex(next)
    setLiked(false)
    setSaved(false)
  }

  const togglePlayback = (event: SyntheticEvent) => {
    interacted.current = true
    if (!playing) playerRef.current?.play(event)
    else playerRef.current?.pause()
    setPlaying(!playing)
  }

  const toggleSound = (event: SyntheticEvent) => {
    if (sound.on) {
      playerRef.current?.mute()
      sound.set(false)
    } else {
      if (!sound.ready) flushSync(() => setResumeAt(playerRef.current?.getCurrentFrame() ?? lastFrame.current))
      sound.set(true)
      blessPlayer(playerRef.current, event, shouldPlay)
    }
  }

  return (
    <div id="live-demo" className="product-stage" ref={stageRef} aria-label="Interactive preview of Unvibe reels">
      <div className="product-stage__canvas">
        <div className="product-stage__halo" aria-hidden="true" />
        <div className="product-stage__orbit product-stage__orbit--one" aria-hidden="true" />
        <div className="product-stage__orbit product-stage__orbit--two" aria-hidden="true" />

        <div className="product-terminal" aria-hidden="true">
          <div className="product-terminal__bar">
            <span className="product-terminal__dots">
              <i />
              <i />
              <i />
            </span>
            <span>claude / shopfront-api</span>
            <ArrowUpRight size={12} />
          </div>
          <div className="product-terminal__body">
            <p className="product-terminal__prompt">
              <span>❯</span> {topic.prompt}
            </p>
            <p className="product-terminal__file">
              <span>✳</span> {topic.file}
            </p>
            <div className="product-terminal__code">
              {topic.code.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <p className="product-terminal__result">
              <s>{topic.before}</s>
              <span>→</span>
              <strong>{topic.after}</strong>
              <span className="product-terminal__cursor">▌</span>
            </p>
          </div>
          <div className="product-terminal__footer">
            <span className="product-terminal__status" /> session captured <span>1 new reel</span>
          </div>
        </div>

        <div className="product-stage__connector" aria-hidden="true">
          <svg viewBox="0 0 175 92" fill="none">
            <path d="M2 4C90-13 110 112 171 80" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" />
            <path d="m161 77 12 3-6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>the “why”, made visual</span>
        </div>

        <div className="product-phone">
          <div className="product-phone__side product-phone__side--volume" aria-hidden="true" />
          <div className="product-phone__side product-phone__side--power" aria-hidden="true" />
          <div className="product-phone__screen">
            <div className="product-phone__status" aria-hidden="true">
              <span>9:41</span>
              <div className="product-phone__island" />
              <span>
                <Signal size={11} fill="currentColor" />
                <Wifi size={11} />
                <i />
              </span>
            </div>
            <div className="product-phone__header">
              <span>
                Reels <ChevronRight size={13} />
              </span>
              <span className="product-phone__wordmark">unvibe</span>
              <MoreHorizontal size={18} />
            </div>
            <div className="product-phone__video">
              <div aria-hidden="true" style={{ width: '100%', height: '100%' }}>
                <ReelBoundary
                  resetKey={topic.kind}
                  fallback={
                    <div className="product-phone__fallback">
                      <span>FROM YOUR LAST SESSION</span>
                      <strong>{topic.title}</strong>
                      <p>Understand the code behind the commit.</p>
                    </div>
                  }
                >
                  <LandingPlayer kind={topic.kind} playerRef={playerRef} audioReady={sound.ready} initialFrame={resumeAt} />
                </ReelBoundary>
              </div>
              <div className="product-phone__progress" aria-hidden="true">
                <div ref={progressRef} />
              </div>
              <div className="product-phone__live">
                <span /> YOUR CODE. EXPLAINED.
              </div>
              <div className="product-phone__reel-actions">
                <button
                  type="button"
                  aria-label={liked ? 'Unlike this reel' : 'Like this reel'}
                  aria-pressed={liked}
                  onClick={() => setLiked(!liked)}
                  className={liked ? 'is-liked' : ''}
                >
                  <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
                  <span>{liked ? '129' : '128'}</span>
                </button>
                <a href="/app" aria-label="Ask the agent a question in the demo app">
                  <MessageCircle size={22} />
                  <span>Ask why</span>
                </a>
                <button
                  type="button"
                  aria-label={saved ? 'Unsave this reel' : 'Save this reel'}
                  aria-pressed={saved}
                  onClick={() => setSaved(!saved)}
                >
                  <Bookmark size={21} fill={saved ? 'currentColor' : 'none'} />
                  <span>{saved ? 'Saved' : 'Save'}</span>
                </button>
              </div>
              <div className="product-phone__caption">
                <div>
                  <span className="product-phone__avatar">u</span>
                  <strong>your.last.session</strong>
                  <span className="product-phone__follow">Following</span>
                </div>
                <p>{topic.title}</p>
                <span>Original audio · your coding agent</span>
              </div>
            </div>
            <div className="product-phone__nav" aria-hidden="true">
              <Home size={18} fill="currentColor" />
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="10.7" cy="10.7" r="6.8" />
                <path d="m16 16 5 5" />
              </svg>
              <span className="product-phone__nav-reels">
                <Play size={14} fill="currentColor" />
              </span>
              <Send size={18} />
              <span className="product-phone__nav-avatar">you</span>
            </div>
            <div className="product-phone__home" aria-hidden="true" />
          </div>
        </div>

        <div className="product-aha" aria-hidden="true">
          <span className="product-aha__scribble">✳</span>
          <p>
            Aha.
            <br />
            <em>Now I get it.</em>
          </p>
          <span className="product-aha__foot">YOU, 45 SECONDS LATER.</span>
        </div>
        <div className="product-stage__note" aria-hidden="true">
          <ArrowDown size={15} />
          <span>
            A real reel.
            <br />
            Go on, press play.
          </span>
        </div>
      </div>

      <div className="product-stage__controls">
        <div className="product-stage__transport">
          <button type="button" onClick={() => changeTopic(topicIndex - 1)} aria-label="Previous reel">
            <ChevronLeft size={17} />
          </button>
          <button type="button" onClick={togglePlayback} className="product-stage__play" aria-label={playing ? 'Pause reel' : 'Play reel'}>
            {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            <span>{playing ? 'Pause' : 'Play reel'}</span>
          </button>
          <button type="button" onClick={() => changeTopic(topicIndex + 1)} aria-label="Next reel">
            <ChevronRight size={17} />
          </button>
          <span className="product-stage__controls-divider" />
          <button
            type="button"
            onClick={toggleSound}
            className="product-stage__sound"
            aria-label={sound.on ? 'Mute reel' : 'Turn reel sound on'}
            aria-pressed={sound.on}
          >
            {sound.on ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>Sound {sound.on ? 'on' : 'off'}</span>
          </button>
        </div>
        <div className="product-stage__topics" aria-label="Choose a reel">
          {TOPICS.map((item, index) => (
            <button key={item.kind} type="button" onClick={() => changeTopic(index)} aria-pressed={index === topicIndex}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
