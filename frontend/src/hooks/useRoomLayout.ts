import { useEffect, useMemo, useState } from 'react'
import { useTanks, useRooms } from './index'
import { api, Room as ApiRoom, Tank } from '../api/client'

export interface RoomState {
  id: string
  name: string
  tankIds: string[]
  width: number
  length: number
  tankPositions: Record<string, TankPosition>
}

export interface TankPosition {
  x: number
  y: number
}

export function defaultTankPosition(index: number): TankPosition {
  return {
    x: 15 + (index % 4) * 23,
    y: 18 + Math.floor(index / 4) * 28,
  }
}

// Each room map is a 10x10 grid (see the map's backgroundSize: '10% 10%'),
// so one grid square = room.width / 10 metres of width by room.length / 10 of length.
export function tankFootprintPercent(tank: Tank, room: RoomState): { width: number; length: number } {
  return {
    width: Math.max(12, Math.min(32, ((tank.width_mm ?? Math.sqrt(tank.volume_litres) * 100) / (room.width * 1000)) * 100)),
    length: Math.max(9, Math.min(28, ((tank.depth_mm ?? Math.sqrt(tank.volume_litres) * 80) / (room.length * 1000)) * 100)),
  }
}

function fromApiRoom(room: ApiRoom): RoomState {
  return {
    id: room.id,
    name: room.name,
    width: room.width_m,
    length: room.length_m,
    tankIds: room.tank_positions.map(p => p.tank_id),
    tankPositions: Object.fromEntries(room.tank_positions.map(p => [p.tank_id, { x: p.x, y: p.y }])),
  }
}

export function useRoomLayoutState() {
  const { data: tanks, loading: tanksLoading } = useTanks()
  const { data: apiRooms, loading: roomsLoading, reload: reloadRooms } = useRooms()
  const [rooms, setRooms] = useState<RoomState[]>([])
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

  function updateRooms(updater: (current: RoomState[]) => RoomState[]) {
    setRooms(prev => updater(prev))
  }

  async function addRoom(name: string, width?: number, length?: number, groupId?: string | null): Promise<string | null> {
    const trimmed = name.trim()
    if (!trimmed) return null
    const created = await api.rooms.create({ name: trimmed, width_m: width, length_m: length, group_id: groupId ?? null })
    updateRooms(prev => [...prev, fromApiRoom(created)])
    return created.id
  }

  function startEditing(room: RoomState) {
    setEditingRoomId(room.id)
    setEditingRoomName(room.name)
  }

  function cancelEditing() {
    setEditingRoomId(null)
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

  function updateRoomDimensions(roomId: string, field: 'width' | 'length', value: string) {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return
    updateRooms(prev => prev.map(room => room.id === roomId ? { ...room, [field]: numericValue } : room))
  }

  function commitRoomDimensions(roomId: string, field: 'width' | 'length') {
    const room = rooms.find(r => r.id === roomId)
    if (!room) return
    const body = field === 'width' ? { width_m: room.width } : { length_m: room.length }
    api.rooms.update(roomId, body).catch(() => reloadRooms())
  }

  function moveTankOnMap(event: React.PointerEvent<HTMLDivElement>, roomId: string) {
    if (!movingTank || movingTank.roomId !== roomId) return
    const room = rooms.find(r => r.id === roomId)
    const tank = tankLookup.get(movingTank.tankId)
    if (!room || !tank) return
    const { width: tankWidthPct, length: tankLengthPct } = tankFootprintPercent(tank, room)
    const rect = event.currentTarget.getBoundingClientRect()
    const rawX = ((event.clientX - rect.left) / rect.width) * 100
    const rawY = ((event.clientY - rect.top) / rect.height) * 100
    const x = Math.max(tankWidthPct / 2, Math.min(100 - tankWidthPct / 2, rawX))
    const y = Math.max(tankLengthPct / 2, Math.min(100 - tankLengthPct / 2, rawY))
    updateRooms(prev => prev.map(r => r.id === roomId ? {
      ...r,
      tankPositions: { ...r.tankPositions, [movingTank.tankId]: { x, y } },
    } : r))
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

  return {
    loading,
    rooms,
    tankLookup,
    unassignedTanks,
    addRoom,
    editingRoomId,
    editingRoomName,
    setEditingRoomName,
    startEditing,
    cancelEditing,
    saveRoomName,
    deleteRoom,
    moveTankToRoom,
    updateRoomDimensions,
    commitRoomDimensions,
    moveTankOnMap,
    startTankMove,
    commitTankMove,
    movingTank,
    draggingTargetRoomId,
    setDraggingTargetRoomId,
    handleDragStart,
    handleDrop,
  }
}
