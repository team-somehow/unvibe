import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Download,
  Film,
  FolderOpen,
  KeyRound,
  Loader2,
  LockKeyhole,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  Terminal,
  Unplug,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseLesson, type GeneratedLesson } from '../../shared/lesson'
import { ReelPlayer } from '../components/ReelPlayer'
import { ME, type Reel } from '../data/reels'
import {
  CompanionClient,
  DEFAULT_BRIDGE,
  forgetConnection,
  initialConnection,
  rememberConnection,
  type CompanionStatus,
  type GenerationJob,
  type LocalSession,
  type SessionPreview,
} from '../lib/companion'
import { saveGeneratedReel } from '../lib/library'
import './Landing.css'
import './Connect.css'

const ACTIVE = new Set(['queued', 'analyzing', 'narrating', 'rendering'])
const HOSTED_COMPANION = !['localhost', '127.0.0.1'].includes(window.location.hostname)
const COMPANION_SETUP = HOSTED_COMPANION
  ? 'tar -xzf unvibe-companion.tar.gz\ncd unvibe-companion\nnpm install\nLEARNAGRAM_FRONTEND_URL=https://unvibe-learnagram.web.app/connect npm run companion'
  : 'npm run companion'
const failure = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong. Try again.')
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
function jobReel(job: GenerationJob, lesson: GeneratedLesson): Reel {
  return {
    id: `r-generated-${job.id}`,
    kind: 'generated',
    author: ME,
    caption: lesson.summary,
    session: { repo: lesson.repo, title: lesson.title, when: 'now' },
    likes: 0,
    shares: 0,
    comments: [],
    topic: 'Your session',
    suggestions: lesson.takeaways.slice(0, 3).map((takeaway) => `Explain: ${takeaway}`),
    props: { lesson },
  }
}

export default function Connect() {
  const navigate = useNavigate()
  const [connection, setConnection] = useState(initialConnection)
  const [client, setClient] = useState<CompanionClient | null>(null)
  const [status, setStatus] = useState<CompanionStatus | null>(null)
  const [sessions, setSessions] = useState<LocalSession[]>([])
  const [preview, setPreview] = useState<SessionPreview | null>(null)
  const [selected, setSelected] = useState('')
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null)
  const [provider, setProvider] = useState<'claude' | 'local'>('claude')
  const [narrate, setNarrate] = useState(false)
  const [render, setRender] = useState(true)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const alive = useRef(true)
  const attemptedInitialPair = useRef(false)
  const selectionRequest = useRef(0)
  const job = jobs.find((item) => item.id === jobId) ?? null
  const running = jobs.some((item) => ACTIVE.has(item.status))

  useEffect(() => {
    alive.current = true
    const fragment = new URLSearchParams(location.hash.slice(1))
    if (fragment.has('token') || fragment.has('companionToken')) history.replaceState(null, '', location.pathname + location.search)
    const previous = document.title
    document.title = 'Connect your machine · Unvibe'
    return () => {
      alive.current = false
      document.title = previous
    }
  }, [])

  const pair = useCallback(async () => {
    setError('')
    setBusy('pair')
    try {
      const candidate = new CompanionClient(connection)
      const result = await candidate.status()
      if (result.service !== 'learnagram-companion') throw new Error('This address is not an Unvibe companion.')
      const [sessionData, jobData] = await Promise.all([candidate.sessions(), candidate.jobs()])
      if (!alive.current) return
      rememberConnection(candidate.connection)
      setStatus(result)
      setClient(candidate)
      setSessions(sessionData.sessions)
      setJobs(jobData.jobs)
      setConnection(candidate.connection)
      const latest = jobData.jobs[0]
      if (latest) setJobId(latest.id)
    } catch (cause) {
      if (alive.current) setError(failure(cause))
    } finally {
      if (alive.current) setBusy(null)
    }
  }, [connection])

  useEffect(() => {
    if (attemptedInitialPair.current) return
    attemptedInitialPair.current = true
    if (connection.token) void pair()
  }, [connection.token, pair])

  useEffect(() => {
    if (!client) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try {
        const response = await client.jobs()
        if (!stopped) {
          setJobs(response.jobs)
          timer = setTimeout(refresh, response.jobs.some((item) => ACTIVE.has(item.status)) ? 1500 : 6000)
        }
      } catch (cause) {
        if (!stopped) {
          setError(failure(cause))
          timer = setTimeout(refresh, 10000)
        }
      }
    }
    timer = setTimeout(refresh, 1200)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [client])

  useEffect(() => {
    let stopped = false
    setLesson(null)
    setPlaying(false)
    setMuted(true)
    if (job?.lesson && client) {
      client
        .playableLesson(job)
        .then((value) => {
          if (!stopped) setLesson(value)
        })
        .catch((cause) => {
          if (!stopped) setError(failure(cause))
        })
    }
    return () => {
      stopped = true
    }
    // The completed lesson is immutable; polling progress must not restart its player or audio fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.status, client])

  const select = async (session: LocalSession) => {
    if (!client) return
    const request = ++selectionRequest.current
    setSelected(session.id)
    setPreview(null)
    setConsent(false)
    setError('')
    setBusy('preview')
    try {
      const result = await client.preview(session.id)
      if (alive.current && request === selectionRequest.current) setPreview(result)
    } catch (cause) {
      if (alive.current && request === selectionRequest.current) setError(failure(cause))
    } finally {
      if (alive.current && request === selectionRequest.current) setBusy(null)
    }
  }

  const generate = async () => {
    if (!client || !preview || (provider === 'claude' && !consent)) return
    setError('')
    setBusy('generate')
    setLesson(null)
    try {
      const result = await client.create(selected, { provider, narrate, render, transcriptHash: preview.transcriptHash })
      setJobs((items) => [result.job, ...items.filter((item) => item.id !== result.job.id)])
      setJobId(result.job.id)
    } catch (cause) {
      setError(failure(cause))
    } finally {
      setBusy(null)
    }
  }

  const action = async (name: string, work: () => Promise<unknown>) => {
    setError('')
    setBusy(name)
    try {
      await work()
    } catch (cause) {
      setError(failure(cause))
    } finally {
      setBusy(null)
    }
  }

  const disconnect = () => {
    forgetConnection()
    setClient(null)
    setStatus(null)
    setPreview(null)
    setSessions([])
    setJobs([])
    setJobId(null)
    setLesson(null)
    setError('')
    setConnection({ url: DEFAULT_BRIDGE, token: '' })
    selectionRequest.current++
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMPANION_SETUP)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setNotice('Select and copy the command below.')
    }
  }
  const visibleSessions = sessions.filter((item) => `${item.title} ${item.repo}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="uv-landing connect-page">
      <header className="connect-header uv-container">
        <Link to="/" className="uv-brand">
          <span>
            unvibe<span className="uv-brand-dot">.</span>
          </span>
        </Link>
        <Link to="/app" className="uv-text-link">
          Back to the feed <ArrowRight size={16} />
        </Link>
      </header>
      <main className="uv-container connect-main">
        <div className="connect-intro">
          <div>
            <p className="uv-eyebrow">YOUR MACHINE → YOUR NEXT AHA</p>
            <h1>
              Make your own
              <br />
              <em>code click.</em>
            </h1>
          </div>
          <p>
            Turn a real Claude Code session into a reel.
            <br /> Choose the session, review what’s shared, and keep the finished video on your machine.
          </p>
        </div>
        <ol className="connect-progress" aria-label="Connection steps">
          {['Pair your machine', 'Pick a session', 'Make a reel'].map((label, index) => (
            <li
              key={label}
              className={
                (index === 0 && client) || (index === 1 && preview) || (index === 2 && job?.status === 'completed') ? 'is-complete' : ''
              }
            >
              <span>
                {(index === 0 && client) || (index === 1 && preview) || (index === 2 && job?.status === 'completed') ? (
                  <Check size={14} />
                ) : (
                  `0${index + 1}`
                )}
              </span>
              {label}
              <ChevronRight size={15} aria-hidden />
            </li>
          ))}
        </ol>
        {error && (
          <div className="connect-alert" role="alert">
            <strong>Something needs attention.</strong>
            <p>{error}</p>
            <button type="button" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        )}
        {notice && (
          <div className="connect-notice" role="status">
            {notice}
          </div>
        )}
        {!client ? (
          <section className="connect-setup" aria-labelledby="pair-title">
            <div className="connect-setup-guide">
              <span className="connect-icon">
                <Monitor size={24} strokeWidth={1.4} />
              </span>
              <h2 id="pair-title">
                A little bridge.
                <br />A lot of understanding.
              </h2>
              <p>
                {HOSTED_COMPANION
                  ? 'Download the companion to the computer where you use Claude Code. It connects your local sessions to this app.'
                  : 'The browser can’t read your local sessions directly. Run the companion from this project folder to make the connection.'}
              </p>
              {HOSTED_COMPANION && (
                <a
                  className="uv-button uv-button-ink uv-button-small"
                  href="/downloads/unvibe-companion.tar.gz"
                  download="unvibe-companion.tar.gz"
                  style={{ marginTop: 18 }}
                >
                  <Download size={16} /> Download companion
                </a>
              )}
              <div className="connect-command">
                <div>
                  <Terminal size={15} />
                  <span>{HOSTED_COMPANION ? 'In your download folder · macOS / Linux' : 'After installing the project dependencies'}</span>
                </div>
                <code style={HOSTED_COMPANION ? { display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 11, lineHeight: 1.9, paddingBottom: 22 } : undefined}>
                  {COMPANION_SETUP}
                </code>
                <button type="button" onClick={copy} aria-label="Copy companion command">
                  {copied ? <Check size={17} /> : <Clipboard size={17} />}
                </button>
              </div>
              <ol className="connect-checklist">
                <li>
                  <span>1</span>
                  <p>
                    {HOSTED_COMPANION
                      ? 'Install Node.js 24+, download the companion, then extract the archive. The included README has Windows instructions.'
                      : <>Use Node.js 24+ and run <code>npm install</code> in this project.</>}
                  </p>
                </li>
                <li>
                  <span>2</span>
                  <p>Install and sign in to the official Claude Code CLI, then run a session in your own project.</p>
                </li>
                <li>
                  <span>3</span>
                  <p>
                    {HOSTED_COMPANION
                      ? 'Run the commands above in a terminal on this computer. Keep it running and open its private pairing link, or paste its token here.'
                      : 'Start the companion here. Open its pairing link or paste its token in this form.'}
                  </p>
                </li>
              </ol>
              <a className="uv-text-link" href="https://code.claude.com/docs/en/setup" target="_blank" rel="noreferrer">
                Claude Code setup instructions <ArrowRight size={14} />
              </a>
            </div>
            <form
              className="connect-pair-form"
              onSubmit={(event) => {
                event.preventDefault()
                void pair()
              }}
            >
              <p className="uv-eyebrow">
                <KeyRound size={14} /> PAIR THIS BROWSER
              </p>
              <h2>
                Your terminal has
                <br />
                the other half.
              </h2>
              <label htmlFor="bridge-url">Local companion address</label>
              <input
                id="bridge-url"
                value={connection.url}
                onChange={(event) => setConnection((current) => ({ ...current, url: event.target.value }))}
                type="url"
                required
                spellCheck={false}
                autoComplete="off"
              />
              <label htmlFor="bridge-token">Connection token</label>
              <input
                id="bridge-token"
                value={connection.token}
                onChange={(event) => setConnection((current) => ({ ...current, token: event.target.value }))}
                type="password"
                required
                placeholder="Paste from your terminal"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="connect-input-note">This pairs the local companion. It is not your Claude password or API key.</p>
              <button type="submit" className="uv-button uv-button-coral" disabled={busy === 'pair'}>
                {busy === 'pair' ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> Connecting…
                  </>
                ) : (
                  <>
                    Connect my machine <ArrowRight size={17} />
                  </>
                )}
              </button>
              <div className="connect-security-note">
                <LockKeyhole size={16} />
                <p>
                  The companion listens on localhost. Claude authentication stays in your CLI. Nothing is generated until you choose a
                  session.
                </p>
              </div>
            </form>
          </section>
        ) : (
          <>
            <div className="connect-status-bar">
              <span>
                <CheckCircle2 size={17} /> Machine connected
              </span>
              <span>
                Claude Code {status?.claude.version ?? ''} · {status?.claude.authenticated ? 'Signed in' : 'Sign-in needed'}
              </span>
              <span>{status?.narration?.available ? 'Voice available' : 'Visual reels available'}</span>
              <button
                type="button"
                onClick={() =>
                  void action('refresh', async () => {
                    const response = await client.sessions()
                    setSessions(response.sessions)
                    setStatus(await client.status())
                  })
                }
                aria-label="Refresh sessions"
              >
                <RefreshCw size={15} />
              </button>
              <button type="button" onClick={disconnect}>
                <Unplug size={14} /> Disconnect browser
              </button>
            </div>
            {!status?.claude.authenticated && (
              <p className="connect-notice">
                Sign in with <code>claude auth login</code> in your terminal, then refresh. You can still try a local transcript summary
                without Claude.
              </p>
            )}
            <div className="connect-workspace">
              <section className="connect-session-list" aria-labelledby="sessions-title">
                <div className="connect-panel-heading">
                  <h2 id="sessions-title">Your sessions</h2>
                  <span>{sessions.length} found</span>
                </div>
                <label htmlFor="session-search" className="sr-only">
                  Search sessions
                </label>
                <input
                  id="session-search"
                  className="connect-search"
                  placeholder="Search by project or session…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <div className="connect-session-scroll">
                  {visibleSessions.length ? (
                    visibleSessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        className={`connect-session${selected === session.id ? ' is-selected' : ''}`}
                        onClick={() => void select(session)}
                        aria-pressed={selected === session.id}
                      >
                        <span>
                          <FolderOpen size={14} />
                          {session.repo}
                        </span>
                        <strong>{session.title}</strong>
                        <small>
                          {session.messageCount} messages · {formatDate(session.updatedAt)}
                        </small>
                        <ChevronRight size={15} />
                      </button>
                    ))
                  ) : (
                    <div className="connect-empty">
                      <FolderOpen size={27} strokeWidth={1.2} />
                      <h3>{sessions.length ? 'No matching sessions.' : 'No saved sessions yet.'}</h3>
                      <p>Run Claude Code in a project and send a message, then refresh this list.</p>
                    </div>
                  )}
                </div>
              </section>
              <section className="connect-session-detail" aria-labelledby="selected-title">
                <div className="connect-panel-heading">
                  <h2 id="selected-title">{preview ? 'Review your session' : 'Pick the story'}</h2>
                  <span>Only this session is shared</span>
                </div>
                {busy === 'preview' ? (
                  <div className="connect-empty">
                    <Loader2 size={25} className="animate-spin" />
                    <p>Reading the selected transcript…</p>
                  </div>
                ) : preview ? (
                  <>
                    <div className="connect-selected-heading">
                      <p>{preview.session.repo}</p>
                      <h3>{preview.session.title}</h3>
                      <span>
                        {preview.messages.length} selected messages · {preview.redactions} sensitive patterns redacted
                        {preview.truncated ? ' · excerpt limited' : ''}
                      </span>
                    </div>
                    <details className="connect-transcript">
                      <summary>
                        Inspect the text used for generation <ChevronRight size={14} />
                      </summary>
                      <div>
                        {preview.messages.map((message, index) => (
                          <article key={index}>
                            <span>{message.role}</span>
                            <pre>{message.text}</pre>
                          </article>
                        ))}
                      </div>
                    </details>
                    <fieldset className="connect-provider">
                      <legend>How should the lesson be written?</legend>
                      <label>
                        <input
                          type="radio"
                          name="provider"
                          checked={provider === 'claude'}
                          onChange={() => {
                            setProvider('claude')
                            setConsent(false)
                          }}
                        />
                        <span>
                          <strong>Claude Code</strong>
                          <small>A new explanation generated from this session. Uses your own Claude access.</small>
                        </span>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="provider"
                          checked={provider === 'local'}
                          onChange={() => {
                            setProvider('local')
                            setConsent(false)
                          }}
                        />
                        <span>
                          <strong>Local transcript summary</strong>
                          <small>Extracts the actual changes without AI or external text generation.</small>
                        </span>
                      </label>
                    </fieldset>
                    <label className="connect-option">
                      <input type="checkbox" checked={render} onChange={(event) => setRender(event.target.checked)} />
                      <span>
                        Render a downloadable MP4<small>Runs on this machine after the lesson is ready.</small>
                      </span>
                    </label>
                    <label className="connect-option">
                      <input
                        type="checkbox"
                        checked={narrate}
                        disabled={!status?.narration?.available}
                        onChange={(event) => setNarrate(event.target.checked)}
                      />
                      <span>
                        Add voice narration
                        <small>
                          {status?.narration?.available
                            ? 'Sends the generated script to ElevenLabs using your local key. Provider charges apply.'
                            : 'Optional: set ELEVENLABS_API_KEY in .env.local and restart the companion.'}
                        </small>
                      </span>
                    </label>
                    {provider === 'claude' && (
                      <label className="connect-option connect-consent">
                        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                        <span>
                          Send this reviewed transcript to Claude to create my lesson.
                          <small>Automatic redaction helps, but check the text for private content before continuing.</small>
                        </span>
                      </label>
                    )}
                    <button
                      type="button"
                      className="uv-button uv-button-coral connect-generate"
                      onClick={() => void generate()}
                      disabled={!!busy || running || (provider === 'claude' && (!consent || !status?.claude.authenticated))}
                    >
                      <Film size={17} />
                      {busy === 'generate' ? 'Starting…' : running ? 'A reel is being made' : 'Make this session click'}
                      <ArrowRight size={17} />
                    </button>
                  </>
                ) : (
                  <div className="connect-empty">
                    <ArrowLeft size={31} strokeWidth={1.2} />
                    <h3>Start with a session.</h3>
                    <p>Choose one from the list to review its transcript. Your full history is never sent for generation.</p>
                  </div>
                )}
              </section>
            </div>
            {!!jobs.length && (
              <section className="connect-jobs" aria-labelledby="jobs-title">
                <div className="connect-panel-heading">
                  <h2 id="jobs-title">Your reel workshop</h2>
                  <span>Saved on this machine</span>
                </div>
                <div className="connect-job-layout">
                  <div className="connect-job-list">
                    {jobs.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={item.id === jobId ? 'is-selected' : ''}
                        onClick={() => setJobId(item.id)}
                      >
                        <span>{item.lesson?.title ?? 'New session reel'}</span>
                        <small>
                          {item.status} · {formatDate(item.createdAt)}
                        </small>
                      </button>
                    ))}
                  </div>
                  <div className="connect-job-detail">
                    {job && (
                      <>
                        <div className="connect-job-heading">
                          <span className={`connect-job-badge is-${job.status}`}>
                            {ACTIVE.has(job.status) && <Loader2 size={13} className="animate-spin" />}
                            {job.status}
                          </span>
                          <span>{job.provenance?.providerLabel ?? (job.provider === 'claude' ? 'Claude Code' : 'Local extraction')}</span>
                        </div>
                        {ACTIVE.has(job.status) && (
                          <div className="connect-job-progress" role="status">
                            <h3>{job.stage}</h3>
                            <progress max={1} value={job.progress} />
                            <p>{Math.round(job.progress * 100)}% · You can keep this page open or return later.</p>
                            <button
                              type="button"
                              className="uv-text-link"
                              onClick={() =>
                                void action('cancel', async () => {
                                  await client.cancel(job.id)
                                  setJobs((await client.jobs()).jobs)
                                })
                              }
                            >
                              Cancel this job
                            </button>
                          </div>
                        )}
                        {job.error && (
                          <div className="connect-job-error" role="alert">
                            <h3>The reel needs another take.</h3>
                            <p>{job.error.message}</p>
                            <span>{job.error.code}</span>
                            <p>Select the session again and start a new generation after fixing the issue.</p>
                          </div>
                        )}
                        {job.status === 'cancelled' && (
                          <p className="connect-muted">
                            Cancelled. No reel was added to the feed. You can start again from the selected session.
                          </p>
                        )}
                        {lesson && (
                          <div className="connect-result">
                            <div className="connect-player-column">
                              <div className="connect-reel-preview">
                                <ReelPlayer
                                  reel={jobReel(job, lesson)}
                                  active={playing}
                                  paused={!playing}
                                  muted={muted}
                                  initialFrame={45}
                                />
                              </div>
                              <div className="connect-player-controls">
                                <button
                                  type="button"
                                  onClick={() => setPlaying((value) => !value)}
                                  aria-label={playing ? 'Pause preview' : 'Play preview'}
                                >
                                  {playing ? <Pause size={15} /> : <Play size={15} />}
                                  {playing ? 'Pause' : 'Play'}
                                </button>
                                {lesson.narration && (
                                  <button
                                    type="button"
                                    onClick={() => setMuted((value) => !value)}
                                    aria-label={muted ? 'Turn narration on' : 'Mute narration'}
                                  >
                                    {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                                    {muted ? 'Sound off' : 'Sound on'}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="connect-result-copy">
                              <p className="uv-eyebrow">FROM YOUR ACTUAL SESSION</p>
                              <h3>{lesson.title}</h3>
                              <p>{lesson.summary}</p>
                              <ul>
                                {lesson.takeaways.map((takeaway) => (
                                  <li key={takeaway}>
                                    <Check size={13} />
                                    {takeaway}
                                  </li>
                                ))}
                              </ul>
                              <p className="connect-muted">
                                {lesson.scenes.length} scenes ·{' '}
                                {Math.round(lesson.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0))} seconds ·{' '}
                                {lesson.narration ? 'Narrated' : 'Visual reel, no narration'}
                              </p>
                              <div className="connect-result-actions">
                                <button
                                  type="button"
                                  className="uv-button uv-button-coral"
                                  disabled={!!busy}
                                  onClick={() =>
                                    void action('save', async () => {
                                      await saveGeneratedReel(jobReel(job, parseLesson(lesson)))
                                      navigate(`/app#r-generated-${job.id}`)
                                    })
                                  }
                                >
                                  Add to my feed <ArrowRight size={16} />
                                </button>
                                {job.video ? (
                                  <button
                                    type="button"
                                    className="uv-button uv-button-ink"
                                    disabled={!!busy}
                                    onClick={() => void action('download', () => client.download(job))}
                                  >
                                    <Download size={16} /> Download MP4
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="uv-button uv-button-ink"
                                    disabled={!!busy || ACTIVE.has(job.status)}
                                    onClick={() =>
                                      void action('render', async () => {
                                        const result = await client.render(job.id)
                                        setJobs((items) => items.map((item) => (item.id === result.job.id ? result.job : item)))
                                      })
                                    }
                                  >
                                    <Film size={16} /> Render MP4
                                  </button>
                                )}
                              </div>
                              <p className="connect-input-note">
                                Adding to your feed stores it privately in this browser. It does not publish your code to other people.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
        <footer className="connect-footer">
          <LockKeyhole size={14} />
          <p>
            Local generation has no Unvibe platform fee. Claude and optional ElevenLabs usage follow your own provider plan.{' '}
            <Link to="/#pricing">See pricing</Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
