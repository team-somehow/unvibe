import { Download } from 'lucide-react'
import { usePwaInstall } from './usePwaInstall'

export function InstallButton({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const { installed, prompting, requestInstall } = usePwaInstall()
  if (installed) return null

  return (
    <button
      type="button"
      className={`pwa-install-button ${compact ? 'pwa-install-button-compact' : ''} ${className}`}
      onClick={() => {
        void requestInstall()
      }}
      disabled={prompting}
      aria-label={prompting ? 'Opening installation prompt' : 'Install Unvibe'}
      title="Install Unvibe"
    >
      <Download size={compact ? 19 : 18} strokeWidth={1.8} aria-hidden="true" />
      <span>{prompting ? 'Opening…' : compact ? 'Install' : 'Install Unvibe'}</span>
    </button>
  )
}
