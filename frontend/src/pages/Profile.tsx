import { useState, useEffect } from 'react'
import { CalendarDays, Ruler, Droplets, UserCircle, Lock, Bell, Users, Plus, X, Trash2, Pencil, LogOut } from 'lucide-react'
import { Card, FieldLabel, Modal } from '../components/ui'
import { useSettings, formatDate, DateFormat, UnitSystem } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'
import { useTanks } from '../hooks'
import { api, type Group } from '../api/client'

const PUSH_SUPPORTED =
  typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
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

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const { dateFormat, setDateFormat, unitSystem, setUnitSystem, defaultTank, setDefaultTank } = useSettings()
  const { data: tanks } = useTanks()
  const [savingDateFormat, setSavingDateFormat] = useState(false)
  const [savingUnitSystem, setSavingUnitSystem] = useState(false)
  const [savingDefaultTank, setSavingDefaultTank] = useState(false)
  const exampleDate = new Date()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [notifBusy, setNotifBusy] = useState(false)
  const [notifError, setNotifError] = useState<string | null>(null)
  const [deviceSubscribed, setDeviceSubscribed] = useState<boolean | null>(null)

  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [managingGroup, setManagingGroup] = useState<Group | null>(null)
  const [groupNameDraft, setGroupNameDraft] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [groupError, setGroupError] = useState<string | null>(null)
  const [groupBusy, setGroupBusy] = useState(false)

  function loadGroups() {
    setLoadingGroups(true)
    api.groups.list().then(setGroups).finally(() => setLoadingGroups(false))
  }
  useEffect(loadGroups, [])

  async function createGroup() {
    const name = newGroupName.trim()
    if (!name) return
    setCreatingGroup(true)
    try {
      await api.groups.create(name)
      setNewGroupName('')
      loadGroups()
    } catch (e: any) {
      setGroupError(e.message ?? 'Could not create group')
    } finally {
      setCreatingGroup(false)
    }
  }

  function openManage(group: Group) {
    setManagingGroup(group)
    setGroupNameDraft(group.name)
    setMemberEmail('')
    setGroupError(null)
  }

  async function saveGroupName() {
    if (!managingGroup || !groupNameDraft.trim() || groupNameDraft === managingGroup.name) return
    setGroupBusy(true)
    setGroupError(null)
    try {
      const updated = await api.groups.rename(managingGroup.id, groupNameDraft.trim())
      setManagingGroup(updated)
      loadGroups()
    } catch (e: any) {
      setGroupError(e.message ?? 'Could not rename group')
    } finally {
      setGroupBusy(false)
    }
  }

  async function addMember() {
    if (!managingGroup || !memberEmail.trim()) return
    setGroupBusy(true)
    setGroupError(null)
    try {
      const updated = await api.groups.addMember(managingGroup.id, memberEmail.trim())
      setManagingGroup(updated)
      setMemberEmail('')
      loadGroups()
    } catch (e: any) {
      setGroupError(e.message ?? 'Could not add member')
    } finally {
      setGroupBusy(false)
    }
  }

  async function removeMember(userId: string) {
    if (!managingGroup) return
    setGroupBusy(true)
    setGroupError(null)
    try {
      await api.groups.removeMember(managingGroup.id, userId)
      if (userId === user?.id) {
        setManagingGroup(null)
      } else {
        setManagingGroup({ ...managingGroup, members: managingGroup.members.filter(m => m.user_id !== userId) })
      }
      loadGroups()
    } catch (e: any) {
      setGroupError(e.message ?? 'Could not remove member')
    } finally {
      setGroupBusy(false)
    }
  }

  async function deleteGroup() {
    if (!managingGroup) return
    setGroupBusy(true)
    setGroupError(null)
    try {
      await api.groups.remove(managingGroup.id)
      setManagingGroup(null)
      loadGroups()
    } catch (e: any) {
      setGroupError(e.message ?? 'Could not delete group')
      setGroupBusy(false)
    }
  }

  useEffect(() => {
    if (!PUSH_SUPPORTED) { setDeviceSubscribed(false); return }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setDeviceSubscribed(!!sub))
      .catch(() => setDeviceSubscribed(false))
  }, [])

  async function enableOnThisDevice() {
    setNotifBusy(true)
    setNotifError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setNotifError('Notifications were blocked in the browser')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const { public_key } = await api.push.getVapidPublicKey()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key).buffer as ArrayBuffer,
      })
      const json = sub.toJSON()
      await api.push.subscribe({ endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } })
      if (!user?.notifications_enabled) await updateProfile({ notifications_enabled: true })
      setDeviceSubscribed(true)
    } catch (e: any) {
      setNotifError(e.message ?? 'Could not enable notifications')
    } finally {
      setNotifBusy(false)
    }
  }

  async function toggleNotifications(enabled: boolean) {
    setNotifBusy(true)
    setNotifError(null)
    try {
      if (enabled) {
        await enableOnThisDevice()
      } else {
        await updateProfile({ notifications_enabled: false })
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        await sub?.unsubscribe().catch(() => {})
        setDeviceSubscribed(false)
      }
    } catch (e: any) {
      setNotifError(e.message ?? 'Could not update notification settings')
    } finally {
      setNotifBusy(false)
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

  async function pickDateFormat(f: DateFormat) {
    setSavingDateFormat(true)
    try { await setDateFormat(f) } finally { setSavingDateFormat(false) }
  }

  async function pickUnitSystem(u: UnitSystem) {
    setSavingUnitSystem(true)
    try { await setUnitSystem(u) } finally { setSavingUnitSystem(false) }
  }

  async function pickDefaultTank(id: string | null) {
    setSavingDefaultTank(true)
    try { await setDefaultTank(id) } finally { setSavingDefaultTank(false) }
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <UserCircle size={20} />Profile
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-2)' }}>
        Your own preferences — these apply only to {user?.display_name || user?.email}, not the rest of this instance.
      </p>

      <Card style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, padding: 24 }}>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14} color="var(--text-2)" />Date Format</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Controls how dates are displayed across tanks, parameters, and the maintenance schedule.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: savingDateFormat ? 0.6 : 1 }}>
            {FORMAT_OPTIONS.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: dateFormat === opt.value ? '1px solid var(--blue-border)' : '0.5px solid var(--border)',
                  background: dateFormat === opt.value ? 'var(--blue-bg)' : 'transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="dateFormat"
                    checked={dateFormat === opt.value}
                    disabled={savingDateFormat}
                    onChange={() => pickDateFormat(opt.value)}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: savingUnitSystem ? 0.6 : 1 }}>
            {UNIT_OPTIONS.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: unitSystem === opt.value ? '1px solid var(--blue-border)' : '0.5px solid var(--border)',
                  background: unitSystem === opt.value ? 'var(--blue-bg)' : 'transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="unitSystem"
                    checked={unitSystem === opt.value}
                    disabled={savingUnitSystem}
                    onChange={() => pickUnitSystem(opt.value)}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{opt.label}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>{opt.example}</span>
              </label>
            ))}
          </div>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Droplets size={14} color="var(--text-2)" />Default Tank</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Pre-selects this tank on pages with a tank dropdown, like the Livestock Journal.
          </p>
          <select
            value={defaultTank ?? ''}
            disabled={savingDefaultTank}
            onChange={e => pickDefaultTank(e.target.value || null)}
            style={{ width: '100%', boxSizing: 'border-box', opacity: savingDefaultTank ? 0.6 : 1 }}
          >
            <option value="">No default</option>
            {tanks?.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={14} color="var(--text-2)" />Password</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Change the password you use to sign in to this account.
          </p>
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
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} color="var(--text-2)" />Groups</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            A group is a household — a tank, expense, inventory item, room, or tap water reading assigned to a group is shared with every member. You can belong to more than one.
          </p>

          {loadingGroups ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {groups.length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>You're not in any groups yet.</p>
              )}
              {groups.map(g => (
                <div
                  key={g.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 8, border: '0.5px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {g.name}
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {g.my_role === 'owner' ? 'Owner' : 'Member'} · {g.members.length} {g.members.length === 1 ? 'member' : 'members'}
                    </span>
                  </span>
                  <button
                    onClick={() => openManage(g)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8,
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)',
                    }}
                  >
                    {g.my_role === 'owner' ? <Pencil size={12} /> : <LogOut size={12} />}
                    {g.my_role === 'owner' ? 'Manage' : 'View'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="e.g. Our House"
              onKeyDown={e => e.key === 'Enter' && createGroup()}
              style={{ flex: 1, boxSizing: 'border-box' }}
            />
            <button
              onClick={createGroup}
              disabled={!newGroupName.trim() || creatingGroup}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: newGroupName.trim() ? 'pointer' : 'default',
                border: '0.5px solid var(--blue-border)',
                background: newGroupName.trim() ? 'var(--blue-bg)' : 'var(--surface-2)',
                color: newGroupName.trim() ? 'var(--blue)' : 'var(--text-3)',
              }}
            >
              <Plus size={13} />New Group
            </button>
          </div>
        </section>

        <section>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={14} color="var(--text-2)" />Notifications</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Get a browser push notification when a maintenance task becomes due.
          </p>
          {!PUSH_SUPPORTED ? (
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
              Push notifications require this site to be served over HTTPS — unavailable in this browser/connection.
            </p>
          ) : (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-label)' }}>
                <input
                  type="checkbox"
                  checked={!!user?.notifications_enabled}
                  disabled={notifBusy}
                  onChange={e => toggleNotifications(e.target.checked)}
                />
                Send me a push notification for due maintenance tasks
              </label>
              {user?.notifications_enabled && deviceSubscribed === false && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Not enabled on this device/browser yet.</span>
                  <button
                    onClick={enableOnThisDevice}
                    disabled={notifBusy}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      cursor: notifBusy ? 'default' : 'pointer',
                      border: '0.5px solid var(--blue-border)',
                      background: 'var(--blue-bg)', color: 'var(--blue)',
                    }}
                  >
                    Enable on this device
                  </button>
                </div>
              )}
              {notifError && <p style={{ fontSize: 12, color: 'var(--red)', margin: '10px 0 0' }}>{notifError}</p>}
            </>
          )}
        </section>

      </Card>

      {managingGroup && (
        <Modal title={managingGroup.name} onClose={() => setManagingGroup(null)} width={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {managingGroup.my_role === 'owner' && (
              <div>
                <FieldLabel>Group name</FieldLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={groupNameDraft}
                    onChange={e => setGroupNameDraft(e.target.value)}
                    style={{ flex: 1, boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={saveGroupName}
                    disabled={groupBusy || !groupNameDraft.trim() || groupNameDraft === managingGroup.name}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                      cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div>
              <FieldLabel>Members</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {managingGroup.members.map(m => (
                  <div
                    key={m.user_id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>
                      {m.display_name || m.email}
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-3)' }}>
                        {m.role === 'owner' ? 'Owner' : 'Member'}
                      </span>
                    </span>
                    {(managingGroup.my_role === 'owner' && m.role !== 'owner') || m.user_id === user?.id ? (
                      <button
                        onClick={() => removeMember(m.user_id)}
                        disabled={groupBusy}
                        title={m.user_id === user?.id ? 'Leave group' : 'Remove member'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
                      >
                        {m.user_id === user?.id ? <LogOut size={14} /> : <Trash2 size={14} />}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {managingGroup.my_role === 'owner' && (
              <div>
                <FieldLabel>Add member by email</FieldLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={memberEmail}
                    onChange={e => setMemberEmail(e.target.value)}
                    placeholder="someone@example.com"
                    onKeyDown={e => e.key === 'Enter' && addMember()}
                    style={{ flex: 1, boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={addMember}
                    disabled={groupBusy || !memberEmail.trim()}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {groupError && <p style={{ margin: 0, fontSize: 12, color: 'var(--red)' }}>{groupError}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              {managingGroup.my_role === 'owner' ? (
                <button
                  onClick={deleteGroup}
                  disabled={groupBusy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    border: '0.5px solid var(--red-border)', background: 'var(--red-bg)', color: 'var(--red)',
                  }}
                >
                  <X size={13} />Delete Group
                </button>
              ) : <span />}
              <button
                onClick={() => setManagingGroup(null)}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 13,
                  border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
