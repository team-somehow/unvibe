import { Thumbnail } from '@remotion/player'
import { AnimatePresence, motion } from 'motion/react'
import { Clapperboard, Home, Play, PlusSquare, UserRound } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { CommentsSheet } from '../components/CommentsSheet'
import { CreateSheet } from '../components/CreateSheet'
import { ReelCard, compact } from '../components/ReelCard'
import { Logo } from '../components/Logo'
import { CLAUDE, ME, SEED_REELS, agentReply, type Reel } from '../data/reels'
import { COMPOSITIONS, FPS, HEIGHT, WIDTH } from '../reels/registry'

type Tab = 'feed' | 'profile'
type Filter = 'everyone' | 'mine'

export default function FeedApp() {
  const [reels, setReels] = useState<Reel[]>(SEED_REELS)
  const [tab, setTab] = useState<Tab>('feed')
  const [filter, setFilter] = useState<Filter>('everyone')
  const [active, setActive] = useState(0)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [commentsFor, setCommentsFor] = useState<string | null>(null)
  const [typingFor, setTypingFor] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const visible = filter === 'mine' ? reels.filter((r) => r.author.handle === ME.handle) : reels

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200)
  }

  // Track which reel is on screen
  useEffect(() => {
    const root = scroller.current
    if (!root || tab !== 'feed') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [visible.length, tab, filter])

  const scrollTo = useCallback((i: number, smooth = true) => {
    const root = scroller.current
    if (!root) return
    root.scrollTo({ top: i * root.clientHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tab !== 'feed' || commentsFor || creating) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); scrollTo(Math.min(active + 1, visible.length - 1)) }
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); scrollTo(Math.max(active - 1, 0)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, visible.length, tab, commentsFor, creating, scrollTo])

  const toggle = (set: Set<string>, id: string, force?: boolean) => {
    const next = new Set(set)
    if (force || !next.has(id)) next.add(id)
    else next.delete(id)
    return next
  }

  const addComment = (reelId: string, c: Reel['comments'][number]) =>
    setReels((rs) => rs.map((r) => (r.id === reelId ? { ...r, comments: [...r.comments, c] } : r)))

  const postComment = (reelId: string, text: string) => {
    addComment(reelId, { id: `u-${Date.now()}`, author: ME, text, time: 'now', likes: 0 })
    setTypingFor(reelId)
    setTimeout(() => {
      setTypingFor(null)
      addComment(reelId, { id: `a-${Date.now()}`, author: CLAUDE, agent: true, text: agentReply(reelId, text), time: 'now', likes: 0, fresh: true })
    }, 1600)
  }

  const vote = (reel: Reel, choice: string) => {
    setVotes((v) => ({ ...v, [reel.id]: choice }))
    setTimeout(() => {
      addComment(reel.id, { id: `a-${Date.now()}`, author: CLAUDE, agent: true, text: reel.poll!.resolution(choice), time: 'now', likes: 0 })
      flash('Claude resumed your session in ' + reel.session.repo)
    }, 900)
  }

  const publish = (r: Reel) => {
    setReels((rs) => [r, ...rs])
    setCreating(false)
    setTab('feed')
    setFilter('everyone')
    requestAnimationFrame(() => scrollTo(0, false))
    flash('Posted to your feed')
  }

  const openReel = (id: string) => {
    setFilter('everyone')
    setTab('feed')
    const i = reels.findIndex((r) => r.id === id)
    requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(i, false)))
  }

  const commentsReel = reels.find((r) => r.id === commentsFor) ?? null
  const mine = reels.filter((r) => r.author.handle === ME.handle)

  const navItems = [
    { id: 'feed', label: 'Reels', icon: Home, onClick: () => setTab('feed') },
    { id: 'create', label: 'Create', icon: PlusSquare, onClick: () => setCreating(true) },
    { id: 'profile', label: 'Profile', icon: UserRound, onClick: () => setTab('profile') },
  ] as const

  return (
    <div className="flex h-dvh w-full bg-black text-white md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-[76px] shrink-0 flex-col border-r border-white/10 px-3 py-6 md:flex xl:w-[244px]">
        <Link to="/" className="mb-10 px-3">
          <span className="hidden xl:block"><Logo /></span>
          <span className="xl:hidden"><Logo compact /></span>
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((n) => {
            const on = n.id === tab
            return (
              <button key={n.id} onClick={n.onClick} className={`flex items-center gap-4 rounded-xl px-3 py-3 text-[15px] transition hover:bg-white/8 ${on ? 'font-semibold' : 'text-white/85'}`}>
                <n.icon size={24} strokeWidth={on ? 2.4 : 1.8} />
                <span className="hidden xl:inline">{n.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="mt-auto hidden rounded-2xl border border-white/10 p-4 text-[13px] leading-relaxed text-white/60 xl:block">
          <div className="mb-1 flex items-center gap-2 font-medium text-white">
            <span className="size-2 rounded-full bg-mgreen" /> Claude Code connected
          </div>
          Watching 4 repos. New sessions turn into reels automatically.
        </div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {tab === 'feed' ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] md:justify-center">
              <div className="pointer-events-auto flex gap-5 text-[16px] font-semibold drop-shadow md:rounded-full md:bg-black/50 md:px-5 md:py-2 md:backdrop-blur">
                {(['everyone', 'mine'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f)
                      requestAnimationFrame(() => scrollTo(0, false))
                    }}
                    className={`relative transition ${filter === f ? 'text-white' : 'text-white/50'}`}
                  >
                    {f === 'everyone' ? 'For you' : 'Your sessions'}
                    {filter === f && <motion.span layoutId="filter-underline" className="absolute inset-x-1 -bottom-1.5 h-0.5 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
              <Link to="/" className="pointer-events-auto md:hidden"><Logo compact /></Link>
            </div>
            <div ref={scroller} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain">
              {visible.map((r, i) => (
                <div key={r.id} data-index={i} className="h-full">
                  <ReelCard
                    reel={r}
                    active={i === active && !creating}
                    near={Math.abs(i - active) <= 1}
                    liked={liked.has(r.id)}
                    saved={saved.has(r.id)}
                    vote={votes[r.id] ?? null}
                    onLike={(force) => setLiked((s) => toggle(s, r.id, force))}
                    onSave={() => {
                      setSaved((s) => toggle(s, r.id))
                      if (!saved.has(r.id)) flash('Saved to your study list')
                    }}
                    onComments={() => setCommentsFor(r.id)}
                    onShare={() => {
                      navigator.clipboard?.writeText(`${location.origin}/app#${r.id}`).catch(() => {})
                      flash('Link copied')
                    }}
                    onVote={(c) => vote(r, c)}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <Profile mine={mine} onOpen={openReel} onCreate={() => setCreating(true)} />
        )}

        {/* Mobile tab bar */}
        <nav className="flex shrink-0 items-center justify-around border-t border-white/10 bg-black pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
          {navItems.map((n) => (
            <button key={n.id} onClick={n.onClick} aria-label={n.label} className="px-6 py-1 transition active:scale-90">
              <n.icon size={26} strokeWidth={n.id === tab ? 2.4 : 1.7} />
            </button>
          ))}
        </nav>
      </main>

      <CommentsSheet reel={commentsReel} typing={typingFor === commentsFor} onClose={() => setCommentsFor(null)} onPost={(t) => commentsFor && postComment(commentsFor, t)} />
      <CreateSheet open={creating} onClose={() => setCreating(false)} onPublish={publish} />

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 16, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[60] rounded-full bg-white px-4 py-2.5 text-[14px] font-medium whitespace-nowrap text-black shadow-xl md:bottom-8"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Profile({ mine, onOpen, onCreate }: { mine: Reel[]; onOpen: (id: string) => void; onCreate: () => void }) {
  const stats = [
    { n: 23, label: 'sessions' },
    { n: mine.length, label: 'reels' },
    { n: 41, label: 'concepts learned' },
  ]
  return (
    <div className="no-scrollbar flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[935px] px-4 pt-[max(24px,env(safe-area-inset-top))] pb-10 md:px-8 md:pt-12">
        <div className="flex items-center gap-6 md:gap-16 md:px-10">
          <Avatar person={ME} size={88} ring />
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold">you</h1>
            <div className="mt-3 flex gap-6 text-[14px]">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col leading-tight md:block">
                  <span className="font-semibold tabular-nums">{s.n}</span> <span className="text-white/60">{s.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/75">Shipping with Claude Code, learning what it ships.</p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/10 pt-3 text-[13px] font-semibold">
          <Clapperboard size={16} /> Reels from your sessions
        </div>

        <div className="mt-3 grid grid-cols-3 gap-0.5 md:gap-1">
          <button onClick={onCreate} className="grid aspect-[9/16] place-items-center border border-dashed border-white/20 text-white/60 transition hover:border-white/50 hover:text-white">
            <span className="flex flex-col items-center gap-2 text-[13px]">
              <PlusSquare size={28} strokeWidth={1.5} />
              New session
            </span>
          </button>
          {mine.map((r) => {
            const { component, frames } = COMPOSITIONS[r.kind]
            return (
              <button key={r.id} onClick={() => onOpen(r.id)} className="group relative aspect-[9/16] overflow-hidden bg-[#0a0a0a]">
                <Thumbnail component={component} inputProps={r.props ?? {}} compositionWidth={WIDTH} compositionHeight={HEIGHT} durationInFrames={frames} fps={FPS} frameToDisplay={Math.floor(frames * 0.55)} style={{ width: '100%', height: '100%' }} />
                <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
                <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[12px] font-semibold drop-shadow">
                  <Play size={13} className="fill-white" /> {compact(r.likes * 7 + 40)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
