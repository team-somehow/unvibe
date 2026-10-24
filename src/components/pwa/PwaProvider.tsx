import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Download, Ellipsis, Share, X } from 'lucide-react'
import { PwaContext, isStandalone, standaloneQuery } from './usePwaInstall'
import './PwaControls.css'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' } | void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallSnapshot = {
  installed: boolean
  available: boolean
  prompting: boolean
}

// Capture the event as soon as this module is imported, including before React mounts.
// Browsers only allow each deferred event to be prompted once.
let deferredPrompt: InstallPromptEvent | null = null
let installedThisPage = false
const subscribers = new Set<() => void>()
const serverSnapshot: InstallSnapshot = { installed: false, available: false, prompting: false }
let snapshot: InstallSnapshot = { ...serverSnapshot, installed: isStandalone() }

function publish(change: Partial<InstallSnapshot>) {
  snapshot = { ...snapshot, ...change }
  subscribers.forEach((subscriber) => subscriber())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    publish({ available: true })
  })
  window.addEventListener('appinstalled', () => {
    installedThisPage = true
    deferredPrompt = null
    publish({ installed: true, available: false, prompting: false })
  })
  standaloneQuery?.addEventListener('change', () => publish({ installed: installedThisPage || isStandalone() }))
}

function subscribe(subscriber: () => void) {
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}

type InstallGuide = {
  intro: string
  steps: ReactNode[]
}

function installGuide(): InstallGuide {
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const android = /Android/i.test(ua)
  const mac = /Macintosh|MacIntel/.test(ua) && !ios
  const safari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/i.test(ua)

  if (ios) {
    return {
      intro: 'Add Unvibe to your Home Screen for a full-screen feed.',
      steps: [
        <>
          Open this page in <strong>Safari</strong>.
        </>,
        <>
          Tap <Share size={16} aria-hidden="true" /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>. You may need to
          scroll through the actions.
        </>,
        <>
          Keep <strong>Open as Web App</strong> enabled if shown, then tap <strong>Add</strong>.
        </>,
      ],
    }
  }
  if (android) {
    return {
      intro: 'Keep Unvibe one tap away on your Home Screen.',
      steps: [
        <>
          Open this page in <strong>Chrome</strong>.
        </>,
        <>
          Open the <Ellipsis size={16} aria-hidden="true" /> browser menu and choose <strong>Install app</strong> or{' '}
          <strong>Add to Home screen</strong>.
        </>,
        <>Confirm the browser’s installation prompt.</>,
      ],
    }
  }
  if (mac && safari) {
    return {
      intro: 'Give Unvibe its own window and a place in your Dock.',
      steps: [
        <>
          In Safari on macOS Sonoma or later, choose <strong>File → Add to Dock</strong>.
        </>,
        <>
          Confirm the name, then select <strong>Add</strong>.
        </>,
        <>Open Unvibe from your Dock whenever you want to watch.</>,
      ],
    }
  }
  return {
    intro: 'Give Unvibe its own window, right beside your other apps.',
    steps: [
      <>
        Open this page in <strong>Chrome</strong> or <strong>Edge</strong>.
      </>,
      <>
        Use the <Download size={16} aria-hidden="true" /> install icon in the address bar, or look for <strong>Install Unvibe</strong> or{' '}
        <strong>Install page as app</strong> in the browser menu.
      </>,
      <>Confirm the browser’s installation prompt.</>,
    ],
  }
}

function InstallHelp({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [guide] = useState(installGuide)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    if (!dialog) return
    // Native modal dialogs keep focus inside and make the background inert.
    dialog.showModal()
    closeRef.current?.focus()
    return () => {
      dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <dialog
      ref={dialogRef}
      className="pwa-install-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (!first || !last) return
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="pwa-install-content">
        <button ref={closeRef} type="button" className="pwa-install-close" aria-label="Close installation instructions" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <div className="pwa-install-symbol">
          <Download size={25} aria-hidden="true" />
        </div>
        <p className="pwa-install-eyebrow">YOUR FEED. ONE TAP AWAY.</p>
        <h2 id={titleId}>Install Unvibe</h2>
        <p id={descriptionId} className="pwa-install-intro">
          {guide.intro}
        </p>
        <ol className="pwa-install-steps">
          {guide.steps.map((step, index) => (
            <li key={index}>
              <span className="pwa-install-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="pwa-install-note">
          If these options are missing, use this browser’s menu to open the page in Safari or Chrome. Installation is handled by your
          browser.
        </p>
        <p className="pwa-install-note">
          You may need to pair again inside the installed app. Creating new reels requires the local companion on the same computer.
        </p>
        <button type="button" className="pwa-install-done" onClick={onClose}>
          Got it
        </button>
      </div>
    </dialog>,
    document.body,
  )
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  )
  const [showHelp, setShowHelp] = useState(false)
  const requestInstall = useCallback(async () => {
    if (snapshot.installed || snapshot.prompting) return
    const prompt = deferredPrompt
    if (!prompt) {
      setShowHelp(true)
      return
    }
    deferredPrompt = null
    publish({ prompting: true, available: false })
    try {
      // Call prompt synchronously in the click gesture, before awaiting anything.
      await prompt.prompt()
      await prompt.userChoice
      // Acceptance is not proof of installation. Only appinstalled or standalone
      // mode hides the button; cancelling does not open another prompt.
    } catch {
      setShowHelp(true)
    } finally {
      publish({ prompting: false })
    }
  }, [])
  const value = useMemo(() => ({ ...state, requestInstall }), [state, requestInstall])

  return (
    <PwaContext.Provider value={value}>
      {children}
      {showHelp && !state.installed && <InstallHelp onClose={() => setShowHelp(false)} />}
    </PwaContext.Provider>
  )
}
