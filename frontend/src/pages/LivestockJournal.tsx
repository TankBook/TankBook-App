import { useState, useEffect } from 'react'
import { NotebookPen, Trash2, Plus, Pencil } from 'lucide-react'
import { Tag, Card, FieldLabel, SectionTitle } from '../components/ui'
import { api, JournalEntry, Tank, TankFish } from '../api/client'
import { useSettings, formatDate } from '../context/SettingsContext'

const EVENT_TYPES = ['observation', 'illness', 'treatment', 'recovery', 'birth', 'death', 'behaviour', 'other']

const EVENT_STYLE: Record<string, { bg: string; color: string }> = {
  observation: { bg: 'var(--blue-bg)',   color: 'var(--blue)'   },
  illness:     { bg: 'var(--red-bg)',    color: 'var(--red)'    },
  treatment:   { bg: 'var(--amber-bg)', color: 'var(--amber)'  },
  recovery:    { bg: 'var(--green-bg)',  color: 'var(--green)'  },
  birth:       { bg: 'var(--green-bg)',  color: 'var(--green)'  },
  death:       { bg: 'var(--tag-bg)',    color: 'var(--text-2)' },
  behaviour:   { bg: 'var(--blue-bg)',   color: 'var(--blue)'   },
  other:       { bg: 'var(--tag-bg)',    color: 'var(--text-2)' },
}

function EventBadge({ type }: { type: string }) {
  const s = EVENT_STYLE[type] ?? EVENT_STYLE.other
  return <Tag bg={s.bg} color={s.color}>{type}</Tag>
}

export default function LivestockJournal() {
  const { dateFormat, defaultTank } = useSettings()
  const [tanks, setTanks] = useState<Tank[]>([])
  const [selectedTank, setSelectedTank] = useState<string>('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [fishList, setFishList] = useState<TankFish[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    tank_fish_id: '',
    event_type: 'observation',
    notes: '',
    occurred_at: new Date().toISOString().slice(0, 16),
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ tank_fish_id: '', event_type: 'observation', notes: '', occurred_at: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id)
    setEditForm({
      tank_fish_id: entry.tank_fish_id ?? '',
      event_type: entry.event_type,
      notes: entry.notes,
      occurred_at: new Date(entry.occurred_at).toISOString().slice(0, 16),
    })
    setEditError(null)
  }

  async function handleEdit(entry: JournalEntry) {
    if (!editForm.notes.trim()) return
    setEditSaving(true)
    setEditError(null)
    try {
      const updated = await api.journal.update(selectedTank, entry.id, {
        tank_fish_id: editForm.tank_fish_id || null,
        event_type: editForm.event_type,
        notes: editForm.notes.trim(),
        occurred_at: new Date(editForm.occurred_at).toISOString(),
      })
      setEntries(prev => prev.map(e => e.id === entry.id ? updated : e))
      setEditingId(null)
    } catch (e: any) {
      setEditError(e.message ?? 'Save failed')
    } finally {
      setEditSaving(false)
    }
  }

  useEffect(() => {
    api.tanks.list().then(list => {
      setTanks(list)
      if (list.length > 0) {
        const preferred = defaultTank && list.find(t => t.id === defaultTank)
        setSelectedTank(preferred ? preferred.id : list[0].id)
      }
    })
  }, [defaultTank])

  useEffect(() => {
    if (!selectedTank) { setEntries([]); setFishList([]); return }
    setLoading(true)
    Promise.all([
      api.journal.list(selectedTank),
      api.fish.list(selectedTank),
    ]).then(([j, f]) => {
      setEntries(j)
      setFishList(f)
    }).finally(() => setLoading(false))
  }, [selectedTank])

  async function handleAdd() {
    if (!selectedTank || !form.notes.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const entry = await api.journal.add(selectedTank, {
        tank_fish_id: form.tank_fish_id || null,
        event_type: form.event_type,
        notes: form.notes.trim(),
        occurred_at: new Date(form.occurred_at).toISOString(),
      })
      setEntries(prev => [entry, ...prev])
      setForm({ tank_fish_id: '', event_type: 'observation', notes: '', occurred_at: new Date().toISOString().slice(0, 16) })
      setShowForm(false)
    } catch (e: any) {
      setSaveError(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entry: JournalEntry) {
    await api.journal.delete(selectedTank, entry.id)
    setEntries(prev => prev.filter(e => e.id !== entry.id))
  }

  const visible = filterType === 'all' ? entries : entries.filter(e => e.event_type === filterType)

  const tankName = tanks.find(t => t.id === selectedTank)?.name ?? ''

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Livestock journal</h1>
        {selectedTank && (
          <button
            onClick={() => { setShowForm(v => !v); setSaveError(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--btn-border)', background: 'transparent', cursor: 'pointer', color: 'var(--text)' }}
          >
            {showForm ? 'Cancel' : <><Plus size={14} />Add entry</>}
          </button>
        )}
      </div>

      {/* Tank selector */}
      <Card style={{ marginBottom: 20 }}>
        <FieldLabel>Select tank</FieldLabel>
        <select
          value={selectedTank}
          onChange={e => { setSelectedTank(e.target.value); setShowForm(false); setFilterType('all') }}
          style={{ width: '100%' }}
        >
          <option value="">— choose a tank —</option>
          {tanks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Card>

      {/* Add entry form */}
      {showForm && selectedTank && (
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>New journal entry — {tankName}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <FieldLabel>Event type</FieldLabel>
              <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} style={{ width: '100%' }}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Date &amp; time</FieldLabel>
              <input
                type="datetime-local"
                value={form.occurred_at}
                onChange={e => setForm(f => ({ ...f, occurred_at: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <FieldLabel>Species (optional)</FieldLabel>
            <select value={form.tank_fish_id} onChange={e => setForm(f => ({ ...f, tank_fish_id: e.target.value }))} style={{ width: '100%' }}>
              <option value="">— tank-wide entry —</option>
              {fishList.map(f => (
                <option key={f.id} value={f.id}>
                  {f.common_name ?? f.species_slug} ×{f.quantity}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <FieldLabel>Notes</FieldLabel>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Describe what you observed…"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
          {saveError && (
            <p style={{ fontSize: 13, color: 'var(--red)', margin: '0 0 10px' }}>{saveError}</p>
          )}
          <button
            onClick={handleAdd}
            disabled={!form.notes.trim() || saving}
            style={{
              fontSize: 13, padding: '7px 20px', borderRadius: 8, fontWeight: 500,
              border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
              cursor: form.notes.trim() && !saving ? 'pointer' : 'not-allowed',
              opacity: form.notes.trim() && !saving ? 1 : 0.45,
            }}
          >
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </Card>
      )}

      {/* Filter bar */}
      {selectedTank && entries.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {['all', ...EVENT_TYPES].map(type => {
            const active = filterType === type
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                  border: active ? '0.5px solid var(--blue-border)' : '0.5px solid var(--btn-border)',
                  background: active ? 'var(--blue-bg)' : 'transparent',
                  color: active ? 'var(--blue)' : 'var(--text-2)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            )
          })}
        </div>
      )}

      {/* Entry list */}
      {!selectedTank && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <NotebookPen size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 14, margin: 0 }}>Select a tank to view its livestock journal.</p>
        </div>
      )}

      {selectedTank && loading && <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading entries…</p>}

      {selectedTank && !loading && visible.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          {entries.length === 0 ? 'No journal entries yet. Add the first one above.' : 'No entries match this filter.'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(entry => (
          <div
            key={entry.id}
            style={{
              background: 'var(--surface)', border: `0.5px solid ${editingId === entry.id ? 'var(--blue-border)' : 'var(--border)'}`,
              borderRadius: 12, padding: '12px 16px',
            }}
          >
            {editingId === entry.id ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <FieldLabel>Event type</FieldLabel>
                    <select value={editForm.event_type} onChange={e => setEditForm(f => ({ ...f, event_type: e.target.value }))} style={{ width: '100%' }}>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Date &amp; time</FieldLabel>
                    <input type="datetime-local" value={editForm.occurred_at} onChange={e => setEditForm(f => ({ ...f, occurred_at: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <FieldLabel>Species (optional)</FieldLabel>
                  <select value={editForm.tank_fish_id} onChange={e => setEditForm(f => ({ ...f, tank_fish_id: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">— tank-wide entry —</option>
                    {fishList.map(f => <option key={f.id} value={f.id}>{f.common_name ?? f.species_slug} ×{f.quantity}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <FieldLabel>Notes</FieldLabel>
                  <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                {editError && <p style={{ fontSize: 12, color: 'var(--red)', margin: '0 0 8px' }}>{editError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleEdit(entry)}
                    disabled={!editForm.notes.trim() || editSaving}
                    style={{
                      fontSize: 12, padding: '6px 16px', borderRadius: 8, fontWeight: 500,
                      border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                      cursor: editForm.notes.trim() && !editSaving ? 'pointer' : 'not-allowed',
                      opacity: editForm.notes.trim() && !editSaving ? 1 : 0.45,
                    }}
                  >{editSaving ? 'Saving…' : 'Save changes'}</button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <EventBadge type={entry.event_type} />
                    {entry.common_name && (
                      <Tag bg="var(--tag-bg)" color="var(--text-2)">{entry.common_name}</Tag>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {formatDate(entry.occurred_at, dateFormat)}
                      {' '}
                      {new Date(entry.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>{entry.notes}</p>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => startEdit(entry)}
                    title="Edit entry"
                    style={{ padding: '4px 6px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)' }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(entry)}
                    title="Delete entry"
                    style={{ padding: '4px 6px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
