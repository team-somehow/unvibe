import { createContext, useContext } from 'react'

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const ME_KEY = 'learnagram:waitlist-me'

export type Result = 'joined' | 'duplicate'
type Waitlist = {
  /** The email this visitor joined with, if any. */
  email: string | null
  result: Result | null
  join: (email: string) => Result | 'invalid'
  /** Scroll to the closing waitlist card and focus its input. */
  focusCard: () => void
}

export const WaitlistCtx = createContext<Waitlist | null>(null)

export function readMe() {
  try {
    return localStorage.getItem(ME_KEY)
  } catch {
    return null
  }
}

export function useWaitlist() {
  const v = useContext(WaitlistCtx)
  if (!v) throw new Error('useWaitlist needs WaitlistProvider')
  return v
}
