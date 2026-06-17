import { useState, useEffect, useRef } from 'react'
import { Save, Eraser } from 'lucide-react'
import { useTanks, usePlants } from '../hooks'
import { Card, ConfirmDialog } from '../components/ui'
import { useSettings } from '../context/SettingsContext'

interface PaletteItem {
  type: 'plant' | 'hardscape'
  label: string
  color: string
}

interface CellData {
  label: string
  color: string
}

const PLANT_COLORS = [
  '#1b5e20', '#2e7d32', '#388e3c', '#4caf50',
  '#558b2f', '#33691e', '#7cb342', '#43a047',
  '#1a5c3a', '#66bb6a', '#004d40', '#00695c',
]

const HARDSCAPE: PaletteItem[] = [
  { type: 'hardscape', label: 'Rock',       color: '#607d8b' },
  { type: 'hardscape', label: 'Dark rock',  color: '#37474f' },
  { type: 'hardscape', label: 'Driftwood',  color: '#795548' },
  { type: 'hardscape', label: 'Branch',     color: '#a0785a' },
  { type: 'hardscape', label: 'Sand',       color: '#d4c5a9' },
  { type: 'hardscape', label: 'Gravel',     color: '#9e9e9e' },
]

const BG = '#0c1a0e'
const GRID_COLOR = 'rgba(255,255,255,0.06)'
const MAX_W = 740

export default function TankDesigner() {
  const { data: tanks, loading: tanksLoading } = useTanks()
  const { defaultTank } = useSettings()
  const [tankId, setTankId] = useState('')
  const [cells, setCells] = useState<Record<string, CellData>>({})
  const [activeItem, setActiveItem] = useState<PaletteItem | null>(null)
  const [tool, setTool] = useState<'paint' | 'erase'>('paint')
  const [speciesMap, setSpeciesMap] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingDesign, setLoadingDesign] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isPainting = useRef(false)
  const lastCell = useRef('')

  const plants = usePlants(tankId)
  const tank = tanks?.find(t => t.id === tankId) ?? null

  const widthCm  = tank?.width_mm  ? Math.round(tank.width_mm  / 10) : 60
  const depthCm  = tank?.depth_mm  ? Math.round(tank.depth_mm  / 10) : 30
  const cellSize = Math.max(6, Math.min(16, Math.floor(MAX_W / widthCm)))
  const canvasW  = widthCm * cellSize
  const canvasH  = depthCm * cellSize

  const plantItems: PaletteItem[] = (plants.data ?? []).map((p, i) => ({
    type: 'plant',
    label: speciesMap[p.species_slug] ?? p.species_slug.replace(/-/g, ' '),
    color: PLANT_COLORS[i % PLANT_COLORS.length],
  }))

  // Auto-select default tank (or first tank) once list is loaded
  useEffect(() => {
    if (!tanks || tanks.length === 0 || tankId) return
    const preferred = defaultTank && tanks.find(t => t.id === defaultTank)
    setTankId(preferred ? preferred.id : tanks[0].id)
  }, [tanks, defaultTank])

  // Fetch species common names once for display
  useEffect(() => {
    fetch('/api/species/')
      .then(r => r.json())
      .then((list: any[]) => {
        const map: Record<string, string> = {}
        list.forEach(s => { map[s.slug] = s.common_name })
        setSpeciesMap(map)
      })
      .catch(() => {})
  }, [])

  // Load saved design when tank changes
  useEffect(() => {
    if (!tankId) { setCells({}); return }
    setLoadingDesign(true)
    fetch(`/api/tanks/${tankId}/design`)
      .then(r => r.json())
      .then((data: any) => {
        const map: Record<string, CellData> = {}
        ;(data.cells ?? []).forEach((c: any) => {
          map[`${c.x},${c.y}`] = { label: c.label, color: c.color }
        })
        setCells(map)
      })
      .catch(() => setCells({}))
      .finally(() => setLoadingDesign(false))
  }, [tankId])

  // Redraw canvas whenever cells or dimensions change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, canvasW, canvasH)

    // Filled cells
    Object.entries(cells).forEach(([key, cell]) => {
      const [cx, cy] = key.split(',').map(Number)
      ctx.fillStyle = cell.color
      ctx.fillRect(cx * cellSize, cy * cellSize, cellSize, cellSize)
    })

    // Grid overlay
    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 0.5
    for (let x = 0; x <= widthCm; x++) {
      ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, canvasH); ctx.stroke()
    }
    for (let y = 0; y <= depthCm; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(canvasW, y * cellSize); ctx.stroke()
    }
  }, [cells, widthCm, depthCm, cellSize, canvasW, canvasH])

  function getCellCoords(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect()
    // Account for CSS scaling if canvas is displayed smaller than its native size
    const scaleX = canvasW / rect.width
    const scaleY = canvasH / rect.height
    return [
      Math.floor(((e.clientX - rect.left) * scaleX) / cellSize),
      Math.floor(((e.clientY - rect.top)  * scaleY) / cellSize),
    ]
  }

  function paintAt(cx: number, cy: number) {
    if (cx < 0 || cy < 0 || cx >= widthCm || cy >= depthCm) return
    const key = `${cx},${cy}`
    if (key === lastCell.current) return
    lastCell.current = key
    setCells(prev => {
      if (tool === 'erase') {
        if (!prev[key]) return prev
        const next = { ...prev }; delete next[key]; return next
      }
      if (!activeItem) return prev
      if (prev[key]?.label === activeItem.label) return prev
      return { ...prev, [key]: { label: activeItem.label, color: activeItem.color } }
    })
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    isPainting.current = true
    lastCell.current = ''
    const [cx, cy] = getCellCoords(e)
    paintAt(cx, cy)
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isPainting.current) return
    const [cx, cy] = getCellCoords(e)
    paintAt(cx, cy)
  }

  function onMouseUp() { isPainting.current = false }

  async function saveDesign() {
    if (!tankId) return
    setSaving(true)
    const cellArray = Object.entries(cells).map(([key, cell]) => {
      const [x, y] = key.split(',').map(Number)
      return { x, y, label: cell.label, color: cell.color }
    })
    await fetch(`/api/tanks/${tankId}/design`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cells: cellArray }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (tanksLoading) return <p style={{ color: 'var(--text-2)' }}>Loading…</p>

  return (
    <div>
      {showClearConfirm && (
        <ConfirmDialog
          title="Clear Design"
          message="This will remove all placed items from the canvas. The saved design will remain until you save again."
          confirmLabel="Clear canvas"
          danger
          onConfirm={() => { setCells({}); setActiveItem(null); setShowClearConfirm(false) }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--text)', flex: 1 }}>Tank Designer</h1>
        <select
          value={tankId}
          onChange={e => { setTankId(e.target.value); setCells({}); setActiveItem(null) }}
          style={{ minWidth: 200 }}
        >
          <option value="">— Select a tank —</option>
          {(tanks ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {tankId && (
          <>
            <button
              onClick={saveDesign}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
              }}
            >
              <Save size={13} />{saving ? 'Saving…' : 'Save Design'}
            </button>
            {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved ✓</span>}
          </>
        )}
      </div>

      {!tankId && (
        <Card style={{ maxWidth: 420 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Select a tank above to start designing. Each cell represents 1 cm².
            The canvas dimensions are driven by the tank's width and depth — set these in the tank's Edit tab if not already done.
          </p>
        </Card>
      )}

      {tankId && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* ── Palette sidebar ── */}
          <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Tools card */}
            <Card style={{ padding: 12 }}>
              <p style={sectionLabel}>Tool</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {(['paint', 'erase'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTool(t)}
                    style={{
                      flex: 1, padding: '5px 4px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                      border: tool === t
                        ? (t === 'erase' ? '0.5px solid var(--red-border)' : '0.5px solid var(--blue-border)')
                        : '0.5px solid var(--btn-border)',
                      background: tool === t
                        ? (t === 'erase' ? 'var(--red-bg)' : 'var(--blue-bg)')
                        : 'transparent',
                      color: tool === t
                        ? (t === 'erase' ? 'var(--red)' : 'var(--blue)')
                        : 'var(--text-2)',
                    }}
                  >
                    {t === 'erase' && <Eraser size={10} />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowClearConfirm(true)}
                style={{ width: '100%', padding: '5px 0', borderRadius: 6, fontSize: 11, color: 'var(--text-3)', border: '0.5px solid var(--btn-border)', cursor: 'pointer' }}
              >
                Clear All
              </button>
            </Card>

            {/* Plants */}
            {plants.loading && <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>Loading plants…</p>}
            {!plants.loading && plantItems.length > 0 && (
              <Card style={{ padding: 12 }}>
                <p style={sectionLabel}>Plants</p>
                {plantItems.map(item => (
                  <PaletteBtn key={item.label} item={item} active={activeItem?.label === item.label}
                    onClick={() => { setActiveItem(item); setTool('paint') }} />
                ))}
              </Card>
            )}
            {!plants.loading && plantItems.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0, lineHeight: 1.5 }}>
                No plants on this tank yet — add them in the Plants tab.
              </p>
            )}

            {/* Hardscape */}
            <Card style={{ padding: 12 }}>
              <p style={sectionLabel}>Hardscape</p>
              {HARDSCAPE.map(item => (
                <PaletteBtn key={item.label} item={item} active={activeItem?.label === item.label}
                  onClick={() => { setActiveItem(item); setTool('paint') }} />
              ))}
            </Card>

            {/* Active item indicator */}
            {activeItem && tool === 'paint' && (
              <div style={{
                padding: '7px 10px', borderRadius: 8, fontSize: 11,
                border: `0.5px solid ${activeItem.color}55`,
                background: `${activeItem.color}18`,
                color: 'var(--text-2)',
              }}>
                <span style={{ color: activeItem.color, fontWeight: 600 }}>■ </span>
                {activeItem.label}
              </div>
            )}

            {/* Dimensions info */}
            <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0, lineHeight: 1.7 }}>
              {widthCm} × {depthCm} cm<br />
              {(widthCm * depthCm).toLocaleString()} cells<br />
              1 cell = 1 cm²
            </p>
            {tank && !tank.width_mm && (
              <p style={{ fontSize: 11, color: 'var(--amber)', margin: 0, lineHeight: 1.5 }}>
                No dimensions set — using 60 × 30 cm default. Add dimensions in the Edit tab.
              </p>
            )}
          </div>

          {/* ── Canvas ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loadingDesign ? (
              <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Loading design…</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0 }}>
                  {/* Top label row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 22, marginBottom: 3 }}>
                    <span style={axisLabel}>FRONT</span>
                    <span style={axisLabel}>← {widthCm} cm →</span>
                    <span style={axisLabel}>BACK</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {/* Depth label */}
                    <div style={{
                      writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                      fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.06em',
                      userSelect: 'none', whiteSpace: 'nowrap',
                    }}>
                      ← {depthCm} cm (depth) →
                    </div>

                    <canvas
                      ref={canvasRef}
                      width={canvasW}
                      height={canvasH}
                      style={{
                        display: 'block',
                        cursor: tool === 'erase' ? 'cell' : activeItem ? 'crosshair' : 'default',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        imageRendering: 'pixelated',
                      }}
                      onMouseDown={onMouseDown}
                      onMouseMove={onMouseMove}
                      onMouseUp={onMouseUp}
                      onMouseLeave={onMouseUp}
                    />
                  </div>

                  {!activeItem && tool === 'paint' && (
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '8px 0 0 22px' }}>
                      ← Select an item from the palette to start painting
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small helpers ──

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
  margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em',
}

const axisLabel: React.CSSProperties = {
  fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.06em', userSelect: 'none',
}

function PaletteBtn({ item, active, onClick }: { item: PaletteItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '5px 6px', borderRadius: 6, fontSize: 11, textAlign: 'left', cursor: 'pointer',
        marginBottom: 2,
        border: active ? `0.5px solid ${item.color}88` : '0.5px solid transparent',
        background: active ? `${item.color}22` : 'transparent',
        color: 'var(--text)',
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 2, background: item.color, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
    </button>
  )
}
