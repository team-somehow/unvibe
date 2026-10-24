import { Download, RefreshCw, WifiOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './PwaRuntime.css'

export function PwaRuntime() {
  const location = useLocation()
  const started = useRef(false)
  const update = useRef<(() => Promise<void>) | null>(null)
  const reloadRequested = useRef(false)
  const registration = useRef<ServiceWorkerRegistration | null>(null)
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const [error, setError] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    // New visitors download offline media only after opening the app. Returning
    // visitors also check for updates on the landing page they already cached.
    if (!import.meta.env.PROD || started.current || !('serviceWorker' in navigator)) return
    let cancelled = false
    const start = async () => {
      const inApp = ['/app', '/connect'].includes(location.pathname)
      if (!inApp && !(await navigator.serviceWorker.getRegistration())) return
      if (cancelled || started.current) return
      started.current = true
      update.current = registerSW({
        immediate: true,
        onNeedRefresh: () => setNeedRefresh(true),
        // Another open tab can activate the worker too. Keep this tab's work
        // intact until its own visitor explicitly chooses to reload.
        onNeedReload: () => setNeedRefresh(true),
        onOfflineReady: () => {
          setOfflineReady(true)
          setError(false)
        },
        onRegisteredSW: (_url, value) => {
          registration.current = value ?? null
        },
        onRegisterError: () => setError(true),
      })
    }
    void start().catch(() => {
      if (!cancelled) setError(true)
    })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let previousController = navigator.serviceWorker.controller
    const changed = () => {
      const wasControlled = Boolean(previousController)
      previousController = navigator.serviceWorker.controller
      if (reloadRequested.current) window.location.reload()
      else if (wasControlled) setNeedRefresh(true)
    }
    navigator.serviceWorker.addEventListener('controllerchange', changed)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', changed)
  }, [])

  useEffect(() => {
    const online = () => {
      setOffline(false)
      void registration.current?.update().catch(() => {})
    }
    const offline = () => setOffline(true)
    const visible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void registration.current?.update().catch(() => {})
    }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])

  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), 7000)
    return () => clearTimeout(timer)
  }, [offlineReady])

  const refresh = async () => {
    setUpdating(true)
    // If another tab already activated the update, a normal reload is enough.
    if (!registration.current?.waiting) {
      window.location.reload()
      return
    }
    reloadRequested.current = true
    try {
      await update.current?.()
    } catch {
      reloadRequested.current = false
      setUpdating(false)
      setError(true)
    }
  }

  return (
    <>
      {offline && (
        <div className="pwa-network-status" role="status">
          <WifiOff size={13} /> Offline · saved reels stay available
        </div>
      )}
      {(needRefresh || offlineReady || error) && (
        <aside className="pwa-runtime-notice" aria-label={needRefresh ? 'App update available' : 'Offline app status'}>
          <span className="pwa-runtime-icon">{needRefresh ? <RefreshCw size={19} /> : <Download size={19} />}</span>
          <div role="status">
            <strong>{needRefresh ? 'An update is ready.' : error ? 'Offline setup couldn’t finish.' : 'Ready to go offline.'}</strong>
            <p>
              {needRefresh
                ? 'Finish saving your work, then update Unvibe.'
                : error
                  ? 'You can still use Unvibe online. Reopen it online to try again.'
                  : 'Demo reels and your saved lessons are available on this device.'}
            </p>
          </div>
          {needRefresh && (
            <button type="button" className="pwa-runtime-update" disabled={updating} onClick={() => void refresh()}>
              {updating ? 'Updating…' : 'Update'}
            </button>
          )}
          <button
            type="button"
            className="pwa-runtime-close"
            aria-label={needRefresh ? 'Update later' : 'Dismiss offline status'}
            onClick={() => {
              setNeedRefresh(false)
              setOfflineReady(false)
              setError(false)
            }}
          >
            <X size={16} />
          </button>
        </aside>
      )}
    </>
  )
}
