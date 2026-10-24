import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Check, Clapperboard, Play, PlusSquare, SquareTerminal, UserRound } from 'lucide-react'
import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { CommentsPanel, CommentsSheet } from '../components/CommentsSheet'
import { CreateSheet } from '../components/CreateSheet'
import { NavButtons, SwipeHint } from '../components/feed/FeedChrome'
import { ReelPoster } from '../components/feed/ReelPoster'
import { useMediaQuery, usePageVisible, useStableCallback } from '../components/feed/hooks'
import { useFeedSound } from '../components/feed/sound'
import { KEYS, readPref, writePref } from '../components/feed/storage'
import { ReelCard, compact } from '../components/ReelCard'
import { Logo } from '../components/Logo'
import { CLAUDE, ME, SEED_REELS, agentReply, type Comment, type Reel } from '../data/reels'
import { COMPOSITIONS } from '../reels/registry'

type Tab = 'feed' | 'profile'
type Filter = 'everyone' | 'mine'

const REPLY_DELAY = 2300

// Scoped to the feed. The global :focus-visible rule also sets border-radius: 6px, and being unlayered it
// beats Tailwind's rounded-* utilities, so focused pills and circles turned into rounded squares.
// revert-layer hands the radius back to the element's own utilities. Text fields show focus with their border.
const FEED_CSS = `
.lg-feed :focus-visible { border-radius: revert-layer; }
.lg-feed [class*="outline-offset"]:focus-visible { outline-offset: revert-layer; }
.lg-feed input:focus-visible, .lg-feed textarea:focus-visible { outline: none; }
@keyframes lg-shimmer { from { background-position: 150% 0; } to { background-position: -50% 0; } }
`

function isTypingTarget(t: EventTarget | null) {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)
}

/** /app#r-injection opens that reel; read before the first render so the feed never starts on the wrong reel. */
function hashIndex() {
  const id = decodeURIComponent(location.hash.slice(1))
  return Math.max(0, SEED_REELS.findIndex((r) => r.id === id))
}

/** Players for the reel the feed rests on and the next one, plus the previous one if it is still mounted. */
function playerIds(ids: string[], s: number, prev: string[]) {
  const next = [ids[s], ids[s + 1]]
  if (s > 0 && prev.includes(ids[s - 1])) next.push(ids[s - 1])
  const out = next.filter((id): id is string => !!id)
  return out.length === prev.length && out.every((id) => prev.includes(id)) ? prev : out
}

// Posters render live (once, then they are cached) for reels this close to where the feed rests
const POSTER_REACH = 3

function toggled(set: Set<string>, id: string, force?: boolean) {
  const next = new Set(set)
  if (force || !next.has(id)) next.add(id)
  else next.delete(id)
  return next
}

export default function FeedApp() {
  const [reels, setReels] = useState<Reel[]>(SEED_REELS)
  const [tab, setTab] = useState<Tab>('feed')
  const [filter, setFilter] = useState<Filter>('everyone')
  const [start] = useState(hashIndex)
  const [active, setActive] = useState(start)
  // Where the scroller has come to rest. Reels play, Players mount and posters render only on settling, so all of
  // that work happens while still posters are on screen instead of during the swipe.
  const [settled, setSettled] = useState(start)
  const [mountIds, setMountIds] = useState<string[]>(() => playerIds(SEED_REELS.map((r) => r.id), start, []))
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [commentsFor, setCommentsFor] = useState<string | null>(null)
  const [typingFor, setTypingFor] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [pausedId, setPausedId] = useState<string | null>(null)
  const [immersive, setImmersive] = useState(false)
  const [swipeHint, setSwipeHint] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  const sound = useFeedSound()
  const pageVisible = usePageVisible()
  const panelMode = useMediaQuery('(min-width: 1100px)')
  const wide = useMediaQuery('(min-width: 1280px)')
  const phone = useMediaQuery('(max-width: 767px)')

  const visible = filter === 'mine' ? reels.filter((r) => r.author.handle === ME.handle) : reels
  const current = visible[active] ?? null
  const running = tab === 'feed' && !creating && pageVisible
  const activeRef = useRef(active)
  activeRef.current = active
  const countRef = useRef(visible.length)
  countRef.current = visible.length
  const idsRef = useRef<string[]>([])
  idsRef.current = visible.map((r) => r.id)
  // Where a keyboard / wheel / button step is heading, so quick repeated steps add up instead of being lost
  const targetRef = useRef<number | null>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const flash = useCallback((text: string) => {
    const id = Date.now()
    setToast({ id, text })
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2400)
  }, [])

  // Which reel is on screen
  useEffect(() => {
    const root = scroller.current
    if (!root || tab !== 'feed') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = Number((e.target as HTMLElement).dataset.index)
          startTransition(() => setActive(i))
        }
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [visible.length, tab, filter])

  // A sticky pause belongs to the reel it was made on
  useEffect(() => setPausedId(null), [active, filter, tab])

  const scrollTo = useCallback(
    (i: number, smooth = true) => {
      const root = scroller.current
      if (!root) return
      root.scrollTo({ top: i * root.clientHeight, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' })
    },
    [reducedMotion],
  )

  const step = useCallback(
    (dir: 1 | -1) => {
      const from = targetRef.current ?? activeRef.current
      const next = Math.min(Math.max(from + dir, 0), countRef.current - 1)
      if (next === from) return
      targetRef.current = next
      scrollTo(next)
    },
    [scrollTo],
  )

  const settleAt = useCallback((i: number) => {
    const ids = idsRef.current
    const s = Math.min(Math.max(i, 0), Math.max(ids.length - 1, 0))
    targetRef.current = null
    // One commit: the new Players mount before the landed reel's play effect runs
    setSettled(s)
    setMountIds((prev) => playerIds(ids, s, prev))
  }, [])

  // The feed opens where it left off (deep link, back from the profile, a new filter or post) before the first paint
  useLayoutEffect(() => {
    const root = scroller.current
    if (tab !== 'feed' || !root) return
    root.scrollTop = activeRef.current * root.clientHeight
  }, [tab, filter, visible.length])

  // Detect when scrolling has come to rest: scrollend where supported, a short quiet period otherwise. A finger
  // still on the glass never counts as rest.
  useEffect(() => {
    const root = scroller.current
    if (!root || tab !== 'feed') return
    const hasScrollEnd = 'onscrollend' in window
    let timer = 0
    let touching = false
    const settle = () => {
      clearTimeout(timer)
      if (!touching) settleAt(Math.round(root.scrollTop / Math.max(1, root.clientHeight)))
    }
    const later = () => {
      clearTimeout(timer)
      timer = window.setTimeout(settle, hasScrollEnd ? 500 : 120)
    }
    const down = () => {
      touching = true
      clearTimeout(timer)
    }
    const up = () => {
      touching = false
      later()
    }
    root.addEventListener('scroll', later, { passive: true })
    root.addEventListener('scrollend', settle)
    root.addEventListener('touchstart', down, { passive: true })
    root.addEventListener('touchend', up, { passive: true })
    root.addEventListener('touchcancel', up, { passive: true })
    // The list or the tab changed: rest where we are now
    settle()
    return () => {
      clearTimeout(timer)
      root.removeEventListener('scroll', later)
      root.removeEventListener('scrollend', settle)
      root.removeEventListener('touchstart', down)
      root.removeEventListener('touchend', up)
      root.removeEventListener('touchcancel', up)
    }
  }, [tab, filter, visible.length, settleAt])

  // Mouse wheels and trackpads move exactly one reel per gesture, like Instagram on the web
  useEffect(() => {
    const el = scroller.current
    if (!el || tab !== 'feed' || phone) return
    let acc = 0
    let last = 0
    let lastAbs = 0
    let lockedUntil = 0
    let minUnlock = 0
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      const now = performance.now()
      const gap = now - last
      last = now
      const abs = Math.abs(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY)
      const accelerating = abs > Math.max(12, lastAbs * 1.6)
      lastAbs = abs
      if (now < lockedUntil && !(accelerating && now > minUnlock)) {
        // Inertia from the same flick keeps streaming in with shrinking deltas: swallow it
        lockedUntil = now + 160
        return
      }
      if (gap > 250) acc = 0
      acc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      if (Math.abs(acc) < 28) return
      step(acc > 0 ? 1 : -1)
      acc = 0
      lockedUntil = now + 450
      minUnlock = now + 450
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [tab, phone, step])

  // First-visit swipe hint on phones, gone after the first scroll
  useEffect(() => {
    if (!phone || tab !== 'feed' || readPref(KEYS.swipeHint)) return
    // Shows for a few seconds; it only counts as learned (and stops coming back) once they actually scroll
    const show = setTimeout(() => activeRef.current === 0 && setSwipeHint(true), 1800)
    const hide = setTimeout(() => setSwipeHint(false), 7500)
    const root = scroller.current
    const onScroll = () => {
      if (!root || root.scrollTop < 8) return
      writePref(KEYS.swipeHint, '1')
      setSwipeHint(false)
      clearTimeout(show)
      root.removeEventListener('scroll', onScroll)
    }
    root?.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
      root?.removeEventListener('scroll', onScroll)
    }
  }, [phone, tab])

  const closeComments = useCallback(() => setCommentsFor(null), [])

  // Keyboard: arrows / j k navigate, M sound, Space pause, Esc closes
  const onKey = useStableCallback((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const typing = isTypingTarget(e.target)
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (!typing && !e.repeat && key !== 'm' && key !== 'Escape' && key !== 'Tab' && key !== 'Shift') sound.unlock(e)
    if (key === 'Escape') {
      if (creating) setCreating(false)
      else if (commentsFor) {
        // Leave the comment box, so the arrow keys drive the feed again right away
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        setCommentsFor(null)
      }
      return
    }
    if (typing || tab !== 'feed' || creating || (commentsFor && !panelMode)) return
    if (e.target instanceof HTMLButtonElement && (key === ' ' || key === 'Enter')) return
    if (key === 'ArrowDown' || key === 'j' || key === 'PageDown') {
      e.preventDefault()
      step(1)
    } else if (key === 'ArrowUp' || key === 'k' || key === 'PageUp') {
      e.preventDefault()
      step(-1)
    } else if (key === 'm') {
      sound.toggle(e)
    } else if (key === ' ') {
      e.preventDefault()
      const id = visible[activeRef.current]?.id ?? null
      setPausedId((p) => (p === id ? null : id))
    }
  })
  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  const addComment = useCallback((reelId: string, c: Comment) => setReels((rs) => rs.map((r) => (r.id === reelId ? { ...r, comments: [...r.comments, c] } : r))), [])

  const postComment = useCallback(
    (reelId: string, text: string) => {
      addComment(reelId, { id: `u-${Date.now()}`, author: ME, text, time: 'now', likes: 0 })
      setTypingFor(reelId)
      setTimeout(() => {
        setTypingFor((t) => (t === reelId ? null : t))
        addComment(reelId, { id: `a-${Date.now()}`, author: CLAUDE, agent: true, text: agentReply(reelId, text), time: 'now', likes: 0, fresh: true })
      }, REPLY_DELAY)
    },
    [addComment],
  )

  // Stable handlers for the memoised cards
  const onLike = useStableCallback((id: string, force?: boolean) => setLiked((s) => toggled(s, id, force)))
  const onSave = useStableCallback((id: string) => {
    setSaved((s) => toggled(s, id))
    flash(saved.has(id) ? 'Removed from your study list' : 'Saved to your study list')
  })
  const onFollow = useStableCallback((handle: string) => {
    setFollowing((s) => toggled(s, handle))
    if (!following.has(handle)) flash(`Following ${handle}`)
  })
  const onComments = useStableCallback((id: string) => {
    if (panelMode && commentsFor) setCommentsFor(null)
    else setCommentsFor(id)
  })
  const onShare = useStableCallback((id: string) => {
    const url = `${location.origin}/app#${id}`
    navigator.clipboard?.writeText(url).catch(() => {})
    flash('Link copied')
  })
  const onVote = useStableCallback((id: string, choice: string) => {
    const reel = reels.find((r) => r.id === id)
    if (!reel?.poll || votes[id]) return
    setVotes((v) => ({ ...v, [id]: choice }))
    setTypingFor(id)
    setTimeout(() => {
      setTypingFor((t) => (t === id ? null : t))
      addComment(id, { id: `a-${Date.now()}`, author: CLAUDE, agent: true, text: reel.poll!.resolution(choice), time: 'now', likes: 0, fresh: true })
      flash(`Claude resumed your session in ${reel.session.repo}`)
    }, 1500)
  })
  const onToggleSound = useStableCallback((e?: Event | SyntheticEvent) => sound.toggle(e))
  const onUnlock = useStableCallback((e?: Event | SyntheticEvent) => sound.unlock(e))
  const onTogglePause = useStableCallback((id: string) => setPausedId((p) => (p === id ? null : id)))
  const onImmersive = useStableCallback((on: boolean) => setImmersive(on))

  const publish = (r: Reel) => {
    setReels((rs) => [r, ...rs])
    setCreating(false)
    setTab('feed')
    setFilter('everyone')
    setActive(0)
    requestAnimationFrame(() => scrollTo(0, false))
    flash('Posted to your feed')
  }

  const openReel = (id: string) => {
    setFilter('everyone')
    setTab('feed')
    const i = reels.findIndex((r) => r.id === id)
    setActive(i)
    requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(i, false)))
  }

  const showFilter = (f: Filter) => {
    setTab('feed')
    setCommentsFor(null)
    if (f === filter) {
      scrollTo(0)
      return
    }
    setFilter(f)
    setActive(0)
    requestAnimationFrame(() => scrollTo(0, false))
  }

  // In the side panel the comments follow the reel on screen; the sheet is pinned to the reel it opened on
  const commentsReel = commentsFor ? (panelMode ? current : (reels.find((r) => r.id === commentsFor) ?? null)) : null
  const mine = reels.filter((r) => r.author.handle === ME.handle)

  const sideNav = [
    { id: 'everyone', label: 'For you', icon: Clapperboard, on: tab === 'feed' && filter === 'everyone', onClick: () => showFilter('everyone') },
    { id: 'mine', label: 'Your sessions', icon: SquareTerminal, on: tab === 'feed' && filter === 'mine', onClick: () => showFilter('mine') },
    { id: 'create', label: 'Create', icon: PlusSquare, on: creating, onClick: () => setCreating(true) },
    { id: 'profile', label: 'Profile', icon: UserRound, on: tab === 'profile', onClick: () => setTab('profile') },
  ]
  const tabNav = [
    { id: 'feed', label: 'Reels', icon: Clapperboard, on: tab === 'feed', onClick: () => setTab('feed') },
    { id: 'create', label: 'Create', icon: PlusSquare, on: creating, onClick: () => setCreating(true) },
    { id: 'profile', label: 'Profile', icon: UserRound, on: tab === 'profile', onClick: () => setTab('profile') },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <style>{FEED_CSS}</style>
      <div className="lg-feed flex h-dvh w-full overflow-hidden bg-black text-white">
        {/* Desktop sidebar */}
        <aside className="hidden w-[76px] shrink-0 flex-col border-r border-white/10 px-3 py-6 md:flex xl:w-[244px]">
          <Link to="/" className="mb-9 flex h-11 items-center rounded-xl px-2.5" aria-label="Learnagram home">
            <span className="hidden xl:block">
              <Logo />
            </span>
            <span className="xl:hidden">
              <Logo compact />
            </span>
          </Link>
          <nav className="flex flex-col gap-1" aria-label="Main">
            {sideNav.map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={n.onClick}
                aria-current={n.on ? 'page' : undefined}
                title={n.label}
                className={`group flex h-12 items-center gap-4 rounded-xl px-3 text-[15px] transition-colors hover:bg-white/[0.07] ${n.on ? 'font-semibold text-white' : 'text-white/80'}`}
              >
                <n.icon size={24} strokeWidth={n.on ? 2.4 : 1.8} className="shrink-0 transition-transform group-active:scale-90" />
                <span className="hidden xl:inline">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto hidden flex-col gap-3 xl:flex">
            <div className="rounded-2xl border border-white/10 p-4 text-[13px] leading-relaxed text-white/60">
              <div className="mb-1 flex items-center gap-2 font-medium text-white">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-mgreen opacity-50" />
                  <span className="relative inline-flex size-2 rounded-full bg-mgreen" />
                </span>
                Claude Code connected
              </div>
              Watching 4 repos. New sessions turn into reels automatically.
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 text-[11.5px] text-white/40">
              {[
                ['↑ ↓', 'browse'],
                ['M', 'sound'],
                ['Space', 'pause'],
              ].map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <kbd className="rounded-[5px] border border-white/15 bg-white/[0.04] px-1.5 py-px font-sans text-[10.5px] text-white/60">{k}</kbd>
                  {v}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {tab === 'feed' ? (
            <div className="relative flex min-h-0 flex-1">
              <div className="@container relative min-w-0 flex-1">
                {/* Phone top bar */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[calc(44px+max(6px,env(safe-area-inset-top)))] items-end px-2 transition-opacity duration-200 md:hidden ${immersive ? 'opacity-0' : ''}`}
                >
                  <nav className="pointer-events-auto flex h-11 items-center" aria-label="Feeds">
                    {(['everyone', 'mine'] as Filter[]).map((f) => (
                      <button
                        type="button"
                        key={f}
                        onClick={() => showFilter(f)}
                        aria-current={filter === f ? 'page' : undefined}
                        className={`relative flex h-11 items-center px-2.5 text-[16px] font-semibold transition-colors [text-shadow:0_1px_10px_rgba(0,0,0,0.5)] ${filter === f ? 'text-white' : 'text-white/55'}`}
                      >
                        {f === 'everyone' ? 'For you' : 'Your sessions'}
                        {filter === f && <motion.span layoutId="filter-underline" className="absolute inset-x-2.5 bottom-1.5 h-[2px] rounded-full bg-white" />}
                      </button>
                    ))}
                  </nav>
                </div>

                <div ref={scroller} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain" aria-label="Reels">
                  {visible.map((r, i) => (
                    <div key={r.id} data-index={i} className="h-full">
                      <ReelCard
                        reel={r}
                        current={i === active}
                        landed={i === settled}
                        running={running}
                        mountPlayer={mountIds.includes(r.id)}
                        wantPoster={Math.abs(i - settled) <= POSTER_REACH}
                        liked={liked.has(r.id)}
                        saved={saved.has(r.id)}
                        following={following.has(r.author.handle)}
                        vote={votes[r.id] ?? null}
                        muted={sound.muted}
                        soundHint={sound.hint}
                        userPaused={pausedId === r.id}
                        commentsOpen={panelMode && !!commentsFor && i === active}
                        onLike={onLike}
                        onSave={onSave}
                        onComments={onComments}
                        onShare={onShare}
                        onVote={onVote}
                        onFollow={onFollow}
                        onToggleSound={onToggleSound}
                        onUnlock={onUnlock}
                        onTogglePause={onTogglePause}
                        onImmersive={onImmersive}
                      />
                    </div>
                  ))}
                  {visible.length === 0 && (
                    <div className="grid h-full place-items-center px-8 text-center">
                      <div>
                        <p className="font-serif text-[26px] italic">No reels from your sessions yet</p>
                        <button type="button" onClick={() => setCreating(true)} className="mt-5 h-11 rounded-xl bg-mblue px-5 text-[15px] font-semibold text-black">
                          Start a session
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <NavButtons canPrev={active > 0} canNext={active < visible.length - 1} onPrev={() => step(-1)} onNext={() => step(1)} hidden={immersive} />
                <SwipeHint show={swipeHint && active === 0 && !commentsFor && !creating && !immersive} />
              </div>

              <AnimatePresence initial={false}>
                {panelMode && commentsReel && (
                  <CommentsPanel
                    key="comments-panel"
                    width={wide ? 400 : 360}
                    reel={commentsReel}
                    typing={typingFor === commentsReel.id}
                    onClose={closeComments}
                    onPost={(t) => postComment(commentsReel.id, t)}
                  />
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Profile mine={mine} onOpen={openReel} onCreate={() => setCreating(true)} />
          )}

          {/* Phone tab bar */}
          <nav className="flex shrink-0 items-stretch justify-around border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
            {tabNav.map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={n.onClick}
                aria-label={n.label}
                aria-current={n.on ? 'page' : undefined}
                className="grid h-[52px] flex-1 place-items-center transition-transform active:scale-90"
              >
                <n.icon size={26} strokeWidth={n.on ? 2.4 : 1.7} className={n.on ? 'text-white' : 'text-white/75'} />
              </button>
            ))}
          </nav>
        </main>

        {!panelMode && <CommentsSheet reel={commentsReel} typing={!!commentsReel && typingFor === commentsReel.id} onClose={closeComments} onPost={(t) => commentsFor && postComment(commentsFor, t)} />}
        <CreateSheet open={creating} muted={sound.muted} onClose={() => setCreating(false)} onPublish={publish} />

        {/* Toasts drop in at the top, clear of the caption and the action rail, centred over the content beside the sidebar */}
        <div
          className="pointer-events-none fixed inset-x-0 top-[calc(52px+max(6px,env(safe-area-inset-top)))] z-[60] flex justify-center px-4 md:top-6 md:left-[76px] xl:left-[244px]"
          aria-live="polite"
        >
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                className="flex items-center gap-2 rounded-full bg-white py-2.5 pr-4 pl-3 text-[14px] font-medium whitespace-nowrap text-black shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
              >
                <span className="grid size-5 place-items-center rounded-full bg-black text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
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
      <div className="mx-auto max-w-[935px] px-4 pt-[max(16px,env(safe-area-inset-top))] pb-10 md:px-8 md:pt-12">
        <Link to="/" className="mb-5 inline-flex h-11 items-center md:hidden" aria-label="Learnagram home">
          <Logo />
        </Link>
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
          <button
            type="button"
            onClick={onCreate}
            className="grid aspect-[9/16] place-items-center rounded-sm border border-dashed border-white/20 text-white/60 transition hover:border-white/50 hover:text-white"
          >
            <span className="flex flex-col items-center gap-2 text-[13px]">
              <PlusSquare size={28} strokeWidth={1.5} />
              New session
            </span>
          </button>
          {mine.map((r) => {
            const { frames } = COMPOSITIONS[r.kind]
            return (
              <button type="button" key={r.id} onClick={() => onOpen(r.id)} aria-label={`Play: ${r.caption}`} className="group relative aspect-[9/16] overflow-hidden rounded-sm bg-[#0a0a0a]">
                <ReelPoster reel={r} frame={Math.floor(frames * 0.55)} />
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
