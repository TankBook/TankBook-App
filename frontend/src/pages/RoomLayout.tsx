import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building, Plus, Pencil, Trash2, ChevronRight, Columns } from 'lucide-react'
import { useRoomLayoutState } from '../hooks/useRoomLayout'
import { Card, FieldLabel, Modal } from '../components/ui'

export default function RoomLayout() {
  const navigate = useNavigate()
  const {
    loading, rooms,
    editingRoomId, editingRoomName, setEditingRoomName, startEditing, cancelEditing, saveRoomName,
    deleteRoom, addRoom,
  } = useRoomLayoutState()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftWidth, setDraftWidth] = useState('3')
  const [draftDepth, setDraftDepth] = useState('2.4')
  const [creating, setCreating] = useState(false)

  function openCreateModal() {
    setDraftName('')
    setDraftWidth('3')
    setDraftDepth('2.4')
    setShowCreateModal(true)
  }

  async function submitCreateRoom() {
    const trimmed = draftName.trim()
    if (!trimmed || creating) return
    setCreating(true)
    const id = await addRoom(trimmed, Number(draftWidth) || undefined, Number(draftDepth) || undefined)
    setCreating(false)
    setShowCreateModal(false)
    if (id) navigate(`/rooms/${id}`)
  }

  if (loading) {
    return <p>Loading tank layout…</p>
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Building size={20} />
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Fish Rooms</p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 13 }}>Organize your tanks by room, then open a room to lay out its tanks.</p>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={openCreateModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer' }}
          >
            <Plus size={16} />
            Create room
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        {rooms.length === 0 ? (
          <Card style={{ textAlign: 'center', color: 'var(--text-2)' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>No rooms defined yet.</p>
            <p style={{ margin: '10px 0 0' }}>Create a room above, then open it to assign and position tanks.</p>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {rooms.map(room => (
              <Card
                key={room.id}
                onClick={() => editingRoomId !== room.id && navigate(`/rooms/${room.id}`)}
                style={{ cursor: editingRoomId === room.id ? 'default' : 'pointer' }}
              >
                {editingRoomId === room.id ? (
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      autoFocus
                      value={editingRoomName}
                      onChange={e => setEditingRoomName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveRoomName()}
                      style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                    />
                    <button
                      type="button"
                      onClick={saveRoomName}
                      style={{ padding: '9px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer' }}
                    >Save</button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      style={{ padding: '9px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
                    >Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <Columns size={16} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</p>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 12 }}>{room.tankIds.length} tank{room.tankIds.length === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => startEditing(room)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
                      >
                        <Pencil size={14} /> Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRoom(room.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                    <ChevronRight size={18} color="var(--text-3)" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <Modal title="Create Room" onClose={() => setShowCreateModal(false)}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <FieldLabel>Room name</FieldLabel>
              <input
                autoFocus
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitCreateRoom()}
                placeholder="e.g. Fish room, Living room"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <FieldLabel>Width (m)</FieldLabel>
                <input
                  type="number" min="0.5" step="0.1"
                  value={draftWidth}
                  onChange={e => setDraftWidth(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FieldLabel>Depth (m)</FieldLabel>
                <input
                  type="number" min="0.5" step="0.1"
                  value={draftDepth}
                  onChange={e => setDraftDepth(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              style={{ fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitCreateRoom}
              disabled={!draftName.trim() || creating}
              style={{
                fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--blue-border)',
                background: draftName.trim() && !creating ? 'var(--blue)' : 'var(--surface-2)',
                color: draftName.trim() && !creating ? '#fff' : 'var(--text-3)',
                cursor: draftName.trim() && !creating ? 'pointer' : 'default',
              }}
            >
              {creating ? 'Creating…' : 'Create room'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
