import { useState, useEffect } from 'react'
import { Card, AquaDropIcon } from '../components/ui'
import { api, AuthConfig } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.auth.config().then(setConfig).catch(() => setConfig({ allow_registration_effective: false, oidc_enabled: false, oidc_label: null }))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, displayName.trim() || undefined)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16,
    }}>
      <Card style={{ width: 360, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
          <AquaDropIcon size={22} />
          <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', letterSpacing: '0.04em' }}>TANKBOOK</span>
        </div>

        <p style={{ fontWeight: 500, fontSize: 15, margin: '0 0 16px', color: 'var(--text)', textAlign: 'center' }}>
          {mode === 'login' ? 'Sign in' : 'Create an account'}
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'register' && (
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Name (optional)"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={mode === 'register' ? 8 : undefined}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />

          {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--red)' }}>{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 16px', borderRadius: 8,
              fontWeight: 500, cursor: submitting ? 'default' : 'pointer',
              border: '0.5px solid var(--blue-border)',
              background: submitting ? 'var(--surface-2)' : 'var(--blue-bg)',
              color: submitting ? 'var(--text-3)' : 'var(--blue)',
            }}
          >
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {config?.oidc_enabled && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-sub)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-sub)' }} />
            </div>
            <a
              href="/api/auth/oidc/login"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', boxSizing: 'border-box', padding: '8px 16px', borderRadius: 8,
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
                border: '0.5px solid var(--btn-border)', color: 'var(--text)',
              }}
            >
              Sign in with {config.oidc_label}
            </a>
          </>
        )}

        {config && (mode === 'login' ? config.allow_registration_effective : true) && (
          <p style={{ margin: '16px 0 0', fontSize: 12, color: 'var(--text-2)', textAlign: 'center' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
              style={{ border: 'none', background: 'none', padding: 0, color: 'var(--blue)', cursor: 'pointer', font: 'inherit' }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        )}
      </Card>
    </div>
  )
}
