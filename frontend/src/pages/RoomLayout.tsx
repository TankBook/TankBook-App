import { useEffect, useMemo, useState } from 'react'
import { Building, Plus, Pencil, Trash2, Grid, ChevronLeft, Columns, X } from 'lucide-react'
import { useTanks, useRooms } from '../hooks'
import { Card, FieldLabel, Tag } from '../components/ui'
import { api, Room as ApiRoom, Tank } from '../api/client'

interface Room {
  id: string
  name: string
  tankIds: string[]
  width: number
  depth: number
  tankPositions: Record<string, TankPosition>
}

interface TankPosition {
  x: number
  y: number
}

function defaultTankPosition(index: number): TankPosition {
  return {
    x: 15 + (index % 4) * 23,
    y: 18 + Math.floor(index / 4) * 28,
  }
}

function fromApiRoom(room: ApiRoom): Room {
  return {
    id: room.id,
    name: room.name,
    width: room.width_m,
    depth: room.depth_m,
    tankIds: room.tank_positions.map(p => p.tank_id),
    tankPositions: Object.fromEntries(room.tank_positions.map(p => [p.tank_id, { x: p.x, y: p.y }])),
  }
}

export default function RoomLayout() {
  const { data: tanks, loading: tanksLoading } = useTanks()
  const { data: apiRooms, loading: roomsLoading, reload: reloadRooms } = useRooms()
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoomName, setNewRoomName] = useState('')
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [editingRoomName, setEditingRoomName] = useState('')
  const [dragTankId, setDragTankId] = useState<string | null>(null)
  const [dragFromRoomId, setDragFromRoomId] = useState<string | null>(null)
  const [draggingTargetRoomId, setDraggingTargetRoomId] = useState<string | null>(null)
  const [movingTank, setMovingTank] = useState<{ roomId: string; tankId: string } | null>(null)

  useEffect(() => {
    if (apiRooms) setRooms(apiRooms.map(fromApiRoom))
  }, [apiRooms])

  const loading = tanksLoading || roomsLoading

  const tankLookup = useMemo(() => {
    return new Map<string, Tank>((tanks ?? []).map(t => [t.id, t]))
  }, [tanks])

  const assignedTankIds = useMemo(() => new Set(rooms.flatMap(room => room.tankIds)), [rooms])
  const unassignedTanks = useMemo(() => {
    return (tanks ?? []).filter(tank => !assignedTankIds.has(tank.id))
  }, [tanks, assignedTankIds])

  function updateRooms(updater: (current: Room[]) => Room[]) {
    setRooms(prev => updater(prev))
  }

  async function addRoom() {
    const trimmed = newRoomName.trim()
    if (!trimmed) return
    setNewRoomName('')
    const created = await api.rooms.create({ name: trimmed })
    updateRooms(prev => [...prev, fromApiRoom(created)])
  }

  function startEditing(room: Room) {
    setEditingRoomId(room.id)
    setEditingRoomName(room.name)
  }

  function saveRoomName() {
    if (!editingRoomId) return
    const trimmed = editingRoomName.trim()
    if (!trimmed) return
    const roomId = editingRoomId
    setEditingRoomId(null)
    updateRooms(prev => prev.map(room => room.id === roomId ? { ...room, name: trimmed } : room))
    api.rooms.update(roomId, { name: trimmed }).catch(() => reloadRooms())
  }

  function deleteRoom(id: string) {
    updateRooms(prev => prev.filter(room => room.id !== id))
    api.rooms.remove(id).catch(() => reloadRooms())
  }

  function moveTankToRoom(tankId: string, targetRoomId: string | null) {
    const targetRoom = targetRoomId ? rooms.find(room => room.id === targetRoomId) : undefined
    const position = targetRoom ? defaultTankPosition(targetRoom.tankIds.length) : null
    updateRooms(prev => {
      const next = prev.map(room => {
        const tankPositions = { ...room.tankPositions }
        delete tankPositions[tankId]
        return { ...room, tankIds: room.tankIds.filter(id => id !== tankId), tankPositions }
      })
      return targetRoomId && position
        ? next.map(room => room.id === targetRoomId ? {
            ...room,
            tankIds: [...room.tankIds, tankId],
            tankPositions: { ...room.tankPositions, [tankId]: position },
          } : room)
        : next
    })
    if (targetRoomId && position) {
      api.rooms.setTankPosition(tankId, { room_id: targetRoomId, x: position.x, y: position.y }).catch(() => reloadRooms())
    } else {
      api.rooms.unassignTank(tankId).catch(() => reloadRooms())
    }
  }

  function updateRoomDimensions(roomId: string, field: 'width' | 'depth', value: string) {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return
    updateRooms(prev => prev.map(room => room.id === roomId ? { ...room, [field]: numericValue } : room))
  }

  function commitRoomDimensions(roomId: string, field: 'width' | 'depth') {
    const room = rooms.find(r => r.id === roomId)
    if (!room) return
    const body = field === 'width' ? { width_m: room.width } : { depth_m: room.depth }
    api.rooms.update(roomId, body).catch(() => reloadRooms())
  }

  function moveTankOnMap(event: React.PointerEvent<HTMLDivElement>, roomId: string) {
    if (!movingTank || movingTank.roomId !== roomId) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.max(6, Math.min(94, ((event.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(8, Math.min(92, ((event.clientY - rect.top) / rect.height) * 100))
    updateRooms(prev => prev.map(room => room.id === roomId ? {
      ...room,
      tankPositions: { ...room.tankPositions, [movingTank.tankId]: { x, y } },
    } : room))
  }

  function startTankMove(event: React.PointerEvent<HTMLDivElement>, roomId: string, tankId: string) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setMovingTank({ roomId, tankId })
  }

  function commitTankMove(roomId: string) {
    if (!movingTank || movingTank.roomId !== roomId) {
      setMovingTank(null)
      return
    }
    const { tankId } = movingTank
    const position = rooms.find(r => r.id === roomId)?.tankPositions[tankId]
    setMovingTank(null)
    if (position) {
      api.rooms.setTankPosition(tankId, { room_id: roomId, x: position.x, y: position.y }).catch(() => reloadRooms())
    }
  }

  function handleDragStart(tankId: string, fromRoomId: string | null) {
    setDragTankId(tankId)
    setDragFromRoomId(fromRoomId)
  }

  function handleDrop(targetRoomId: string | null) {
    if (!dragTankId) return
    if (targetRoomId === dragFromRoomId) {
      setDragTankId(null)
      setDragFromRoomId(null)
      setDraggingTargetRoomId(null)
      return
    }
    moveTankToRoom(dragTankId, targetRoomId)
    setDragTankId(null)
    setDragFromRoomId(null)
    setDraggingTargetRoomId(null)
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
            <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 13 }}>Organize your tanks by room and drag tanks between spaces.</p>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={addRoom}
            disabled={!newRoomName.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: '0.5px solid var(--border)', background: newRoomName.trim() ? 'var(--blue-bg)' : 'var(--surface)', color: newRoomName.trim() ? 'var(--blue)' : 'var(--text-3)', cursor: newRoomName.trim() ? 'pointer' : 'default' }}
          >
            <Plus size={16} />
            Create room
          </button>
        </div>
      </div>

      <Card style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <FieldLabel>New room name</FieldLabel>
            <input
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              placeholder="e.g. Fish room, Living room"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <FieldLabel>Unassigned tanks</FieldLabel>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '0.5px solid var(--border)', color: 'var(--text-2)', fontSize: 13 }}>
              <Grid size={14} />
              {unassignedTanks.length} tank{unassignedTanks.length === 1 ? '' : 's'} available
            </span>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 24 }}>
        {rooms.length === 0 && (
          <Card style={{ textAlign: 'center', color: 'var(--text-2)' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>No rooms defined yet.</p>
            <p style={{ margin: '10px 0 0' }}>Add a room above and then drag tanks into it from the unassigned section.</p>
          </Card>
        )}

        <div style={{ display: 'grid', gap: 18 }}>
          {rooms.map(room => (
            <Card
              key={room.id}
              onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDraggingTargetRoomId(room.id) }}
              onDrop={() => handleDrop(room.id)}
              style={{ borderColor: draggingTargetRoomId === room.id ? 'var(--blue-border)' : undefined }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {editingRoomId === room.id ? (
                  <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0 }}>
                    <input
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
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <Columns size={16} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</p>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 12 }}>{room.tankIds.length} tank{room.tankIds.length === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                          aria-label={`Remove ${tank.name} from ${room.name}`}
                          onPointerDown={e => e.stopPropagation()}
                          onClick={() => moveTankToRoom(tank.id, null)}
                          style={{ position: 'absolute', top: 3, right: 3, display: 'grid', placeItems: 'center', width: 18, height: 18, padding: 0, border: 'none', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}
                        ><X size={11} /></button>
                        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text)' }}>{tank.name}</strong>
                        <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{tank.volume_litres} L</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card
          onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDraggingTargetRoomId(null) }}
          onDrop={() => handleDrop(null)}
          style={{ borderColor: draggingTargetRoomId === null ? 'var(--blue-border)' : undefined }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChevronLeft size={16} />
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Unassigned tanks</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 12 }}>Drag a tank here to remove it from any room.</p>
              </div>
            </div>
          </div>

          {unassignedTanks.length === 0 ? (
            <div style={{ padding: '18px 16px', borderRadius: 14, background: 'var(--surface-2)', border: '0.5px solid var(--border)' }}>
              <p style={{ margin: 0, color: 'var(--text-2)' }}>All tanks are assigned. Add a new room or remove a tank from a room to reassign.</p>
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
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>Drag me into a room to assign this tank.</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
