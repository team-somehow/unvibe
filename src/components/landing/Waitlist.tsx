import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { playSfx, useLandingSound } from './sound'
import { EMAIL, ME_KEY, WaitlistCtx, readMe, useWaitlist, type Result } from './waitlistState'

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(readMe)
  const [result, setResult] = useState<Result | null>(() => (readMe() ? 'duplicate' : null))

  const join = useCallback((raw: string) => {
    const value = raw.trim()
    if (!EMAIL.test(value)) return 'invalid' as const
    let duplicate = false
    try {
      const stored = JSON.parse(localStorage.getItem('waitlist') ?? '[]')
      const list: string[] = Array.isArray(stored) ? stored : []
      duplicate = list.includes(value)
      localStorage.setItem('waitlist', JSON.stringify([...new Set([...list, value])]))
      localStorage.setItem(ME_KEY, value)
    } catch {
      // storage can be blocked; the confirmation still shows
    }
    const r: Result = duplicate ? 'duplicate' : 'joined'
    setEmail(value)
    setResult(r)
    return r
  }, [])

  const focusCard = useCallback(() => {
    const card = document.getElementById('waitlist')
    if (!card) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    const input = card.querySelector<HTMLInputElement>('input')
    const target = input ?? card.querySelector<HTMLElement>('a,button')
    window.setTimeout(() => target?.focus({ preventScroll: true }), reduce ? 0 : 450)
  }, [])

  const value = useMemo(() => ({ email, result, join, focusCard }), [email, result, join, focusCard])
  return <WaitlistCtx.Provider value={value}>{children}</WaitlistCtx.Provider>
}

/** Green tick drawn on, like Manim's Create(). */
function Tick({ reduce }: { reduce: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="11" fill="#2F7D32" />
      <motion.path
        d="M7 12.5l3.2 3.2L17.2 8.8"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1], delay: 0.1 }}
      />
    </svg>
  )
}

/**
 * The waitlist as an Instagram-style sticker: the same white object as the poll sticker in the feed.
 * `tone="card"` is the compact version used inside the reel's end card.
 */
export function WaitlistSticker({ id, tone = 'page', className = '' }: { id: string; tone?: 'page' | 'card'; className?: string }) {
  const { email, result, join } = useWaitlist()
  const sound = useLandingSound().on
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const reduce = !!useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const errId = `${id}-error`

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const r = join(value)
    if (r === 'invalid') {
      setError(true)
      inputRef.current?.focus()
      return
    }
    setError(false)
    if (sound && r === 'joined') playSfx('success')
  }

  const compact = tone === 'card'
  return (
    <div
      id={tone === 'page' ? 'waitlist' : undefined}
      className={`group/sticker w-full rounded-[18px] bg-white text-night shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out ${reduce ? '-rotate-2' : '-rotate-2 focus-within:rotate-0'} ${compact ? 'max-w-[300px] p-4' : 'max-w-[400px] p-5 sm:p-6'} ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {email ? (
          <motion.div key="done" initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} role="status" className="flex flex-col gap-3">
            <p className={`flex items-center gap-2.5 font-semibold ${compact ? 'text-[16px]' : 'text-[19px]'}`}>
              <Tick reduce={reduce} />
              {result === 'duplicate' ? 'You’re already on the list.' : 'You’re on the list.'}
            </p>
            <p className={`leading-snug text-night/70 ${compact ? 'text-[13.5px]' : 'text-[15px]'}`}>
              {result === 'duplicate' ? (
                <>
                  We have <span className="font-semibold text-night [overflow-wrap:anywhere]">{email}</span> and will email it when the beta opens.
                </>
              ) : (
                <>
                  We’ll email <span className="font-semibold text-night [overflow-wrap:anywhere]">{email}</span> when the beta opens.
                </>
              )}
            </p>
            {!compact && (
              <Link to="/app" className="text-[15px] font-semibold text-[#1B6F8A] underline decoration-[#1B6F8A]/40 underline-offset-4 hover:decoration-[#1B6F8A]">
                Open the demo app
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.form key="form" exit={reduce ? undefined : { opacity: 0 }} onSubmit={submit} noValidate className="flex flex-col">
            <p className={`font-semibold tracking-[-0.01em] ${compact ? 'text-[16px] leading-[22px]' : 'text-[19px] leading-6'}`}>Want reels of your own sessions?</p>
            <label htmlFor={id} className="sr-only">
              Email address
            </label>
            <input
              ref={inputRef}
              id={id}
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (error) setError(false)
              }}
              placeholder="you@company.com"
              aria-invalid={error}
              aria-describedby={error ? errId : undefined}
              className={`mt-3 h-12 w-full min-w-0 rounded-xl border bg-white px-4 text-[16px] text-night outline-none placeholder:text-night/55 focus:border-[#1B6F8A] focus:ring-2 focus:ring-[#1B6F8A]/25 ${error ? 'border-[#B42318]' : 'border-night/20'}`}
            />
            {error && (
              <p id={errId} className="mt-1.5 text-[13px] font-medium text-[#B42318]">
                Enter an email like name@company.com.
              </p>
            )}
            <button type="submit" className="mt-2.5 h-12 w-full rounded-xl bg-night text-[15px] font-semibold text-chalk transition hover:bg-night-2 active:scale-[0.985]">
              Join the waitlist
            </button>
            {!compact && <p className="mt-3 text-[13px] text-night/60">One email when the beta opens. Nothing else.</p>}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
