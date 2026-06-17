import { useState, useEffect } from 'react'
import { NotebookPen, Trash2, Plus, Pencil } from 'lucide-react'
import { Tag, Card, FieldLabel, Modal, RichTextarea, renderNotes } from '../components/ui'
import { api, JournalEntry, Tank, TankFish } from '../api/client'
import { useSettings, formatDate } from '../context/SettingsContext'

const EVENT_TYPES = [
  // Tank events
  'water_change', 'water_treatment', 'equipment', 'maintenance', 'plant', 'feeding',
  // Livestock events
  'observation', 'illness', 'treatment', 'recovery', 'birth', 'death', 'behaviour',
  // General
  'other',
]

const EVENT_LABELS: Record<string, string> = {
  water_change:     'Water Change',
  water_treatment:  'Water Treatment',
  equipment:        'Equipment',
  maintenance:      'Maintenance',
  plant:            'Plant',
  feeding:          'Feeding',
  observation:      'Observation',
  illness:          'Illness',
  treatment:        'Treatment',
  recovery:         'Recovery',
  birth:            'Birth',
  death:            'Death',
  behaviour:        'Behaviour',
  other:            'Other',
}

const EVENT_STYLE: Record<string, { bg: string; color: string }> = {
  water_change:     { bg: 'var(--cyan-bg)',              color: 'var(--cyan)'              },
  water_treatment:  { bg: 'var(--violet-bg, #ede9fe)',   color: 'var(--violet, #7c3aed)'   },
  equipment:        { bg: 'var(--amber-bg)',              color: 'var(--amber)'             },
  maintenance:      { bg: 'var(--blue-bg)',               color: 'var(--blue)'              },
  plant:            { bg: 'var(--green-bg)',              color: 'var(--green)'             },
  feeding:          { bg: 'var(--orange-bg, #fff4e6)',   color: 'var(--orange, #c27216)'   },
  observation:      { bg: 'var(--blue-bg)',               color: 'var(--blue)'              },
  illness:          { bg: 'var(--red-bg)',                color: 'var(--red)'               },
  treatment:        { bg: 'var(--amber-bg)',              color: 'var(--amber)'             },
  recovery:         { bg: 'var(--green-bg)',              color: 'var(--green)'             },
  birth:            { bg: 'var(--green-bg)',              color: 'var(--green)'             },
  death:            { bg: 'var(--tag-bg)',                color: 'var(--text-2)'            },
  behaviour:        { bg: 'var(--blue-bg)',               color: 'var(--blue)'              },
  other:            { bg: 'var(--tag-bg)',                color: 'var(--text-2)'            },
}

function EventBadge({ type }: { type: string }) {
  const s = EVENT_STYLE[type] ?? EVENT_STYLE.other
  return <Tag bg={s.bg} color={s.color}>{EVENT_LABELS[type] ?? type}</Tag>
}

function DateTimeInput({ value, onChange, dateFormat }: {
  value: string
  onChange: (v: string) => void
  dateFormat: string
}) {
  const datePart = value.slice(0, 10)
  const timePart = value.slice(11, 16) || '00:00'
  const [py = '', pm = '', pd = ''] = datePart.split('-')
  const [ph = '00', pmi = '00'] = timePart.split(':')

  function emit(y: string, mo: string, d: string, h: string, mi: string) {
    onChange(`${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${mi.padStart(2, '0')}`)
  }

  const cell: React.CSSProperties = {
    border: 'none', background: 'transparent', color: 'var(--text)',
    fontSize: 13, outline: 'none', textAlign: 'center', padding: 0, fontFamily: 'inherit',
  }
  const box: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    border: '0.5px solid var(--btn-border)', borderRadius: 8,
    padding: '5px 10px', background: 'var(--surface)', gap: 1,
  }
  const sep = (c: string) => <span style={{ color: 'var(--text-3)', userSelect: 'none', padding: '0 1px' }}>{c}</span>

  function seg(val: string, placeholder: string, w: number, maxLen: number, onCh: (s: string) => void) {
    return (
      <input
        type="text" inputMode="numeric" maxLength={maxLen}
        value={val}
        placeholder={placeholder}
        onChange={e => onCh(e.target.value.replace(/\D/g, '').slice(0, maxLen))}
        style={{ ...cell, width: w }}
      />
    )
  }

  const dS = seg(pd,  'DD',   24, 2, v => emit(py, pm, v,  ph,  pmi))
  const mS = seg(pm,  'MM',   24, 2, v => emit(py, v,  pd, ph,  pmi))
  const yS = seg(py,  'YYYY', 40, 4, v => emit(v,  pm, pd, ph,  pmi))
  const hS = seg(ph,  'hh',   22, 2, v => emit(py, pm, pd, v,   pmi))
  const iS = seg(pmi, 'mm',   22, 2, v => emit(py, pm, pd, ph,  v))

  let dateEl: React.ReactElement
  if (dateFormat === 'MM/DD/YYYY')      dateEl = <>{mS}{sep('/')}{dS}{sep('/')}{yS}</>
  else if (dateFormat === 'YYYY-MM-DD') dateEl = <>{yS}{sep('-')}{mS}{sep('-')}{dS}</>
  else                                  dateEl = <>{dS}{sep('/')}{mS}{sep('/')}{yS}</>

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <div style={box}>{dateEl}</div>
      <div style={box}>{hS}{sep(':')}{iS}</div>
    </div>
  )
}

// Shared form fields used by both Add modal and inline Edit
function EntryFormFields({
  form,
  setForm,
  fishList,
}: {
  form: { tank_fish_id: string; event_type: string; notes: string; occurred_at: string }
  setForm: (updater: (f: typeof form) => typeof form) => void
  fishList: TankFish[]
}) {
  const { dateFormat } = useSettings()

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <FieldLabel>Event Type</FieldLabel>
          <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} style={{ width: '100%' }}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_LABELS[t] ?? t}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Date &amp; Time</FieldLabel>
          <DateTimeInput
            value={form.occurred_at}
            onChange={v => setForm(f => ({ ...f, occurred_at: v }))}
            dateFormat={dateFormat}
          />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <FieldLabel>Species (Optional)</FieldLabel>
        <select value={form.tank_fish_id} onChange={e => setForm(f => ({ ...f, tank_fish_id: e.target.value }))} style={{ width: '100%' }}>
          <option value="">— tank-wide entry —</option>
          {fishList.map(f => (
            <option key={f.id} value={f.id}>{f.common_name ?? f.species_slug} ×{f.quantity}</option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Notes</FieldLabel>
        <RichTextarea
          value={form.notes}
          onChange={v => setForm(f => ({ ...f, notes: v }))}
          rows={4}
          placeholder="Describe what happened…"
        />
      </div>
    </>
  )
}

function localNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function LivestockJournal() {
  const { dateFormat, defaultTank } = useSettings()
  const [tanks, setTanks] = useState<Tank[]>([])
  const [selectedTank, setSelectedTank] = useState<string>('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [fishList, setFishList] = useState<TankFish[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  // Add modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    tank_fish_id: '',
    event_type: 'observation',
    notes: '',
    occurred_at: localNow(),
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ tank_fish_id: '', event_type: 'observation', notes: '', occurred_at: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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

  function openModal() {
    setForm({ tank_fish_id: '', event_type: 'observation', notes: '', occurred_at: localNow() })
    setSaveError(null)
    setShowModal(true)
  }

  async function handleAdd() {
    if (!selectedTank || !form.notes.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const entry = await api.journal.add(selectedTank, {
        tank_fish_id: form.tank_fish_id || null,
        event_type: form.event_type,
        notes: form.notes.trim(),
        occurred_at: form.occurred_at,
      })
      setEntries(prev => [entry, ...prev])
      setShowModal(false)
    } catch (e: any) {
      setSaveError(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id)
    setEditForm({
      tank_fish_id: entry.tank_fish_id ?? '',
      event_type: entry.event_type,
      notes: entry.notes,
      occurred_at: entry.occurred_at.slice(0, 16),
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
        occurred_at: editForm.occurred_at,
      })
      setEntries(prev => prev.map(e => e.id === entry.id ? updated : e))
      setEditingId(null)
    } catch (e: any) {
      setEditError(e.message ?? 'Save failed')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(entry: JournalEntry) {
    await api.journal.delete(selectedTank, entry.id)
    setEntries(prev => prev.filter(e => e.id !== entry.id))
  }

  const visible = filterType === 'all' ? entries : entries.filter(e => e.event_type === filterType)
  const tankName = tanks.find(t => t.id === selectedTank)?.name ?? ''

  // Filter buttons: all + each type, laid out in a full-width grid (2 rows)
  const allFilters = ['all', ...EVENT_TYPES]
  const cols = Math.ceil(allFilters.length / 2)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Tank Journal</h1>
        {selectedTank && (
          <button
            onClick={openModal}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
              border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />Add Entry
          </button>
        )}
      </div>

      {/* Tank selector */}
      <Card style={{ marginBottom: 20 }}>
        <FieldLabel>Select Tank</FieldLabel>
        <select
          value={selectedTank}
          onChange={e => { setSelectedTank(e.target.value); setFilterType('all') }}
          style={{ width: '100%' }}
        >
          <option value="">— choose a tank —</option>
          {tanks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Card>

      {/* Filter bar — equal-width grid, two rows, category colours */}
      {selectedTank && entries.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 4,
          marginBottom: 16,
        }}>
          {allFilters.map(type => {
            const active = filterType === type
            const s = type === 'all' ? null : (EVENT_STYLE[type] ?? null)
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  fontSize: 11, padding: '5px 4px', borderRadius: 6, cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                  textAlign: 'center',
                  border: active
                    ? `1px solid ${s ? s.color : 'var(--blue)'}`
                    : '0.5px solid var(--border)',
                  background: active
                    ? (s ? s.bg : 'var(--blue-bg)')
                    : 'transparent',
                  color: s ? s.color : (active ? 'var(--blue)' : 'var(--text-2)'),
                }}
              >
                {type === 'all' ? 'All' : (EVENT_LABELS[type] ?? type)}
              </button>
            )
          })}
        </div>
      )}

      {/* Entry list */}
      {!selectedTank && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <NotebookPen size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 14, margin: 0 }}>Select a tank to view its journal.</p>
        </div>
      )}

      {selectedTank && loading && <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading entries…</p>}

      {selectedTank && !loading && visible.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          {entries.length === 0 ? 'No journal entries yet. Use Add entry to get started.' : 'No entries match this filter.'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(entry => (
          <div
            key={entry.id}
            style={{
              background: 'var(--surface)',
              border: `0.5px solid ${editingId === entry.id ? 'var(--blue-border)' : 'var(--border)'}`,
              borderRadius: 12, padding: '12px 16px',
            }}
          >
            {editingId === entry.id ? (
              <div>
                <EntryFormFields form={editForm} setForm={setEditForm} fishList={fishList} />
                {editError && <p style={{ fontSize: 12, color: 'var(--red)', margin: '10px 0 0' }}>{editError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleEdit(entry)}
                    disabled={!editForm.notes.trim() || editSaving}
                    style={{
                      fontSize: 12, padding: '6px 16px', borderRadius: 8, fontWeight: 500,
                      border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                      cursor: editForm.notes.trim() && !editSaving ? 'pointer' : 'not-allowed',
                      opacity: editForm.notes.trim() && !editSaving ? 1 : 0.45,
                    }}
                  >{editSaving ? 'Saving…' : 'Save Changes'}</button>
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
                  <div style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: renderNotes(entry.notes) }} />
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

      {/* Add entry modal */}
      {showModal && (
        <Modal title={`New Entry — ${tankName}`} onClose={() => setShowModal(false)}>
          <EntryFormFields form={form} setForm={setForm} fishList={fishList} />
          {saveError && <p style={{ fontSize: 13, color: 'var(--red)', margin: '10px 0 0' }}>{saveError}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={handleAdd}
              disabled={!form.notes.trim() || saving}
              style={{
                fontSize: 13, padding: '7px 20px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                cursor: form.notes.trim() && !saving ? 'pointer' : 'not-allowed',
                opacity: form.notes.trim() && !saving ? 1 : 0.45,
              }}
            >{saving ? 'Saving…' : 'Save Entry'}</button>
            <button
              onClick={() => setShowModal(false)}
              style={{ fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
            >Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
