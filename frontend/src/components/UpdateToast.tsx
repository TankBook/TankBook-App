import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

// Phone PWAs are usually left open for days without a full reload, so the
// browser's own "check for a new service worker" logic (which only runs on
// navigation) rarely gets a chance to fire on its own. Poll for updates
// ourselves — on an interval, and whenever the app regains focus/visibility.
const CHECK_INTERVAL_MS = 60 * 60 * 1000

export default function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => registration.update().catch(() => {})
      setInterval(check, CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setNeedRefresh(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [needRefresh, setNeedRefresh])

  if (!needRefresh) return null

  return (
    <div
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 1000,
        maxWidth: 420, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12,
        padding: '10px 12px', boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>
        A new version of TankBook is available.
      </span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
          flexShrink: 0,
        }}
      >
        <RefreshCw size={12} />Refresh
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', lineHeight: 0, padding: 4, flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
