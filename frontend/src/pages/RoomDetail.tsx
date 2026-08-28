import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, ExternalLink, Pencil, Trash2, X } from 'lucide-react'
import { useRoomLayoutState, defaultTankPosition } from '../hooks/useRoomLayout'
import { Card, FieldLabel, Tag } from '../components/ui'

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditingName, setIsEditingName] = useState(false)
  const {
    loading, rooms, tankLookup, unassignedTanks,
    editingRoomId, editingRoomName, setEditingRoomName, startEditing, cancelEditing, saveRoomName,
    deleteRoom, moveTankToRoom, updateRoomDimensions, commitRoomDimensions,
    moveTankOnMap, startTankMove, commitTankMove, movingTank,
    handleDragStart, handleDrop, draggingTargetRoomId, setDraggingTargetRoomId,
  } = useRoomLayoutState()

  const room = rooms.find(r => r.id === id)

  if (loading) {
    return <p>Loading tank layout…</p>
  }

  if (!room) {
    return (
      <Card style={{ textAlign: 'center', color: 'var(--text-2)' }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Room not found.</p>
        <Link to="/rooms" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, color: 'var(--blue)' }}>
          <ChevronLeft size={16} /> Back to Fish Rooms
        </Link>
      </Card>
    )
  }

  function beginEditing() {
    startEditing(room!)
    setIsEditingName(true)
  }

  function finishSave() {
    saveRoomName()
    setIsEditingName(false)
  }

  function finishCancel() {
    cancelEditing()
    setIsEditingName(false)
  }

  function handleDeleteRoom() {
    deleteRoom(room!.id)
    navigate('/rooms')
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Link to="/rooms" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', padding: '8px 6px' }}>
          <ChevronLeft size={18} /> Fish Rooms
        </Link>
      </div>

      <Card
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDraggingTargetRoomId(room.id) }}
        onDrop={() => handleDrop(room.id)}
        style={{ borderColor: draggingTargetRoomId === room.id ? 'var(--blue-border)' : undefined }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          {isEditingName && editingRoomId === room.id ? (
            <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0 }}>
              <input
                autoFocus
                value={editingRoomName}
                onChange={e => setEditingRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && finishSave()}
                style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
              />
              <button
                type="button"
                onClick={finishSave}
                style={{ padding: '9px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer' }}
              >Save</button>
              <button
                type="button"
                onClick={finishCancel}
                style={{ padding: '9px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
              >Cancel</button>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 13 }}>{room.tankIds.length} tank{room.tankIds.length === 1 ? '' : 's'} · drag tanks to position them</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={beginEditing}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
                >
                  <Pencil size={14} /> Rename
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRoom}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
                >
                  <Trash2 size={14} /> Remove room
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', color: 'var(--text-2)', fontSize: 12 }}>
            <span>Room size</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <input type="number" min="0.5" step="0.1" value={room.width} onChange={e => updateRoomDimensions(room.id, 'width', e.target.value)} onBlur={() => commitRoomDimensions(room.id, 'width')} style={{ width: 62 }} /> m wide
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <input type="number" min="0.5" step="0.1" value={room.depth} onChange={e => updateRoomDimensions(room.id, 'depth', e.target.value)} onBlur={() => commitRoomDimensions(room.id, 'depth')} style={{ width: 62 }} /> m deep
            </label>
          </div>
          <div
            onPointerMove={e => moveTankOnMap(e, room.id)}
            onPointerUp={() => commitTankMove(room.id)}
            onPointerCancel={() => commitTankMove(room.id)}
            style={{ position: 'relative', width: '100%', aspectRatio: `${room.width} / ${room.depth}`, minHeight: 280, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--blue-border)', backgroundColor: 'var(--blue-bg)', backgroundImage: 'linear-gradient(var(--blue-border) 1px, transparent 1px), linear-gradient(90deg, var(--blue-border) 1px, transparent 1px)', backgroundSize: '10% 10%', touchAction: 'none' }}
          >
            {room.tankIds.map((tankId, index) => {
              const tank = tankLookup.get(tankId)
              if (!tank) return null
              const position = room.tankPositions[tank.id] ?? defaultTankPosition(index)
              const tankWidth = Math.max(12, Math.min(32, ((tank.width_mm ?? Math.sqrt(tank.volume_litres) * 100) / (room.width * 1000)) * 100))
              const tankDepth = Math.max(9, Math.min(28, ((tank.depth_mm ?? Math.sqrt(tank.volume_litres) * 80) / (room.depth * 1000)) * 100))
              return (
                <div
                  key={tank.id}
                  onPointerDown={e => startTankMove(e, room.id, tank.id)}
                  title={`${tank.name} - drag to position`}
                  style={{ position: 'absolute', left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)', width: `${tankWidth}%`, minHeight: `${tankDepth}%`, padding: '7px 8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, borderRadius: 7, border: `1.5px solid ${movingTank?.tankId === tank.id ? 'var(--amber)' : 'var(--blue)'}`, background: 'var(--surface)', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', cursor: movingTank?.tankId === tank.id ? 'grabbing' : 'grab', userSelect: 'none' }}
                >
                  <button
                    type="button"
                    aria-label={`View ${tank.name} details`}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => navigate(`/tanks/${tank.id}?fromRoom=${room.id}&fromRoomName=${encodeURIComponent(room.name)}`)}
                    style={{ position: 'absolute', top: 3, left: 3, display: 'grid', placeItems: 'center', width: 18, height: 18, padding: 0, border: 'none', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}
                  ><ExternalLink size={11} /></button>
                  <button
                    type="button"
                    aria-label={`Remove ${tank.name} from ${room.name}`}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => moveTankToRoom(tank.id, null)}
                    style={{ position: 'absolute', top: 3, right: 3, display: 'grid', placeItems: 'center', width: 18, height: 18, padding: 0, border: 'none', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}
                  ><X size={11} /></button>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text)', marginTop: 2 }}>{tank.name}</strong>
                  <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{tank.volume_litres} L</span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <Card
        onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDraggingTargetRoomId(null) }}
        onDrop={() => handleDrop(null)}
        style={{ borderColor: draggingTargetRoomId === null ? 'var(--blue-border)' : undefined }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Unassigned tanks</p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 12 }}>Drag a tank into this room, or drop one here to unassign it.</p>
          </div>
        </div>

        {unassignedTanks.length === 0 ? (
          <div style={{ padding: '18px 16px', borderRadius: 14, background: 'var(--surface-2)', border: '0.5px solid var(--border)' }}>
            <p style={{ margin: 0, color: 'var(--text-2)' }}>All tanks are assigned. Remove a tank from a room to reassign it.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {unassignedTanks.map(tank => (
              <div
                key={tank.id}
                draggable
                onDragStart={() => handleDragStart(tank.id, null)}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--surface-2)', cursor: 'grab' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>{tank.name}</p>
                  <Tag bg="var(--blue-bg)" color="var(--blue)">{tank.volume_litres} L</Tag>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--text-2)', fontSize: 12 }}>
                  <span>{tank.water_type.replace(/^(.)/, s => s.toUpperCase())}</span>
                  {tank.has_heater && <span>Heater</span>}
                  {tank.co2_injection && <span>CO₂</span>}
                  {tank.filter_flow_lph != null && <span>{tank.filter_flow_lph} L/h filter</span>}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>Drag me into the room above to assign this tank.</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
