import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}

function subscribeVisibility(cb: () => void) {
  document.addEventListener('visibilitychange', cb)
  return () => document.removeEventListener('visibilitychange', cb)
}

/** False while the tab is in the background, so reels stop playing (and talking). */
export function usePageVisible() {
  return useSyncExternalStore(subscribeVisibility, () => document.visibilityState !== 'hidden', () => true)
}

/** A callback with a stable identity that always sees the latest props and state. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn)
  useLayoutEffect(() => {
    ref.current = fn
  })
  return useCallback(((...args) => ref.current(...args)) as T, [])
}
