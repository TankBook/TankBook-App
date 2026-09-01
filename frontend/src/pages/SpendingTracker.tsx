import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Trash2, Plus, X, Pencil } from 'lucide-react'
import { api, Expense } from '../api/client'
import { useTanks } from '../hooks'
import { useSettings, formatDate } from '../context/SettingsContext'
import { Card, FieldLabel, SectionTitle, Tag, RichTextarea, renderNotes, Dropdown } from '../components/ui'

const CATEGORIES = [
  'Equipment', 'Tanks', 'Livestock', 'Plants', 'Food', 'Chemicals',
  'Medication', 'Decor', 'Subscription', 'Other',
]

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Equipment:    { bg: 'var(--blue-bg)',   color: 'var(--blue)'   },
  Tanks:        { bg: 'var(--teal-bg, #e0f2f1)', color: 'var(--teal, #00897b)' },
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

function lineTotal(e: Expense) {
  return e.amount * (e.quantity || 1)
}

function localDateStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function DateInput({ value, onChange, dateFormat }: {
  value: string
  onChange: (v: string) => void
  dateFormat: string
}) {
  // Local state avoids the padded-value feedback loop:
  // emit("2026","06","1") would produce "2026-06-01" which re-parses as pd="01"
  // (maxLength=2, already full) — blocking the second digit.
  // By keeping local state we display raw digits while emitting padded values upward.
  const init = value.split('-')
  const [ly, setLy] = React.useState(init[0] ?? '')
  const [lm, setLm] = React.useState(init[1] ?? '')
  const [ld, setLd] = React.useState(init[2] ?? '')

  const dayRef   = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef  = useRef<HTMLInputElement>(null)

  const order: React.RefObject<HTMLInputElement>[] =
    dateFormat === 'MM/DD/YYYY' ? [monthRef, dayRef, yearRef] :
    dateFormat === 'YYYY-MM-DD' ? [yearRef, monthRef, dayRef] :
    [dayRef, monthRef, yearRef]

  function advance(ref: React.RefObject<HTMLInputElement>) {
    const idx = order.indexOf(ref)
    if (idx < order.length - 1) {
      order[idx + 1].current?.focus()
      order[idx + 1].current?.select()
    }
  }

  function emit(y: string, mo: string, d: string) {
    onChange(`${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`)
  }

  const cell: React.CSSProperties = {
    border: 'none', background: 'transparent', color: 'var(--text)',
    fontSize: 13, outline: 'none', textAlign: 'center', padding: 0, fontFamily: 'inherit',
  }

  function seg(
    ref: React.RefObject<HTMLInputElement>,
    val: string, placeholder: string, w: number, maxLen: number,
    setVal: (v: string) => void,
    emitWith: (v: string) => void,
  ) {
    return (
      <input
        ref={ref}
        type="text" inputMode="numeric" maxLength={maxLen}
        value={val} placeholder={placeholder}
        onFocus={e => e.target.select()}
        onChange={e => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, maxLen)
          setVal(digits)
          emitWith(digits)
          if (digits.length === maxLen) advance(ref)
        }}
        onKeyDown={e => {
          if (e.key === 'Backspace' && val === '') {
            const idx = order.indexOf(ref)
            if (idx > 0) order[idx - 1].current?.focus()
          }
        }}
        style={{ ...cell, width: w }}
      />
    )
  }

  const sep = (c: string) => <span style={{ color: 'var(--text-3)', userSelect: 'none', padding: '0 2px' }}>{c}</span>
  const dS = seg(dayRef,   ld, 'DD',   28, 2, setLd, v => emit(ly, lm, v))
  const mS = seg(monthRef, lm, 'MM',   28, 2, setLm, v => emit(ly, v,  ld))
  const yS = seg(yearRef,  ly, 'YYYY', 44, 4, setLy, v => emit(v,  lm, ld))

  let els: React.ReactElement
  if (dateFormat === 'MM/DD/YYYY')      els = <>{mS}{sep('/')}{dS}{sep('/')}{yS}</>
  else if (dateFormat === 'YYYY-MM-DD') els = <>{yS}{sep('-')}{mS}{sep('-')}{dS}</>
  else                                  els = <>{dS}{sep('/')}{mS}{sep('/')}{yS}</>

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      border: '0.5px solid var(--btn-border)', borderRadius: 8,
      padding: '6px 12px', background: 'var(--surface)', gap: 1,
    }}>
      {els}
    </div>
  )
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
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [formTank, setFormTank] = useState<string>('')
  const [formAmount, setFormAmount] = useState('')
  const [formQuantity, setFormQuantity] = useState('1')
  const [formCat, setFormCat] = useState(CATEGORIES[0])
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState(localDateStr())
  const [formNotes, setFormNotes] = useState('')

  function resetForm() {
    setFormTank(''); setFormAmount(''); setFormQuantity('1'); setFormCat(CATEGORIES[0])
    setFormDesc(''); setFormDate(localDateStr()); setFormNotes('')
  }

  function openEdit(e: Expense) {
    setEditingId(e.id)
    setFormTank(e.tank_id ?? '')
    setFormAmount(String(e.amount))
    setFormQuantity(String(e.quantity ?? 1))
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
      quantity: Number(formQuantity) || 1,
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
      quantity: Number(formQuantity) || 1,
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

  const totalAll = expenses.reduce((s, e) => s + lineTotal(e), 0)
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const totalMonth = expenses.filter(e => monthKey(e.purchase_date) === thisMonthKey).reduce((s, e) => s + lineTotal(e), 0)
  const thisYear = now.getFullYear()
  const totalYear = expenses.filter(e => e.purchase_date.startsWith(String(thisYear))).reduce((s, e) => s + lineTotal(e), 0)

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + lineTotal(e), 0),
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
            <FieldLabel>Amount (£ per item)</FieldLabel>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={formAmount} onChange={e => setFormAmount(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <FieldLabel>Quantity</FieldLabel>
            <input type="number" min="1" step="1" placeholder="1" value={formQuantity} onChange={e => setFormQuantity(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {Number(formAmount) > 0 && Number(formQuantity) > 1 && !isNaN(Number(formAmount)) && (
          <p style={{ margin: '-6px 0 12px', fontSize: 12, color: 'var(--text-2)' }}>
            Total: <strong style={{ color: 'var(--text)' }}>{fmt(Number(formAmount) * Number(formQuantity))}</strong>
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <FieldLabel>Date</FieldLabel>
            <DateInput key={editingId ?? 'new'} value={formDate} onChange={setFormDate} dateFormat={dateFormat} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select value={formCat} onChange={e => setFormCat(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Tank (Optional)</FieldLabel>
          <select value={formTank} onChange={e => setFormTank(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
            <option value="">General / No Tank</option>
            {tanks?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Description</FieldLabel>
          <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. Fluval 307 canister filter" style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Notes (Optional)</FieldLabel>
          <RichTextarea value={formNotes} onChange={setFormNotes} rows={2} placeholder="Notes…" />
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
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

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: isMobile ? 'stretch' : 'flex-start' }}>
        {/* Main list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Dropdown
              style={{ flex: 1 }}
              value={filterTank}
              onChange={setFilterTank}
              options={[
                { value: 'all', label: 'All Tanks' },
                { value: 'none', label: 'General' },
                ...(tanks ?? []).map(t => ({ value: t.id, label: t.name })),
              ]}
            />
            <Dropdown
              style={{ flex: 1 }}
              value={filterCat}
              onChange={setFilterCat}
              options={[
                { value: 'all', label: 'All Categories' },
                ...CATEGORIES.map(c => ({ value: c, label: c })),
              ]}
            />
          </div>

          {filtered.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No expenses recorded yet.</p>
          )}

          {groupedByMonth.map(([mk, items]) => (
            <div key={mk} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{monthLabel(mk)}</p>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmt(items.reduce((s, e) => s + lineTotal(e), 0))}</span>
              </div>
              <Card>
                {items.map((e, i) => {
                  const cc = CAT_COLORS[e.category] ?? CAT_COLORS.Other
                  const tankName = tanks?.find(t => t.id === e.tank_id)?.name
                  const rowBorder = i < items.length - 1 ? '0.5px solid var(--border-sub)' : 'none'

                  if (isMobile) {
                    return (
                      <div key={e.id} style={{ padding: '10px 0', borderBottom: rowBorder }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', minWidth: 0 }}>
                            {e.description || e.category}
                            {tankName && <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>({tankName})</span>}
                          </span>
                          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{fmt(lineTotal(e))}</span>
                            {e.quantity > 1 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{fmt(e.amount)} × {e.quantity}</span>}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <Tag bg={cc.bg} color={cc.color}>{e.category}</Tag>
                            {e.quantity > 1 && <Tag bg="var(--tag-bg)" color="var(--text-2)">×{e.quantity}</Tag>}
                            <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{formatDate(e.purchase_date, dateFormat)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                            <button onClick={() => openEdit(e)} style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><Pencil size={13} /></button>
                            <button onClick={() => setConfirmDeleteId(e.id)} style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {e.notes && (
                          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-2)' }} dangerouslySetInnerHTML={{ __html: renderNotes(e.notes) }} />
                        )}
                      </div>
                    )
                  }

                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '10px 0', borderBottom: rowBorder }}>
                      {/* Details */}
                      <div style={{ flexShrink: 0, minWidth: 160 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                          {e.description || e.category}
                          {tankName && <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>({tankName})</span>}
                        </span>
                        <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Tag bg={cc.bg} color={cc.color}>{e.category}</Tag>
                          {e.quantity > 1 && <Tag bg="var(--tag-bg)" color="var(--text-2)">×{e.quantity}</Tag>}
                        </div>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                          {formatDate(e.purchase_date, dateFormat)}
                        </span>
                      </div>
                      {/* Notes */}
                      {e.notes
                        ? <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--text-2)', paddingTop: 1, overflowWrap: 'break-word' }} dangerouslySetInnerHTML={{ __html: renderNotes(e.notes) }} />
                        : <div style={{ flex: 1 }} />
                      }
                      {/* Amount + actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{fmt(lineTotal(e))}</span>
                          {e.quantity > 1 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{fmt(e.amount)} × {e.quantity}</span>}
                        </span>
                        <button onClick={() => openEdit(e)} style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><Pencil size={13} /></button>
                        <button onClick={() => setConfirmDeleteId(e.id)} style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}><Trash2 size={13} /></button>
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
          <div style={{ width: isMobile ? '100%' : 220, flexShrink: 0 }}>
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

      {confirmDeleteId && (() => {
        const target = expenses.find(e => e.id === confirmDeleteId)
        return (
          <div
            onMouseDown={() => setConfirmDeleteId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <div onMouseDown={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '0.5px solid var(--red-border)', borderRadius: 14, padding: '1.5rem', width: 360, maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }}>
              <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: 'var(--red)' }}>Delete expense?</p>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-2)' }}>
                {target ? `"${target.description || target.category}" — ${fmt(lineTotal(target))}` : 'This expense'} will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => { await api.spending.remove(confirmDeleteId); setConfirmDeleteId(null); reload() }}
                  style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--red-border)', background: 'var(--red-bg)', color: 'var(--red)', fontWeight: 600 }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
