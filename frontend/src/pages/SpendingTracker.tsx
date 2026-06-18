import { useState, useMemo } from 'react'
import { Trash2, Plus, X, Pencil } from 'lucide-react'
import { api, Expense } from '../api/client'
import { useTanks } from '../hooks'
import { useSettings, formatDate } from '../context/SettingsContext'
import { Card, FieldLabel, SectionTitle, Tag } from '../components/ui'

const CATEGORIES = [
  'Equipment', 'Livestock', 'Plants', 'Food', 'Chemicals',
  'Medication', 'Decor', 'Subscription', 'Other',
]

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Equipment:    { bg: 'var(--blue-bg)',   color: 'var(--blue)'   },
  Livestock:    { bg: 'var(--cyan-bg)',   color: 'var(--cyan)'   },
  Plants:       { bg: 'var(--green-bg)',  color: 'var(--green)'  },
  Food:         { bg: 'var(--amber-bg)',  color: 'var(--amber)'  },
  Chemicals:    { bg: 'var(--violet-bg)', color: 'var(--violet)' },
  Medication:   { bg: 'var(--red-bg)',    color: 'var(--red)'    },
  Decor:        { bg: 'var(--orange-bg)', color: 'var(--orange)' },
  Subscription: { bg: 'var(--tag-bg)',    color: 'var(--text-2)' },
  Other:        { bg: 'var(--tag-bg)',    color: 'var(--text-2)' },
}

function fmt(n: number) {
  return `£${n.toFixed(2)}`
}

function localDateStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7)
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

export default function SpendingTracker() {
  const { data: tanks } = useTanks()
  const { dateFormat } = useSettings()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load once
  if (!loaded) {
    setLoaded(true)
    api.spending.list().then(setExpenses).catch(() => {})
  }

  const reload = () => api.spending.list().then(setExpenses)

  const [filterTank, setFilterTank] = useState<string>('all')
  const [filterCat, setFilterCat] = useState<string>('all')

  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formTank, setFormTank] = useState<string>('')
  const [formAmount, setFormAmount] = useState('')
  const [formCat, setFormCat] = useState(CATEGORIES[0])
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState(localDateStr())
  const [formNotes, setFormNotes] = useState('')

  function resetForm() {
    setFormTank(''); setFormAmount(''); setFormCat(CATEGORIES[0])
    setFormDesc(''); setFormDate(localDateStr()); setFormNotes('')
  }

  function openEdit(e: Expense) {
    setEditingId(e.id)
    setFormTank(e.tank_id ?? '')
    setFormAmount(String(e.amount))
    setFormCat(e.category)
    setFormDesc(e.description ?? '')
    setFormDate(e.purchase_date)
    setFormNotes(e.notes ?? '')
  }

  async function submitAdd() {
    if (!formAmount || isNaN(Number(formAmount))) return
    await api.spending.add({
      tank_id: formTank || null,
      amount: Number(formAmount),
      category: formCat,
      description: formDesc || null,
      purchase_date: formDate,
      notes: formNotes || null,
    })
    resetForm(); setShowAdd(false); reload()
  }

  async function submitEdit() {
    if (!editingId || !formAmount || isNaN(Number(formAmount))) return
    await api.spending.update(editingId, {
      tank_id: formTank || null,
      amount: Number(formAmount),
      category: formCat,
      description: formDesc || null,
      purchase_date: formDate,
      notes: formNotes || null,
    })
    setEditingId(null); resetForm(); reload()
  }

  const filtered = useMemo(() => expenses.filter(e => {
    if (filterTank !== 'all' && e.tank_id !== (filterTank === 'none' ? null : filterTank)) return false
    if (filterCat !== 'all' && e.category !== filterCat) return false
    return true
  }), [expenses, filterTank, filterCat])

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0)
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const totalMonth = expenses.filter(e => monthKey(e.purchase_date) === thisMonthKey).reduce((s, e) => s + e.amount, 0)
  const thisYear = now.getFullYear()
  const totalYear = expenses.filter(e => e.purchase_date.startsWith(String(thisYear))).reduce((s, e) => s + e.amount, 0)

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(r => r.total > 0).sort((a, b) => b.total - a.total)

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of filtered) {
      const k = monthKey(e.purchase_date)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const formModal = (isEdit: boolean) => (
    <div
      onMouseDown={() => { isEdit ? setEditingId(null) : setShowAdd(false); resetForm() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: 420, maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{isEdit ? 'Edit Expense' : 'Add Expense'}</p>
          <button onClick={() => { isEdit ? setEditingId(null) : setShowAdd(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', lineHeight: 0 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <FieldLabel>Amount (£)</FieldLabel>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={formAmount} onChange={e => setFormAmount(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select value={formCat} onChange={e => setFormCat(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Tank (Optional)</FieldLabel>
            <select value={formTank} onChange={e => setFormTank(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
              <option value="">General / No Tank</option>
              {tanks?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Description</FieldLabel>
          <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. Fluval 307 canister filter" style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Notes (Optional)</FieldLabel>
          <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => { isEdit ? setEditingId(null) : setShowAdd(false); resetForm() }} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)' }}>Cancel</button>
          <button
            disabled={!formAmount || isNaN(Number(formAmount))}
            onClick={isEdit ? submitEdit : submitAdd}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: formAmount ? 'pointer' : 'not-allowed', border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', opacity: formAmount ? 1 : 0.45 }}
          >{isEdit ? 'Save Changes' : 'Add Expense'}</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Spending</h1>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', cursor: 'pointer', color: 'var(--blue)', fontWeight: 500 }}
        >
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'All Time', value: totalAll },
          { label: `${now.toLocaleString('default', { month: 'long' })}`, value: totalMonth },
          { label: String(thisYear), value: totalYear },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Main list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={filterTank} onChange={e => setFilterTank(e.target.value)} style={{ fontSize: 13, borderRadius: 8, border: '0.5px solid var(--border)', padding: '5px 10px', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>
              <option value="all">All Tanks</option>
              <option value="none">General</option>
              {tanks?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ fontSize: 13, borderRadius: 8, border: '0.5px solid var(--border)', padding: '5px 10px', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {filtered.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No expenses recorded yet.</p>
          )}

          {groupedByMonth.map(([mk, items]) => (
            <div key={mk} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{monthLabel(mk)}</p>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmt(items.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
              <Card>
                {items.map((e, i) => {
                  const cc = CAT_COLORS[e.category] ?? CAT_COLORS.Other
                  const tankName = tanks?.find(t => t.id === e.tank_id)?.name
                  return (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < items.length - 1 ? '0.5px solid var(--border-sub)' : 'none' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                            {e.description || e.category}
                          </span>
                          <Tag bg={cc.bg} color={cc.color}>{e.category}</Tag>
                          {tankName && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{tankName}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(e.purchase_date, dateFormat)}</span>
                          {e.notes && <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{e.notes}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{fmt(e.amount)}</span>
                        <button onClick={() => openEdit(e)} style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><Pencil size={13} /></button>
                        <button onClick={async () => { await api.spending.remove(e.id); reload() }} style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  )
                })}
              </Card>
            </div>
          ))}
        </div>

        {/* Sidebar: category breakdown */}
        {byCategory.length > 0 && (
          <div style={{ width: 220, flexShrink: 0 }}>
            <Card>
              <SectionTitle>By Category</SectionTitle>
              {byCategory.map(({ cat, total }) => {
                const cc = CAT_COLORS[cat] ?? CAT_COLORS.Other
                const pct = totalAll > 0 ? (total / totalAll) * 100 : 0
                return (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Tag bg={cc.bg} color={cc.color}>{cat}</Tag>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{fmt(total)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-2)' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: cc.color, width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        )}
      </div>

      {showAdd && formModal(false)}
      {editingId && formModal(true)}
    </div>
  )
}
