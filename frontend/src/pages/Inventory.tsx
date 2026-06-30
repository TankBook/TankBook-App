import { useState } from 'react'
import { Plus, Pencil, Trash2, Minus, PackagePlus, AlertTriangle } from 'lucide-react'
import { api, InventoryItem } from '../api/client'
import { useInventory } from '../hooks'
import { Card, FieldLabel, SectionTitle, Tag, Modal, ConfirmDialog } from '../components/ui'

const CATEGORIES = ['Equipment', 'Plants', 'Food', 'Chemicals', 'Medication', 'Decor', 'Tanks', 'Other'] as const

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Equipment: { bg: 'var(--blue-bg)', color: 'var(--blue)' },
  Plants: { bg: 'var(--green-bg)', color: 'var(--green)' },
  Food: { bg: 'var(--amber-bg)', color: 'var(--amber)' },
  Chemicals: { bg: 'var(--violet-bg)', color: 'var(--violet)' },
  Medication: { bg: 'var(--red-bg)', color: 'var(--red)' },
  Decor: { bg: 'var(--orange-bg)', color: 'var(--orange)' },
  Tanks: { bg: 'var(--teal-bg, #e0f2f1)', color: 'var(--teal, #00897b)' },
  Other: { bg: 'var(--tag-bg)', color: 'var(--text-2)' },
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Inventory() {
  const { data: items, reload } = useInventory()

  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null)
  const [formName, setFormName] = useState('')
  const [formCat, setFormCat] = useState<InventoryItem['category']>('Food')
  const [formQty, setFormQty] = useState('1')
  const [formThreshold, setFormThreshold] = useState('1')
  const [formUnit, setFormUnit] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const [restocking, setRestocking] = useState<InventoryItem | null>(null)
  const [restockQty, setRestockQty] = useState('1')
  const [linkExpense, setLinkExpense] = useState(false)
  const [restockAmount, setRestockAmount] = useState('')
  const [restockDate, setRestockDate] = useState(todayIso)

  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)

  function openAdd() {
    setFormName(''); setFormCat('Food'); setFormQty('1'); setFormThreshold('1'); setFormUnit(''); setFormNotes('')
    setEditing('new')
  }

  function openEdit(item: InventoryItem) {
    setFormName(item.name); setFormCat(item.category); setFormThreshold(String(item.low_stock_threshold))
    setFormUnit(item.unit_label ?? ''); setFormNotes(item.notes ?? '')
    setEditing(item)
  }

  async function saveItem() {
    if (!formName) return
    if (editing === 'new') {
      await api.inventory.create({
        name: formName, category: formCat, quantity: Number(formQty) || 0,
        low_stock_threshold: Number(formThreshold) || 1, unit_label: formUnit || null, notes: formNotes || null,
      })
    } else if (editing) {
      await api.inventory.update(editing.id, {
        name: formName, category: formCat,
        low_stock_threshold: Number(formThreshold) || 1, unit_label: formUnit || null, notes: formNotes || null,
      })
    }
    setEditing(null)
    reload()
  }

  async function adjust(item: InventoryItem, delta: number) {
    await api.inventory.adjust(item.id, delta)
    reload()
  }

  function openRestock(item: InventoryItem) {
    setRestockQty('1'); setLinkExpense(false); setRestockAmount(''); setRestockDate(todayIso())
    setRestocking(item)
  }

  async function saveRestock() {
    if (!restocking || !restockQty || isNaN(Number(restockQty)) || Number(restockQty) <= 0) return
    await api.inventory.restock(restocking.id, {
      quantity: Number(restockQty),
      amount: linkExpense && restockAmount ? Number(restockAmount) : null,
      purchase_date: linkExpense ? restockDate : null,
    })
    setRestocking(null)
    reload()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await api.inventory.remove(deleteTarget.id)
    setDeleteTarget(null)
    reload()
  }

  const lowStock = (items ?? []).filter(i => i.quantity <= i.low_stock_threshold)

  function itemRow(item: InventoryItem) {
    const low = item.quantity <= item.low_stock_threshold
    return (
      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid var(--border-sub)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{item.name}</span>
          {low && (
            <Tag bg="var(--red-bg)" color="var(--red)" compact style={{ marginLeft: 8 }}>Low stock</Tag>
          )}
          {item.notes && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>{item.notes}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => adjust(item, -1)} disabled={item.quantity === 0} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: item.quantity === 0 ? 'default' : 'pointer', opacity: item.quantity === 0 ? 0.4 : 1 }}>
            <Minus size={12} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: low ? 'var(--red)' : 'var(--text)', minWidth: 56, textAlign: 'center' }}>
            {item.quantity}{item.unit_label ? ` ${item.unit_label}` : ''}
          </span>
          <button onClick={() => adjust(item, 1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>
            <Plus size={12} />
          </button>
        </div>

        <button onClick={() => openRestock(item)} title="Restock" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer', flexShrink: 0 }}>
          <PackagePlus size={12} />Restock
        </button>

        <button onClick={() => openEdit(item)} title="Edit" style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0 }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => setDeleteTarget(item)} title="Delete" style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', flexShrink: 0 }}>
          <Trash2 size={13} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Inventory</h1>
        <button
          onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', cursor: 'pointer', color: 'var(--blue)', fontWeight: 500 }}
        >
          <Plus size={14} />Add Item
        </button>
      </div>

      {lowStock.length > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>
            <strong>{lowStock.length} item{lowStock.length > 1 ? 's' : ''} low on stock:</strong> {lowStock.map(i => i.name).join(', ')}
          </p>
        </div>
      )}

      {CATEGORIES.map(cat => {
        const catItems = (items ?? []).filter(i => i.category === cat)
        return (
          <Card key={cat} style={{ marginBottom: 16 }}>
            <SectionTitle>
              <Tag bg={CAT_COLORS[cat].bg} color={CAT_COLORS[cat].color} style={{ marginRight: 8 }}>{cat}</Tag>
            </SectionTitle>
            {catItems.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No {cat.toLowerCase()} items yet.</p>}
            {catItems.map(itemRow)}
          </Card>
        )
      })}

      {editing && (
        <Modal title={editing === 'new' ? 'Add Item' : 'Edit Item'} onClose={() => setEditing(null)} width={420}>
          <div style={{ marginBottom: 12 }}>
            <FieldLabel>Name</FieldLabel>
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. API Stress Coat" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <FieldLabel>Category</FieldLabel>
              <select value={formCat} onChange={e => setFormCat(e.target.value as InventoryItem['category'])} style={{ width: '100%' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Unit Label (Optional)</FieldLabel>
              <input value={formUnit} onChange={e => setFormUnit(e.target.value)} placeholder="e.g. bottles, bags" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {editing === 'new' && (
              <div>
                <FieldLabel>Starting Quantity</FieldLabel>
                <input type="number" min="0" value={formQty} onChange={e => setFormQty(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            )}
            <div>
              <FieldLabel>Low Stock Threshold</FieldLabel>
              <input type="number" min="0" value={formThreshold} onChange={e => setFormThreshold(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>Notes (Optional)</FieldLabel>
            <input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="e.g. for fry tank only" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(null)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)' }}>Cancel</button>
            <button
              disabled={!formName}
              onClick={saveItem}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: formName ? 'pointer' : 'not-allowed', border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', opacity: formName ? 1 : 0.45 }}
            >{editing === 'new' ? 'Add Item' : 'Save Changes'}</button>
          </div>
        </Modal>
      )}

      {restocking && (
        <Modal title={`Restock — ${restocking.name}`} onClose={() => setRestocking(null)} width={400}>
          <div style={{ marginBottom: 12 }}>
            <FieldLabel>Quantity to Add</FieldLabel>
            <input type="number" min="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={linkExpense} onChange={e => setLinkExpense(e.target.checked)} />
            <span style={{ fontSize: 13, color: 'var(--text)' }}>Log this as an expense</span>
          </label>
          {linkExpense && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <FieldLabel>Amount (£)</FieldLabel>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={restockAmount} onChange={e => setRestockAmount(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <FieldLabel>Date</FieldLabel>
                <input type="date" value={restockDate} onChange={e => setRestockDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setRestocking(null)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)' }}>Cancel</button>
            <button
              disabled={!restockQty || isNaN(Number(restockQty)) || Number(restockQty) <= 0}
              onClick={saveRestock}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)' }}
            >Restock</button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Item"
          message={`Delete "${deleteTarget.name}" from inventory? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
