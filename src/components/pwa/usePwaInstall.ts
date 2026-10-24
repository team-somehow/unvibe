import { createContext, useContext } from 'react'

type PwaContextValue = {
  installed: boolean
  available: boolean
  prompting: boolean
  requestInstall: () => Promise<void>
}

export const PwaContext = createContext<PwaContextValue | null>(null)

export function usePwaInstall() {
  const context = useContext(PwaContext)
  if (!context) throw new Error('usePwaInstall must be used inside PwaProvider')
  return context
}
