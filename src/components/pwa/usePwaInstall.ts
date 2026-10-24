import { createContext, useContext } from 'react'

type PwaContextValue = {
  installed: boolean
  available: boolean
  prompting: boolean
  requestInstall: () => Promise<void>
}

export const standaloneQuery = typeof window === 'undefined' ? null : window.matchMedia('(display-mode: standalone)')
/** Running as the installed app rather than in a browser tab. */
export const isStandalone = () =>
  Boolean(standaloneQuery?.matches || (typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone))

export const PwaContext = createContext<PwaContextValue | null>(null)

export function usePwaInstall() {
  const context = useContext(PwaContext)
  if (!context) throw new Error('usePwaInstall must be used inside PwaProvider')
  return context
}
