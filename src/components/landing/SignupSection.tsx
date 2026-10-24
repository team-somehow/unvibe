import { ArrowUpRight, Check, LoaderCircle, Mail } from 'lucide-react'
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { registerSignup } from '../../lib/signups'
import './SignupSection.css'

export function SignupLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <a
      href="#signup"
      className={className}
      onClick={(event) => {
        const section = document.getElementById('signup')
        if (!section) return
        event.preventDefault()
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#signup`)
        section.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'center',
        })
        const target = section.querySelector<HTMLElement>('input, [data-signup-success]')
        target?.focus({ preventScroll: true })
      }}
    >
      {children}
    </a>
  )
}

type SignupStatus = 'idle' | 'invalid' | 'pending' | 'error' | 'success'

export function SignupForm({ variant = 'card' }: { variant?: 'hero' | 'card' }) {
  const [email, setEmail] = useState('')
  const [savedEmail, setSavedEmail] = useState('')
  const [status, setStatus] = useState<SignupStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const id = useId()
  const inputId = `${id}-email`
  const messageId = `${id}-message`
  const consentId = `${id}-consent`
  const pending = status === 'pending'
  const invalid = status === 'invalid'
  const hero = variant === 'hero'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busyRef.current) return
    const value = email.trim().toLowerCase()
    if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus('invalid')
      emailRef.current?.focus()
      return
    }
    busyRef.current = true
    setStatus('pending')
    try {
      await registerSignup(value)
      setSavedEmail(value)
      setStatus('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'We couldn’t save your email. Check your connection and try again.')
      setStatus('error')
    } finally {
      busyRef.current = false
    }
  }

  return (
    <div className={`uv-signup-form uv-signup-form-${variant}`}>
      {status === 'success' ? (
        <div className="uv-signup-success" role="status" aria-live="polite">
          <span className="uv-signup-success-mark">
            <Check size={hero ? 18 : 27} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <h3 data-signup-success tabIndex={-1}>
            You’re on the list.
          </h3>
          <p>
            {hero ? (
              <>
                We’ll email <strong>{savedEmail}</strong> once when the Cloud Pro beta launches.
              </>
            ) : (
              <>
                We’ve saved <strong>{savedEmail}</strong>. We’ll send one email when the Cloud Pro beta is ready to try.
              </>
            )}
          </p>
          {!hero && (
            <Link to="/app" className="uv-signup-success-link">
              Find an aha in the meantime <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          )}
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            void submit(event)
          }}
          noValidate
          aria-busy={pending}
        >
          {!hero && (
            <>
              <div className="uv-signup-card-heading">
                <Mail size={19} strokeWidth={1.5} aria-hidden="true" />
                <span>A LITTLE HEADS-UP</span>
              </div>
              <h3>Get the launch email.</h3>
            </>
          )}
          <label htmlFor={inputId} className={hero ? 'uv-signup-hero-label' : undefined}>
            {hero ? 'Get the Cloud Pro launch email' : 'Your email address'}
          </label>
          <div className="uv-signup-fields">
            <input
              ref={emailRef}
              id={inputId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
              placeholder={hero ? 'Your email address' : 'you@yourthing.com'}
              value={email}
              readOnly={pending}
              aria-invalid={invalid}
              aria-describedby={`${consentId}${invalid || status === 'error' ? ` ${messageId}` : ''}`}
              onChange={(event) => {
                setEmail(event.target.value)
                if (status === 'invalid' || status === 'error') setStatus('idle')
              }}
            />
            <button type="submit" className="uv-signup-submit" disabled={pending}>
              <span>{pending ? 'Saving…' : status === 'error' ? 'Try again' : hero ? 'Join the waitlist' : 'Keep me in the loop'}</span>
              {pending ? (
                <LoaderCircle size={18} className="uv-signup-spinner" aria-hidden="true" />
              ) : (
                <ArrowUpRight size={19} aria-hidden="true" />
              )}
            </button>
          </div>
          {(invalid || status === 'error') && (
            <p id={messageId} className="uv-signup-error" role="alert">
              {invalid ? 'Enter an email like you@company.com.' : errorMessage}
            </p>
          )}
          <p id={consentId} className="uv-signup-consent">
            {hero
              ? 'One beta launch email. No newsletter.'
              : 'By joining, you agree to one Cloud Pro beta launch email. No newsletter. No account created.'}
          </p>
        </form>
      )}
    </div>
  )
}

export function SignupSection({ id = 'signup-footer' }: { id?: string }) {
  const titleId = useId()
  return (
    <section id={id} className="uv-signup" aria-labelledby={titleId}>
      <div className="uv-container uv-signup-inner">
        <div className="uv-signup-copy">
          <p className="uv-eyebrow">
            <span /> COMING NEXT · CLOUD PRO
          </p>
          <h2 id={titleId}>
            Your next aha.
            <br />
            <em>Less setup.</em>
          </h2>
          <p className="uv-signup-description">
            Your coding sessions, turned into reels without the local setup. Leave your email and we’ll let you know when the Cloud Pro beta
            is ready.
          </p>
          <p className="uv-signup-margin-note">Same curious scroll. More of your own code.</p>
        </div>
        <div className="uv-signup-card">
          <SignupForm />
        </div>
      </div>
    </section>
  )
}
