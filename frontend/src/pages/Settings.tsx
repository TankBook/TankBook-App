import { useState, useRef, useEffect } from 'react'
import { CalendarDays, Ruler, Info, Download, Upload, Droplets, RefreshCw, Bell, Globe, Utensils, X, AlertTriangle, HardDrive, Fish, Image as ImageIcon, Bot, Lock, SlidersHorizontal, Users as UsersIcon, KeyRound, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import { useSettings, formatDate, formatDateTime, DateFormat, UnitSystem } from '../context/SettingsContext'
import { Card, Modal, ConfirmDialog, StatCard, FieldLabel } from '../components/ui'
import { api, Tank, AgentSettings, AuthSettings, UserListItem } from '../api/client'
import { useAuth } from '../context/AuthContext'

const PROVIDER_OPTIONS: { value: 'anthropic' | 'openai' | 'ollama'; label: string }[] = [
  { value: 'anthropic', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'ollama', label: 'Ollama (local / self-hosted)' },
]

const MODEL_PLACEHOLDER: Record<string, string> = {
  anthropic: 'e.g. claude-sonnet-4-5-20250929',
  openai: 'e.g. gpt-4o',
  ollama: 'e.g. llama3.1',
}

function AgentSettingsSection() {
  const [settings, setSettings] = useState<AgentSettings | null>(null)
  const [provider, setProvider] = useState<'anthropic' | 'openai' | 'ollama'>('anthropic')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.agent.getSettings()
      .then(s => {
        setSettings(s)
        setProvider(s.provider ?? 'anthropic')
        setModel(s.model ?? '')
        setBaseUrl(s.base_url ?? '')
      })
      .catch(() => setError('Could not load assistant settings'))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const updated = await api.agent.updateSettings({
        provider,
        model: model.trim(),
        base_url: baseUrl.trim() || null,
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      })
      setSettings(updated)
      setApiKey('')
      setSaved(true)
    } catch {
      setError('Could not save assistant settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
      <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={14} color="var(--text-2)" />AI Assistant</p>
      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
        Connect an LLM to power the Assistant page, which can answer diagnostic questions using your tank data. The provider you choose is called directly from this server — its API key is stored here, not sent anywhere else.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <FieldLabel>Provider</FieldLabel>
          <select
            value={provider}
            onChange={e => { setProvider(e.target.value as typeof provider); setSaved(false) }}
            style={{ width: '100%' }}
          >
            {PROVIDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <FieldLabel>Model</FieldLabel>
          <input
            value={model}
            onChange={e => { setModel(e.target.value); setSaved(false) }}
            placeholder={MODEL_PLACEHOLDER[provider]}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {(provider === 'ollama' || provider === 'openai') && (
          <div>
            <FieldLabel>{provider === 'ollama' ? 'Base URL' : 'Base URL (optional override)'}</FieldLabel>
            <input
              value={baseUrl}
              onChange={e => { setBaseUrl(e.target.value); setSaved(false) }}
              placeholder={provider === 'ollama' ? 'e.g. http://192.168.1.50:11434/v1' : 'https://api.openai.com/v1'}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {provider !== 'ollama' && (
          <div>
            <FieldLabel>API Key</FieldLabel>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setSaved(false) }}
              placeholder={settings?.api_key_set ? 'Key saved — enter a new key to replace it' : 'sk-…'}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button
            onClick={save}
            disabled={saving || !model.trim()}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: saving || !model.trim() ? 'default' : 'pointer',
              border: '0.5px solid var(--blue-border)',
              background: !saving && model.trim() ? 'var(--blue-bg)' : 'var(--surface-2)',
              color: !saving && model.trim() ? 'var(--blue)' : 'var(--text-3)',
            }}
          >
            {saving ? 'Saving…' : 'Save Assistant Settings'}
          </button>
          {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved</span>}
          {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
        </div>
      </div>
    </section>
  )
}

function AccessSettingsSection() {
  const { user } = useAuth()
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingToggle, setSavingToggle] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    api.auth.getSettings().then(setAuthSettings).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function toggleRegistration(allow: boolean) {
    setSavingToggle(true)
    try {
      setAuthSettings(await api.auth.updateSettings({ allow_registration: allow }))
    } finally {
      setSavingToggle(false)
    }
  }

  async function changePassword() {
    setChangingPassword(true)
    setPasswordSaved(false)
    setPasswordError(null)
    try {
      await api.auth.changePassword({
        current_password: user?.has_password ? currentPassword : undefined,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setPasswordSaved(true)
    } catch (e: any) {
      setPasswordError(e.message ?? 'Could not change password')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) return null

  return (
    <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
      <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={14} color="var(--text-2)" />Access</p>
      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
        Everyone who's logged in shares the same tanks and data for now — this instance doesn't have per-user permissions yet.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-label)' }}>
          <input
            type="checkbox"
            checked={authSettings?.allow_registration ?? false}
            disabled={savingToggle}
            onChange={e => toggleRegistration(e.target.checked)}
          />
          Allow new accounts to be created from the login screen
        </label>

        <div>
          <FieldLabel>Change your password</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {user?.has_password && (
              <input
                type="password"
                value={currentPassword}
                onChange={e => { setCurrentPassword(e.target.value); setPasswordSaved(false) }}
                placeholder="Current password"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            )}
            <input
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPasswordSaved(false) }}
              placeholder="New password (min. 8 characters)"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={changePassword}
                disabled={changingPassword || newPassword.length < 8 || (!!user?.has_password && !currentPassword)}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: changingPassword ? 'default' : 'pointer',
                  border: '0.5px solid var(--blue-border)',
                  background: 'var(--blue-bg)', color: 'var(--blue)',
                }}
              >
                {changingPassword ? 'Saving…' : 'Update Password'}
              </button>
              {passwordSaved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Password updated</span>}
              {passwordError && <span style={{ fontSize: 12, color: 'var(--red)' }}>{passwordError}</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function UsersSection() {
  const { dateFormat } = useSettings()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [editingUser, setEditingUser] = useState<UserListItem | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null)
  const [issuerUrl, setIssuerUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loadingOidc, setLoadingOidc] = useState(true)
  const [savingOidc, setSavingOidc] = useState(false)
  const [oidcSaved, setOidcSaved] = useState(false)
  const [oidcError, setOidcError] = useState<string | null>(null)

  function refreshUsers() {
    return api.auth.listUsers().then(setUsers).catch(() => {})
  }

  useEffect(() => {
    refreshUsers().finally(() => setLoadingUsers(false))
    api.auth.getSettings()
      .then(s => {
        setAuthSettings(s)
        setIssuerUrl(s.oidc_issuer_url ?? '')
        setClientId(s.oidc_client_id ?? '')
        setDisplayName(s.oidc_display_name ?? '')
      })
      .catch(() => {})
      .finally(() => setLoadingOidc(false))
  }, [])

  async function saveOidc() {
    setSavingOidc(true)
    setOidcSaved(false)
    setOidcError(null)
    try {
      const updated = await api.auth.updateSettings({
        oidc_issuer_url: issuerUrl.trim() || null,
        oidc_client_id: clientId.trim() || null,
        oidc_display_name: displayName.trim() || null,
        ...(clientSecret.trim() ? { oidc_client_secret: clientSecret.trim() } : {}),
      })
      setAuthSettings(updated)
      setClientSecret('')
      setOidcSaved(true)
    } catch {
      setOidcError('Could not save OIDC settings')
    } finally {
      setSavingOidc(false)
    }
  }

  function openEdit(u: UserListItem) {
    setEditingUser(u)
    setEditEmail(u.email)
    setEditDisplayName(u.display_name ?? '')
    setEditError(null)
  }

  async function saveEdit() {
    if (!editingUser) return
    setSavingEdit(true)
    setEditError(null)
    try {
      const updated = await api.auth.updateUser(editingUser.id, {
        email: editEmail.trim(),
        display_name: editDisplayName.trim() || null,
      })
      setUsers(us => us.map(u => (u.id === updated.id ? updated : u)))
      setEditingUser(null)
    } catch (e: any) {
      setEditError(e.message ?? 'Could not save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  async function confirmDelete() {
    if (!deletingUser) return
    setDeleteError(null)
    try {
      await api.auth.deleteUser(deletingUser.id)
      setUsers(us => us.filter(u => u.id !== deletingUser.id))
      setDeletingUser(null)
    } catch (e: any) {
      setDeleteError(e.message ?? 'Could not delete user')
    }
  }

  return (
    <>
      <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><UsersIcon size={14} color="var(--text-2)" />Users</p>
        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
          Everyone with an account on this instance, local or via SSO. There's no role system yet — every account has the same access.
        </p>

        {loadingUsers ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>Method</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>Joined</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>Last login</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ padding: '8px 10px', color: 'var(--text)', borderBottom: '0.5px solid var(--border-sub)' }}>{u.display_name || '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text)', borderBottom: '0.5px solid var(--border-sub)' }}>{u.email}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '0.5px solid var(--border-sub)' }}>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        {u.has_password && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-2)' }}>Local</span>}
                        {u.has_oidc && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--blue-bg)', color: 'var(--blue)' }}>SSO</span>}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-2)', borderBottom: '0.5px solid var(--border-sub)' }}>{formatDate(u.created_at, dateFormat)}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-2)', borderBottom: '0.5px solid var(--border-sub)' }}>
                      {u.last_login_at ? formatDateTime(u.last_login_at, dateFormat) : 'Never'}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '0.5px solid var(--border-sub)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => openEdit(u)}
                        title="Edit user"
                        style={{ display: 'inline-flex', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, lineHeight: 0 }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { setDeletingUser(u); setDeleteError(null) }}
                        title={u.id === currentUser?.id ? "You can't delete your own account here" : 'Delete user'}
                        disabled={u.id === currentUser?.id}
                        style={{
                          display: 'inline-flex', background: 'none', border: 'none', padding: 4, lineHeight: 0,
                          cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer',
                          color: u.id === currentUser?.id ? 'var(--text-4)' : 'var(--text-3)',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!loadingOidc && (
        <section>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><KeyRound size={14} color="var(--text-2)" />Single Sign-On (OIDC)</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Let people sign in with an external identity provider (Authentik, Keycloak, Google, etc). Leave the issuer URL blank to turn SSO off — the login screen will only show local email/password.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <FieldLabel>Issuer URL</FieldLabel>
              <input
                value={issuerUrl}
                onChange={e => { setIssuerUrl(e.target.value); setOidcSaved(false) }}
                placeholder="e.g. https://auth.example.com/application/o/tankbook/"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <FieldLabel>Client ID</FieldLabel>
              <input
                value={clientId}
                onChange={e => { setClientId(e.target.value); setOidcSaved(false) }}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <FieldLabel>Client Secret</FieldLabel>
              <input
                type="password"
                value={clientSecret}
                onChange={e => { setClientSecret(e.target.value); setOidcSaved(false) }}
                placeholder={authSettings?.oidc_client_secret_set ? 'Secret saved — enter a new one to replace it' : ''}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <FieldLabel>Provider name — shown on the login page as "Sign in with …"</FieldLabel>
              <input
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setOidcSaved(false) }}
                placeholder="e.g. Authentik"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <button
                onClick={saveOidc}
                disabled={savingOidc}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: savingOidc ? 'default' : 'pointer',
                  border: '0.5px solid var(--blue-border)',
                  background: !savingOidc ? 'var(--blue-bg)' : 'var(--surface-2)',
                  color: !savingOidc ? 'var(--blue)' : 'var(--text-3)',
                }}
              >
                {savingOidc ? 'Saving…' : 'Save SSO Settings'}
              </button>
              {oidcSaved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved</span>}
              {oidcError && <span style={{ fontSize: 12, color: 'var(--red)' }}>{oidcError}</span>}
            </div>
          </div>
        </section>
      )}

      {editingUser && (
        <Modal title="Edit User" onClose={() => setEditingUser(null)} width={380}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                value={editDisplayName}
                onChange={e => setEditDisplayName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            {editError && <p style={{ margin: 0, fontSize: 12, color: 'var(--red)' }}>{editError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  fontSize: 13, padding: '7px 16px', borderRadius: 8,
                  border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit || !editEmail.trim()}
                style={{
                  fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                  border: '0.5px solid var(--blue-border)',
                  background: savingEdit || !editEmail.trim() ? 'var(--surface-2)' : 'var(--blue-bg)',
                  color: savingEdit || !editEmail.trim() ? 'var(--text-3)' : 'var(--blue)',
                  cursor: savingEdit || !editEmail.trim() ? 'default' : 'pointer',
                }}
              >
                {savingEdit ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deletingUser && (
        <ConfirmDialog
          title="Delete user?"
          message={`This permanently deletes the account for ${deletingUser.display_name || deletingUser.email}. This can't be undone.${deleteError ? ` ${deleteError}.` : ''}`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeletingUser(null)}
        />
      )}
    </>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = -1
  do { value /= 1024; unitIndex++ } while (value >= 1024 && unitIndex < units.length - 1)
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

const APP_VERSION = '0.7.2'
const GITHUB_REPO = 'TankBook/TankBook-App'

function semverNewer(current: string, latest: string): boolean {
  const c = current.split('.').map(Number)
  const l = latest.split('.').map(Number)
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] ?? 0, lv = l[i] ?? 0
    if (lv > cv) return true
    if (lv < cv) return false
  }
  return false
}

const FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK / Europe)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
]

const UNIT_OPTIONS: { value: UnitSystem; label: string; example: string }[] = [
  { value: 'mm', label: 'Millimetres (mm)', example: '600 × 400 × 300 mm' },
  { value: 'cm', label: 'Centimetres (cm)', example: '60 × 40 × 30 cm' },
  { value: 'm',  label: 'Metres (m)',        example: '0.6 × 0.4 × 0.3 m' },
  { value: 'imperial', label: 'Imperial (inches)', example: '23.62 × 15.75 × 11.81 in' },
]

const SETTINGS_TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'users', label: 'Users', icon: UsersIcon },
  { id: 'about', label: 'About', icon: Info },
]

export default function Settings() {
  const { dateFormat, setDateFormat, unitSystem, setUnitSystem, defaultTank, setDefaultTank, alertRetentionDays, setAlertRetentionDays, appUrl, setAppUrl, feedingAmountPresets, setFeedingAmountPresets, loading } = useSettings()
  const [tanks, setTanks] = useState<Tank[]>([])
  const [draftDateFormat, setDraftDateFormat] = useState<DateFormat>(dateFormat)
  const [draftUnitSystem, setDraftUnitSystem] = useState<UnitSystem>(unitSystem)
  const [draftDefaultTank, setDraftDefaultTank] = useState(defaultTank ?? '')
  const [draftAlertRetentionDays, setDraftAlertRetentionDays] = useState<number | null>(alertRetentionDays)
  const [draftAppUrl, setDraftAppUrl] = useState(appUrl ?? '')
  const [draftFeedingAmountPresets, setDraftFeedingAmountPresets] = useState<string[]>(feedingAmountPresets)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [newPreset, setNewPreset] = useState('')
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  const [activeTab, setActiveTab] = useState(SETTINGS_TABS[0].id)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!loading) {
      setDraftDateFormat(dateFormat)
      setDraftUnitSystem(unitSystem)
      setDraftDefaultTank(defaultTank ?? '')
      setDraftAlertRetentionDays(alertRetentionDays)
      setDraftAppUrl(appUrl ?? '')
      setDraftFeedingAmountPresets(feedingAmountPresets)
    }
  }, [loading])

  function addPreset() {
    const value = newPreset.trim()
    if (!value || draftFeedingAmountPresets.includes(value)) return
    setDraftFeedingAmountPresets([...draftFeedingAmountPresets, value])
    setNewPreset('')
  }

  useEffect(() => {
    api.tanks.list().then(setTanks)
  }, [])

  const feedingAmountPresetsChanged = JSON.stringify(draftFeedingAmountPresets) !== JSON.stringify(feedingAmountPresets)

  const settingsChanged = draftDateFormat !== dateFormat
    || draftUnitSystem !== unitSystem
    || draftDefaultTank !== (defaultTank ?? '')
    || draftAlertRetentionDays !== alertRetentionDays
    || draftAppUrl !== (appUrl ?? '')
    || feedingAmountPresetsChanged

  async function saveSettings() {
    setSavingSettings(true)
    setSettingsSaved(false)
    try {
      await Promise.all([
        draftDateFormat !== dateFormat && setDateFormat(draftDateFormat),
        draftUnitSystem !== unitSystem && setUnitSystem(draftUnitSystem),
        draftDefaultTank !== (defaultTank ?? '') && setDefaultTank(draftDefaultTank || null),
        draftAlertRetentionDays !== alertRetentionDays && setAlertRetentionDays(draftAlertRetentionDays),
        draftAppUrl !== (appUrl ?? '') && setAppUrl(draftAppUrl || null),
        feedingAmountPresetsChanged && setFeedingAmountPresets(draftFeedingAmountPresets),
      ])
      setSettingsSaved(true)
    } finally {
      setSavingSettings(false)
    }
  }

  function resetToDefaults() {
    setDraftDateFormat('DD/MM/YYYY')
    setDraftUnitSystem('mm')
    setDraftDefaultTank('')
    setDraftAlertRetentionDays(null)
    setDraftAppUrl('')
    setDraftFeedingAmountPresets(['1 pinch', '1 cube'])
    setSettingsSaved(false)
  }

  const [checking, setChecking] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'up-to-date' | 'available' | 'no-releases' | 'error'>('idle')
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null)

  async function checkForUpdates() {
    setChecking(true)
    setUpdateStatus('idle')
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      if (res.status === 404) { setUpdateStatus('no-releases'); return }
      if (!res.ok) throw new Error('GitHub API error')
      const data = await res.json()
      const tag: string = (data.tag_name ?? '').replace(/^v/, '')
      setLatestVersion(tag)
      setReleaseUrl(data.html_url ?? null)
      setUpdateStatus(semverNewer(APP_VERSION, tag) ? 'available' : 'up-to-date')
    } catch {
      setUpdateStatus('error')
    } finally {
      setChecking(false)
    }
  }

  const [stats, setStats] = useState<{ species_count: number; image_count: number; storage_bytes: number } | null>(null)
  useEffect(() => {
    fetch('/api/settings/stats').then(res => res.json()).then(setStats).catch(() => {})
  }, [])

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: boolean; tanks_restored: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function closeImportModal() {
    setShowImportModal(false)
    setImportFile(null)
    setImportResult(null)
    setImportError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleExport() {
    setExporting(true)
    try {
      const data = await api.backup.export()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `tankbook-backup-${ts}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    setImportResult(null)
    setImportError(null)
    try {
      const text = await importFile.text()
      const data = JSON.parse(text)
      const result = await api.backup.import(data)
      setImportResult(result)
      setImportFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: any) {
      setImportError(e.message ?? 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-2)' }}>Loading settings…</p>

  const exampleDate = new Date()

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Settings</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-2)' }}>
        App-wide settings for TankBook. Every account on this instance shares the same tanks and data, so these settings apply to everyone.
      </p>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: 'flex-start' }}>

        <Card style={{ width: isMobile ? '100%' : 200, flexShrink: 0, padding: 8, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 2, overflowX: isMobile ? 'auto' : 'visible' }}>
            {SETTINGS_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: isMobile ? 'auto' : '100%',
                  padding: '8px 10px', borderRadius: 8, fontSize: 13, textAlign: 'left', cursor: 'pointer',
                  border: 'none', whiteSpace: 'nowrap',
                  background: activeTab === t.id ? 'var(--blue-bg)' : 'transparent',
                  color: activeTab === t.id ? 'var(--blue)' : 'var(--text)',
                  fontWeight: activeTab === t.id ? 500 : 400,
                }}
              >
                <t.icon size={14} style={{ flexShrink: 0 }} />
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        {activeTab === 'general' && (
      <Card style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, padding: 24, flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Droplets size={14} color="var(--text-2)" />Default Tank</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Pre-selects this tank on pages with a tank dropdown, like the Livestock Journal.
          </p>
          <select
            value={draftDefaultTank}
            onChange={e => { setDraftDefaultTank(e.target.value); setSettingsSaved(false) }}
            style={{ width: '100%' }}
          >
            <option value="">No default</option>
            {tanks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14} color="var(--text-2)" />Date Format</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Controls how dates are displayed across tanks, parameters, and the maintenance schedule.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FORMAT_OPTIONS.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: draftDateFormat === opt.value ? '1px solid var(--blue-border)' : '0.5px solid var(--border)',
                  background: draftDateFormat === opt.value ? 'var(--blue-bg)' : 'transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="dateFormat"
                    checked={draftDateFormat === opt.value}
                    onChange={() => { setDraftDateFormat(opt.value); setSettingsSaved(false) }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{opt.label}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                  {formatDate(exampleDate, opt.value)}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Ruler size={14} color="var(--text-2)" />Dimension Units</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Controls how tank dimensions (width, height, depth) are displayed and entered. Changing this converts existing values automatically.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {UNIT_OPTIONS.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: draftUnitSystem === opt.value ? '1px solid var(--blue-border)' : '0.5px solid var(--border)',
                  background: draftUnitSystem === opt.value ? 'var(--blue-bg)' : 'transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="unitSystem"
                    checked={draftUnitSystem === opt.value}
                    onChange={() => { setDraftUnitSystem(opt.value); setSettingsSaved(false) }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{opt.label}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>{opt.example}</span>
              </label>
            ))}
          </div>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={14} color="var(--text-2)" />Alert Retention</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Alerts older than this are automatically deleted when you view a tank's alert tab. Set to indefinite to keep alerts until manually deleted.
          </p>
          <select
            value={draftAlertRetentionDays ?? ''}
            onChange={e => { setDraftAlertRetentionDays(e.target.value ? Number(e.target.value) : null); setSettingsSaved(false) }}
            style={{ width: '100%' }}
          >
            <option value="">Indefinite (manual delete only)</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={14} color="var(--text-2)" />App URL</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            The URL this instance is reachable at. Used when sharing species YAML links with other TankBook instances. Leave blank to use the browser's current origin.
          </p>
          <input
            type="url"
            value={draftAppUrl}
            onChange={e => { setDraftAppUrl(e.target.value); setSettingsSaved(false) }}
            placeholder={`e.g. http://192.168.1.100:3000`}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </section>

        <AccessSettingsSection />

        <AgentSettingsSection />

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Utensils size={14} color="var(--text-2)" />Feeding Amounts</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Presets for how much to feed. These become selectable when editing an inhabitant's feeding info.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newPreset}
              onChange={e => setNewPreset(e.target.value)}
              placeholder="e.g. 1 pinch, 2 cubes"
              onKeyDown={e => e.key === 'Enter' && addPreset()}
              style={{ flex: 1, boxSizing: 'border-box' }}
            />
            <button
              onClick={addPreset}
              disabled={!newPreset.trim()}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: newPreset.trim() ? 'pointer' : 'default',
                border: '0.5px solid var(--blue-border)',
                background: newPreset.trim() ? 'var(--blue-bg)' : 'var(--surface-2)',
                color: newPreset.trim() ? 'var(--blue)' : 'var(--text-3)',
              }}
            >
              Add
            </button>
          </div>
          {draftFeedingAmountPresets.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {draftFeedingAmountPresets.map(preset => (
                <span
                  key={preset}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 6px 4px 10px', borderRadius: 999, background: 'var(--surface-2)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                >
                  {preset}
                  <button
                    onClick={() => setDraftFeedingAmountPresets(draftFeedingAmountPresets.filter(p => p !== preset))}
                    style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, lineHeight: 0 }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={resetToDefaults}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '0.5px solid var(--btn-border)',
              background: 'transparent', color: 'var(--text-2)', fontWeight: 500, cursor: 'pointer',
              width: isMobile ? '100%' : undefined, boxSizing: 'border-box',
            }}
          >
            Reset to Defaults
          </button>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 12 }}>
            {settingsSaved && <span style={{ fontSize: 12, color: 'var(--green)', textAlign: isMobile ? 'center' : undefined }}>Settings saved</span>}
            <button
              onClick={saveSettings}
              disabled={!settingsChanged || savingSettings}
              style={{
                padding: '8px 18px', borderRadius: 8, border: '0.5px solid var(--blue-border)',
                background: settingsChanged && !savingSettings ? 'var(--blue-bg)' : 'var(--surface-2)',
                color: settingsChanged && !savingSettings ? 'var(--blue)' : 'var(--text-3)',
                fontWeight: 500, cursor: settingsChanged && !savingSettings ? 'pointer' : 'default',
                width: isMobile ? '100%' : undefined, boxSizing: 'border-box',
              }}
            >
              {savingSettings ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </section>

      </Card>
        )}

        {activeTab === 'users' && (
      <Card style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, padding: 24, flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
        <UsersSection />
      </Card>
        )}

        {activeTab === 'about' && (
      <Card style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, padding: 24, flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} color="var(--text-2)" />Data Backup
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Export all tank data, parameters, livestock, and journal entries to a JSON file. Restoring replaces all current data with the backup.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                flex: 1, display: 'flex', flexDirection: isMobile && !exporting ? 'column' : 'row',
                alignItems: 'center', justifyContent: 'center', gap: isMobile && !exporting ? 2 : 6,
                fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.5 : 1,
                boxSizing: 'border-box',
              }}
            >
              {exporting ? 'Exporting…' : isMobile ? (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Download size={13} />Download</span>
                  <span>Backup</span>
                </>
              ) : (
                <><Download size={13} />Download Backup</>
              )}
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              style={{
                flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center', justifyContent: 'center', gap: isMobile ? 2 : 6,
                fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--red-border)', background: 'var(--red-bg)', color: 'var(--red)',
                cursor: 'pointer', boxSizing: 'border-box',
              }}
            >
              {isMobile ? (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Upload size={13} />Restore</span>
                  <span>Backup</span>
                </>
              ) : (
                <><Upload size={13} />Restore Backup</>
              )}
            </button>
          </div>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <HardDrive size={14} color="var(--text-2)" />Local Storage
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Species data and photos stored on this server.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
            <StatCard label="Storage used" value={stats ? formatBytes(stats.storage_bytes) : '—'} icon={HardDrive} />
            <StatCard label="Species stored locally" value={stats ? stats.species_count : '—'} icon={Fish} />
            <StatCard label="Gallery images saved" value={stats ? stats.image_count : '—'} icon={ImageIcon} />
          </div>
        </section>

        {showImportModal && (
          <Modal title="Restore Backup" onClose={closeImportModal}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
              <AlertTriangle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12, color: 'var(--red)', lineHeight: 1.5 }}>
                Restoring a backup permanently deletes all current tanks, livestock, parameters, and journal entries, replacing them with the contents of the file you choose. This cannot be undone.
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={e => {
                setImportFile(e.target.files?.[0] ?? null)
                setImportResult(null)
                setImportError(null)
              }}
            />
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                border: '0.5px solid var(--btn-border)', borderRadius: 8, overflow: 'hidden',
                background: 'var(--surface)', width: '100%', boxSizing: 'border-box',
              }}
            >
              <span style={{ padding: '7px 12px', background: 'var(--surface-2)', borderRight: '0.5px solid var(--btn-border)', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                Choose File
              </span>
              <span style={{ padding: '7px 10px', fontSize: 12, color: importFile ? 'var(--text)' : 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {importFile ? importFile.name : 'No file chosen'}
              </span>
            </div>

            {importResult && (
              <div style={{ marginTop: 12, background: 'var(--green-bg)', border: '0.5px solid var(--green-border)', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
                  ✓ Restored {importResult.tanks_restored} tank{importResult.tanks_restored !== 1 ? 's' : ''} successfully.
                </p>
              </div>
            )}

            {importError && (
              <div style={{ marginTop: 12, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>{importError}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={closeImportModal}
                style={{
                  flex: isMobile ? 1 : undefined, fontSize: 13, padding: '7px 16px', borderRadius: 8,
                  border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)',
                  cursor: 'pointer', boxSizing: 'border-box',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                style={{
                  flex: isMobile ? 1 : undefined, fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                  border: '0.5px solid var(--red-border)',
                  background: importFile && !importing ? 'var(--red)' : 'var(--surface-2)',
                  color: importFile && !importing ? '#fff' : 'var(--text-3)',
                  cursor: importFile && !importing ? 'pointer' : 'default',
                  boxSizing: 'border-box',
                }}
              >
                {importing ? 'Restoring…' : 'Yes, restore backup'}
              </button>
            </div>
          </Modal>
        )}

        <section>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={14} color="var(--text-2)" />About
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--text-2)' }}>Current Version</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em' }}>
                v{APP_VERSION}
              </p>
            </div>
            <button
              onClick={checkForUpdates}
              disabled={checking}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, padding: '6px 14px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)',
                cursor: checking ? 'not-allowed' : 'pointer', opacity: checking ? 0.6 : 1,
              }}
            >
              <RefreshCw size={12} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
              {checking ? 'Checking…' : 'Check For Updates'}
            </button>
          </div>

          {updateStatus === 'up-to-date' && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--green-bg)', border: '0.5px solid var(--green-border)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                ✓ You're up to date — v{APP_VERSION} is the latest release.
              </p>
            </div>
          )}

          {updateStatus === 'available' && latestVersion && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--blue-bg)', border: '0.5px solid var(--blue-border)' }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>
                Update available — v{latestVersion}
              </p>
              {releaseUrl && (
                <a
                  href={releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'underline' }}
                >
                  View release notes ↗
                </a>
              )}
            </div>
          )}

          {updateStatus === 'no-releases' && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '0.5px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>No releases published on GitHub yet.</p>
            </div>
          )}

          {updateStatus === 'error' && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--red)' }}>Could not reach GitHub. Check your connection and try again.</p>
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>
            TankBook is self-hosted aquarium management software. Species data lives in YAML
            files under <code style={{ fontSize: 11, background: 'var(--tag-bg)', padding: '1px 5px', borderRadius: 4, color: 'var(--text)' }}>species-data/</code>,
            while tank and parameter data is stored in SQLite.
          </p>
        </section>

      </Card>
        )}

      </div>
    </div>
  )
}
