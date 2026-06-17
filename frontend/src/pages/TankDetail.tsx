import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Fish, Leaf, Droplets, CalendarClock, Bell, Pencil, Trash2, Plus, ChevronLeft, Sun, Camera, X, ChevronLeft as Prev, ChevronRight as Next, type LucideIcon } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTank, useFish, usePlants, useParameters, useAlerts } from '../hooks'
import { api } from '../api/client'
import { useSettings, formatDate, formatDateTime, fromMM, toMM, fmtDim, dimInputProps } from '../context/SettingsContext'
import { Card, FieldLabel, Tag, SectionTitle, tabStyle } from '../components/ui'

type Tab = 'fish' | 'plants' | 'parameters' | 'schedule' | 'daily' | 'alerts' | 'gallery' | 'edit'

const TASK_TYPES = ['Water change', 'Filter clean', 'Fertiliser dose', 'CO2 check', 'Glass clean', 'Gravel vac', 'Other']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HEALTH_STATUSES = ['healthy', 'sick', 'quarantine', 'deceased']
const TAB_ICONS: Record<string, LucideIcon> = {
  fish: Fish,
  plants: Leaf,
  parameters: Droplets,
  schedule: CalendarClock,
  daily: Sun,
  alerts: Bell,
  gallery: Camera,
  edit: Pencil,
}

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAILY_COLORS = ['#1e88e5', '#43a047', '#26c6da', '#fb8c00', '#e63946', '#8b5cf6']
const HEALTH_COLORS: Record<string, { bg: string; color: string }> = {
  healthy:    { bg: 'var(--green-bg)',  color: 'var(--green)'  },
  sick:       { bg: 'var(--amber-bg)',  color: 'var(--amber)'  },
  quarantine: { bg: 'var(--blue-bg)',   color: 'var(--blue)'   },
  deceased:   { bg: 'var(--red-bg)',    color: 'var(--red)'    },
}

const PLANT_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  planned: { bg: 'var(--blue-bg)',  color: 'var(--blue)'  },
  planted: { bg: 'var(--green-bg)', color: 'var(--green)' },
  removed: { bg: 'var(--tag-bg)',   color: 'var(--text-2)' },
}

// --- Species autocomplete ---
function SpeciesAutocomplete({ type, value, onChange }: {
  type: 'fish' | 'plant'
  value: string
  onChange: (slug: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 1) { setResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/species/?type=${type}&search=${encodeURIComponent(query)}`)
        .then(r => r.json()).then(setResults).catch(() => setResults([]))
    }, 200)
    return () => clearTimeout(t)
  }, [query, type])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <input
        value={query || value}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={`Search ${type} species…`}
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--surface)', border: '0.5px solid var(--btn-border)', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 220, overflowY: 'auto',
        }}>
          {results.map((s: any) => (
            <div
              key={s.slug}
              className="species-option"
              onMouseDown={() => {
                onChange(s.slug, s.common_name)
                setQuery(s.common_name)
                setOpen(false)
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>{s.common_name}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', fontStyle: 'italic' }}>{s.latin_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Edit tank panel ---
function EditTankPanel({ tank, onSave }: { tank: any; onSave: () => void }) {
  const { unitSystem } = useSettings()
  const dp = dimInputProps(unitSystem)

  const [name, setName] = useState(tank.name)
  const [volume, setVolume] = useState(String(tank.volume_litres))
  const [substrate, setSubstrate] = useState(tank.substrate ?? '')
  const [lighting, setLighting] = useState(tank.lighting ?? '')
  const [filterFlow, setFilterFlow] = useState(tank.filter_flow_lph != null ? String(tank.filter_flow_lph) : '')
  const [width, setWidth] = useState(tank.width_mm != null ? String(fromMM(tank.width_mm, unitSystem)) : '')
  const [height, setHeight] = useState(tank.height_mm != null ? String(fromMM(tank.height_mm, unitSystem)) : '')
  const [depth, setDepth] = useState(tank.depth_mm != null ? String(fromMM(tank.depth_mm, unitSystem)) : '')
  const [co2, setCo2] = useState(tank.co2_injection)
  const [saved, setSaved] = useState(false)

  async function save() {
    await fetch(`/api/tanks/${tank.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, volume_litres: Number(volume),
        substrate: substrate || null, lighting: lighting || null,
        filter_flow_lph: filterFlow ? Number(filterFlow) : null,
        width_mm: width ? toMM(Number(width), unitSystem) : null,
        height_mm: height ? toMM(Number(height), unitSystem) : null,
        depth_mm: depth ? toMM(Number(depth), unitSystem) : null,
        co2_injection: co2, setup_date: tank.setup_date,
      }),
    })
    onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <SectionTitle>Edit tank</SectionTitle>
      {[
        ['Tank name', name, setName],
        ['Volume (litres)', volume, setVolume],
        ['Substrate', substrate, setSubstrate],
        ['Lighting', lighting, setLighting],
        ['Filter flow (L/h)', filterFlow, setFilterFlow],
      ].map(([lbl, val, set]) => (
        <div key={lbl as string} style={{ marginBottom: 12 }}>
          <FieldLabel>{lbl as string}</FieldLabel>
          <input value={val as string} onChange={e => (set as any)(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        {([['Width', width, setWidth], ['Height', height, setHeight], ['Depth', depth, setDepth]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
          <div key={lbl}>
            <FieldLabel>{lbl} ({unitSystem})</FieldLabel>
            <input type="number" min="0" step={dp.step} placeholder={dp.placeholder}
              value={val} onChange={e => set(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, color: 'var(--text-label)' }}>
        <input type="checkbox" checked={co2} onChange={e => setCo2(e.target.checked)} /> CO₂ injection
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={save} style={{ padding: '7px 16px', borderRadius: 8, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save changes</button>
        {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved ✓</span>}
      </div>
    </Card>
  )
}

// --- Compatibility badge ---
function CompatibilityCheck({ tankId, slug }: { tankId: string; slug: string }) {
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    if (!slug) { setWarnings([]); return }
    fetch(`/api/tanks/${tankId}/compatibility?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => setWarnings(d.warnings ?? []))
      .catch(() => setWarnings([]))
  }, [slug, tankId])

  if (!warnings.length) return null
  return (
    <div style={{ background: 'var(--amber-bg)', border: '0.5px solid var(--amber-border)', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
      {warnings.map((w, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '4px 0 0', fontSize: 12, color: 'var(--amber)' }}>⚠ {w}</p>
      ))}
    </div>
  )
}

// --- Aquarium graphic ---
function TankGraphic({ fishCount, plantCount, co2 }: { fishCount: number; plantCount: number; co2: boolean }) {
  const W = 480, H = 134
  const GR = 10
  const WT = 6
  const SY = 104
  const BY = 128
  const FISH_MIN_Y = WT + 12, FISH_MAX_Y = SY - 16
  const FISH_MIN_X = 20,      FISH_MAX_X = W - 20

  const numFish   = Math.min(fishCount, 6)
  const numPlants = plantCount > 0 ? Math.min(plantCount, 4) : 0

  const fishDefs = useMemo(() => ([
    { homeX: 175, homeY: 53, s: 1.00, offsetX:   0, offsetY:   0 },
    { homeX: 296, homeY: 40, s: 0.78, offsetX:  22, offsetY: -12 },
    { homeX: 118, homeY: 74, s: 0.88, offsetX: -26, offsetY:   6 },
    { homeX: 362, homeY: 63, s: 0.72, offsetX:  32, offsetY:  12 },
    { homeX: 244, homeY: 82, s: 0.82, offsetX: -16, offsetY:  16 },
    { homeX: 72,  homeY: 48, s: 0.70, offsetX: -38, offsetY:  -6 },
  ] as const).slice(0, numFish), [numFish])

  // Animation refs — mutated every frame without triggering re-renders
  const svgRef    = useRef<SVGSVGElement>(null)
  const feedRef   = useRef({ active: false, x: 0, y: 0 })
  const feedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animRef   = useRef<{ x: number; y: number; vx: number; vy: number; dir: number }[]>([])
  const groupRefs = useRef<(SVGGElement | null)[]>([])
  const rafRef    = useRef(0)
  const [foodDrop, setFoodDrop] = useState<{ x: number; y: number; key: number } | null>(null)

  useEffect(() => {
    animRef.current = fishDefs.map(f => ({ x: f.homeX, y: f.homeY, vx: 0, vy: 0, dir: 1 }))
  }, [fishDefs])

  // Click to feed — fish rush to click point for 2.5 s then resume wandering
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onClick = (e: MouseEvent) => {
      const r = svg.getBoundingClientRect()
      const x = (e.clientX - r.left) * (W / r.width)
      const y = (e.clientY - r.top)  * (H / r.height)
      feedRef.current = { active: true, x, y }
      setFoodDrop({ x, y, key: Date.now() })
      if (feedTimer.current) clearTimeout(feedTimer.current)
      feedTimer.current = setTimeout(() => {
        feedRef.current = { ...feedRef.current, active: false }
        setFoodDrop(null)
      }, 2500)
    }
    svg.addEventListener('click', onClick)
    return () => {
      svg.removeEventListener('click', onClick)
      if (feedTimer.current) clearTimeout(feedTimer.current)
    }
  }, [])

  // Animation loop — runs at 60 fps, writes directly to DOM
  useEffect(() => {
    if (numFish === 0) return
    const FOLLOW_LAG = [0.045, 0.032, 0.038, 0.027, 0.034, 0.029]
    const WANDER_LAG = 0.012

    const tick = (ts: number) => {
      const t = ts / 1000
      animRef.current.forEach((f, i) => {
        const def = fishDefs[i]
        const { active, x: fx, y: fy } = feedRef.current
        let targetX: number, targetY: number, lag: number
        if (active) {
          targetX = Math.max(FISH_MIN_X, Math.min(FISH_MAX_X, fx + def.offsetX))
          targetY = Math.max(FISH_MIN_Y, Math.min(FISH_MAX_Y, fy + def.offsetY))
          lag = FOLLOW_LAG[i]
        } else {
          // Each fish drifts on its own independent sine-wave path
          const freq  = 0.22 + i * 0.04
          const phase = i * (Math.PI * 2 / 6)
          targetX = Math.max(FISH_MIN_X, Math.min(FISH_MAX_X, def.homeX + Math.sin(t * freq + phase) * 44))
          targetY = Math.max(FISH_MIN_Y, Math.min(FISH_MAX_Y, def.homeY + Math.cos(t * freq * 0.65 + phase + 1.3) * 10))
          lag = WANDER_LAG
        }
        f.vx = (targetX - f.x) * lag
        f.vy = (targetY - f.y) * lag
        f.x += f.vx
        f.y += f.vy
        if (Math.abs(f.vx) > 0.06) f.dir = f.vx > 0 ? 1 : -1

        const el = groupRefs.current[i]
        if (el) {
          const bw = 34 * def.s
          el.setAttribute('transform', f.dir === 1
            ? `translate(${f.x - bw / 2}, ${f.y})`
            : `translate(${f.x + bw / 2}, ${f.y}) scale(-1, 1)`)
        }
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [fishDefs, numFish])

  const plantXs = [44, 422, 152, 332].slice(0, numPlants)

  const bubbleSrc = [
    { x: 44,  r: 2.5, dur: 3.2, delay: 0.0, drift:  3 },
    { x: 47,  r: 2.0, dur: 2.7, delay: 1.1, drift: -2 },
    { x: 41,  r: 1.5, dur: 2.3, delay: 2.3, drift:  2 },
    { x: 422, r: 2.5, dur: 3.0, delay: 0.5, drift: -3 },
    { x: 426, r: 2.0, dur: 2.6, delay: 1.6, drift:  2 },
    { x: 420, r: 1.5, dur: 2.2, delay: 2.7, drift: -2 },
    { x: 204, r: 2.0, dur: 2.9, delay: 0.8, drift:  2 },
    { x: 208, r: 1.5, dur: 2.5, delay: 1.9, drift: -2 },
    { x: 332, r: 2.0, dur: 3.1, delay: 0.3, drift: -2 },
    { x: 337, r: 1.5, dur: 2.6, delay: 1.4, drift:  2 },
    { x: 152, r: 2.0, dur: 2.8, delay: 0.7, drift:  2 },
    { x: 157, r: 1.5, dur: 2.4, delay: 1.8, drift: -2 },
    { x: 290, r: 2.0, dur: 3.0, delay: 0.2, drift: -2 },
    { x: 110, r: 1.5, dur: 2.5, delay: 1.3, drift:  2 },
  ]
  const bubbles = bubbleSrc.slice(0, co2 ? 14 : Math.min(3 + numFish + numPlants, 10))

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: GR, cursor: 'pointer' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Water body */}
      <rect x={2} y={WT} width={W - 4} height={BY - WT} fill="var(--blue-bg)" rx={GR - 1} />

      {/* Light shafts */}
      <polygon points={`${W * 0.37 - 8},${WT} ${W * 0.37 + 8},${WT} ${W * 0.37 + 46},${SY} ${W * 0.37 - 46},${SY}`} fill="white" opacity={0.03} />
      <polygon points={`${W * 0.68 - 5},${WT} ${W * 0.68 + 5},${WT} ${W * 0.68 + 26},${SY} ${W * 0.68 - 26},${SY}`} fill="white" opacity={0.025} />

      {/* Plants */}
      {plantXs.map(px => (
        <g key={px}>
          <line x1={px} y1={SY} x2={px} y2={SY - 44} stroke="var(--green)" strokeWidth={1.2} opacity={0.45} />
          <path d={`M ${px},${SY - 18} C ${px - 15},${SY - 26} ${px - 16},${SY - 42} ${px - 3},${SY - 38} C ${px - 6},${SY - 27} ${px - 4},${SY - 18} ${px},${SY - 18}`} fill="var(--green)" opacity={0.42} />
          <path d={`M ${px},${SY - 18} C ${px + 15},${SY - 26} ${px + 16},${SY - 42} ${px + 3},${SY - 38} C ${px + 6},${SY - 27} ${px + 4},${SY - 18} ${px},${SY - 18}`} fill="var(--green)" opacity={0.42} />
          <path d={`M ${px},${SY - 32} C ${px - 12},${SY - 40} ${px - 9},${SY - 56} ${px},${SY - 52} C ${px + 9},${SY - 56} ${px + 12},${SY - 40} ${px},${SY - 32}`} fill="var(--green)" opacity={0.48} />
        </g>
      ))}

      {/* Substrate */}
      <path
        d={`M 2,${SY} Q 80,${SY - 3} 160,${SY + 2} Q 240,${SY - 1} 320,${SY + 2} Q 400,${SY - 4} ${W - 2},${SY} L ${W - 2},${BY} L 2,${BY} Z`}
        fill="var(--tag-bg)" stroke="var(--border)" strokeWidth={0.5}
      />
      {[35, 65, 95, 125, 155, 185, 215, 245, 275, 305, 335, 365, 395, 425, 455].map(gx => (
        <ellipse key={`g1-${gx}`} cx={gx} cy={SY + 7}  rx={4.5} ry={2.8} fill="var(--border)" opacity={0.45} />
      ))}
      {[50, 80, 110, 140, 170, 200, 230, 260, 290, 320, 350, 380, 410, 440].map(gx => (
        <ellipse key={`g2-${gx}`} cx={gx} cy={SY + 14} rx={3.5} ry={2.0} fill="var(--border)" opacity={0.30} />
      ))}

      {/* Fish — position updated by animation loop; tail wags via SMIL */}
      {fishDefs.map((f, i) => {
        const bw = 34 * f.s, bh = 16 * f.s
        const eyeX = bw * 0.78, eyeR = 2.2 * f.s
        const tx = 13 * f.s, ty = 11 * f.s
        const wagDur = `${(1.1 + i * 0.07).toFixed(2)}s`
        return (
          <g key={i} ref={el => { groupRefs.current[i] = el }} transform={`translate(${f.homeX - bw / 2}, ${f.homeY})`}>
            <g>
              <path d={`M 0,0 L ${-tx},${-ty} L ${-tx},${ty} Z`} fill="var(--blue)" opacity={0.30} />
              <animateTransform attributeName="transform" type="rotate" values={`0 0 0;9 0 0;0 0 0;-9 0 0;0 0 0`} dur={wagDur} repeatCount="indefinite" />
            </g>
            <path d={`M ${bw*0.28},-${bh*0.50} C ${bw*0.40},-${bh*0.92} ${bw*0.62},-${bh*0.92} ${bw*0.66},-${bh*0.50}`} fill="none" stroke="var(--blue)" strokeWidth={0.7} opacity={0.28} />
            <path d={`M 0,0 C ${bw*0.28},-${bh*0.58} ${bw*0.76},-${bh*0.52} ${bw},0 C ${bw*0.76},${bh*0.52} ${bw*0.28},${bh*0.58} 0,0 Z`} fill="var(--blue)" opacity={0.46} />
            <circle cx={eyeX}       cy={-bh * 0.08} r={eyeR}        fill="var(--surface)" opacity={0.75} />
            <circle cx={eyeX + 0.4} cy={-bh * 0.08} r={eyeR * 0.5} fill="var(--text)"    opacity={0.35} />
          </g>
        )
      })}

      {/* Bubbles — rise from substrate, drift sideways, grow and fade */}
      {bubbles.map((b, i) => (
        <circle key={i} cx={b.x} cy={SY - 4} r={b.r} fill="none" stroke="var(--blue)" strokeWidth={0.7} opacity={0}>
          <animate attributeName="cy"      from={SY - 4} to={WT + 8} dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" />
          <animate attributeName="cx"      values={`${b.x};${b.x + b.drift};${b.x};${b.x - b.drift};${b.x}`} dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" />
          <animate attributeName="r"       from={b.r * 0.6} to={b.r * 1.6} dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.26;0.22;0" keyTimes="0;0.06;0.18;0.80;1" dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Food particles — sink toward substrate on click */}
      {foodDrop && [-7, -3, 0, 3, 7].map((ox, j) => (
        <circle key={`fp-${foodDrop.key}-${j}`} cx={foodDrop.x + ox} cy={foodDrop.y} r={1.8} fill="var(--amber)" opacity={0}>
          <animate attributeName="cy"      from={foodDrop.y} to={Math.min(SY - 6, foodDrop.y + 32)} dur="2.2s" fill="freeze" />
          <animate attributeName="opacity" values="0;0.9;0.85;0" keyTimes="0;0.07;0.62;1" dur="2.2s" begin={`${j * 0.07}s`} fill="freeze" />
        </circle>
      ))}

      {/* Surface ripple */}
      <path d={`M 4,${WT+5} Q 80,${WT+2} 160,${WT+5} Q 240,${WT+8} 320,${WT+5} Q 400,${WT+2} ${W-4},${WT+5}`} fill="none" stroke="var(--blue)" strokeWidth={0.8} opacity={0.16} />

      {/* Glass frame */}
      <rect x={1.5} y={1.5} width={W-3} height={H-3} fill="none" stroke="var(--border)" strokeWidth={1.5} rx={GR} />
      <rect x={3.5} y={3.5} width={W-7} height={H-7} fill="none" stroke="white" strokeWidth={0.5} rx={GR-1} opacity={0.1} />
    </svg>
  )
}

export default function TankDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('fish')
  const { data: tank, reload: reloadTank } = useTank(id!)
  const fish = useFish(id!)
  const plants = usePlants(id!)
  const params = useParameters(id!, 100)
  const alerts = useAlerts(id!)
  const { dateFormat, unitSystem } = useSettings()

  const [fishSlug, setFishSlug] = useState('')
  const [fishName, setFishName] = useState('')
  const [fishQty, setFishQty] = useState('1')

  const [editingFishId, setEditingFishId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editHealth, setEditHealth] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [plantSlug, setPlantSlug] = useState('')
  const [plantName, setPlantName] = useState('')
  const [plantQty, setPlantQty] = useState('1')
  const [plantAddStatus, setPlantAddStatus] = useState('planted')

  const [editingPlantId, setEditingPlantId] = useState<string | null>(null)
  const [editPlantQty, setEditPlantQty] = useState('')
  const [editPlantStatus, setEditPlantStatus] = useState('')
  const [editPlantNotes, setEditPlantNotes] = useState('')

  const [ph, setPh] = useState('')
  const [temp, setTemp] = useState('')
  const [ammonia, setAmmonia] = useState('')
  const [nitrite, setNitrite] = useState('')
  const [nitrate, setNitrate] = useState('')
  const [gh, setGh] = useState('')
  const [kh, setKh] = useState('')

  const [dailyTasks, setDailyTasks] = useState<any[]>([])
  const [dtName, setDtName] = useState('')
  const [dtHour, setDtHour] = useState('8')
  const [dtMinute, setDtMinute] = useState('0')
  const [dtDays, setDtDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [dtColor, setDtColor] = useState(DAILY_COLORS[0])

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const [galleryImages, setGalleryImages] = useState<{ filename: string; url: string }[]>([])
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [tasks, setTasks] = useState<any[]>([])
  const [taskType, setTaskType] = useState(TASK_TYPES[0])
  const [taskDesc, setTaskDesc] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurWeeks, setRecurWeeks] = useState('1')
  const [recurDay, setRecurDay] = useState('0')

  useEffect(() => {
    if (tab === 'schedule') loadTasks()
    if (tab === 'daily') loadDailyTasks()
    if (tab === 'gallery') loadGallery()
  }, [tab, id])

  async function loadGallery() {
    const images = await api.images.tankList(id!)
    setGalleryImages(images)
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setGalleryUploading(true)
    try {
      for (const file of files) {
        await api.images.uploadTank(id!, file)
      }
      await loadGallery()
    } finally {
      setGalleryUploading(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  async function handleDeleteGalleryImage(filename: string) {
    await api.images.deleteTank(id!, filename)
    setGalleryImages(prev => prev.filter(img => img.filename !== filename))
    setLightboxIdx(null)
  }

  async function loadDailyTasks() {
    const r = await fetch(`/api/tanks/${id}/daily`)
    setDailyTasks(await r.json())
  }

  async function addDailyTask() {
    if (!dtName.trim() || dtDays.length === 0) return
    await api.dailyTasks.create(id!, {
      name: dtName.trim(),
      hour: Number(dtHour),
      minute: Number(dtMinute),
      days: dtDays.join(','),
      color: dtColor,
    })
    setDtName('')
    setDtDays([0, 1, 2, 3, 4, 5, 6])
    loadDailyTasks()
  }

  async function removeDailyTask(taskId: string) {
    await api.dailyTasks.delete(id!, taskId)
    loadDailyTasks()
  }

  async function loadTasks() {
    const r = await fetch(`/api/tanks/${id}/maintenance`)
    setTasks(await r.json())
  }

  async function addTask() {
    if (!isRecurring && !taskDue) return
    const body: any = { task_type: taskType, description: taskDesc || null }
    if (isRecurring) {
      body.is_recurring = true
      body.recur_every_weeks = Number(recurWeeks)
      body.recur_day_of_week = Number(recurDay)
      body.due_at = new Date().toISOString()
    } else {
      body.due_at = new Date(taskDue).toISOString()
    }
    await fetch(`/api/tanks/${id}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setTaskDesc(''); setTaskDue(''); setIsRecurring(false); setRecurWeeks('1'); setRecurDay('0')
    loadTasks()
  }

  async function completeTask(taskId: string) {
    await fetch(`/api/tanks/${id}/maintenance/${taskId}/complete`, { method: 'PATCH' })
    loadTasks()
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tanks/${id}/maintenance/${taskId}`, { method: 'DELETE' })
    loadTasks()
  }

  function startEditFish(f: { id: string; quantity: number; health_status: string; notes: string | null }) {
    setEditingFishId(f.id)
    setEditQty(String(f.quantity))
    setEditHealth(f.health_status)
    setEditNotes(f.notes ?? '')
  }

  async function saveEditFish() {
    if (!editingFishId) return
    await api.fish.update(id!, editingFishId, {
      quantity: Number(editQty),
      health_status: editHealth,
      notes: editNotes || null,
    })
    setEditingFishId(null)
    fish.reload()
  }

  const dailyCellMap = useMemo(() => {
    const map: Record<string, any[]> = {}
    dailyTasks.forEach(task => {
      task.days.split(',').map(Number).forEach((day: number) => {
        const key = `${day}-${task.hour}`
        if (!map[key]) map[key] = []
        map[key].push(task)
      })
    })
    return map
  }, [dailyTasks])

  const todayColIndex = (new Date().getDay() + 6) % 7  // JS 0=Sun → 0=Mon

  if (!tank) return <p style={{ color: 'var(--text-2)' }}>Loading…</p>

  const unackAlerts = alerts.data?.filter(a => !a.acknowledged) ?? []
  const chartData = [...(params.data ?? [])].reverse()

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const overdueTasks = pendingTasks.filter(t => new Date(t.due_at) < new Date())

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>
          <ChevronLeft size={13} />All tanks
        </Link>
        <div style={{ marginTop: 8 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>{tank.name}</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            {tank.volume_litres}L
            {(tank.width_mm || tank.height_mm || tank.depth_mm) ? ` · ${fmtDim(tank.width_mm, unitSystem)} × ${fmtDim(tank.height_mm, unitSystem)} × ${fmtDim(tank.depth_mm, unitSystem)}` : ''}
            {tank.co2_injection ? ' · CO₂' : ''}
            {tank.substrate ? ` · ${tank.substrate}` : ''}
            {tank.lighting ? ` · ${tank.lighting}` : ''}
            {tank.filter_flow_lph ? ` · ${tank.filter_flow_lph} L/h filter` : ''}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <TankGraphic
          fishCount={(fish.data ?? []).reduce((s, f) => s + f.quantity, 0)}
          plantCount={(plants.data ?? []).reduce((s, p) => s + p.quantity, 0)}
          co2={tank.co2_injection}
        />
      </div>

      {unackAlerts.length > 0 && (
        <div style={{ background: 'var(--amber-bg)', border: '0.5px solid var(--amber-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--amber-dark)' }}>
            {unackAlerts.length} unacknowledged alert{unackAlerts.length > 1 ? 's' : ''}
          </p>
          {unackAlerts.slice(0, 2).map(a => (
            <p key={a.id} style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--amber)' }}>{a.message}</p>
          ))}
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--red-dark)' }}>
            {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
          </p>
          {overdueTasks.slice(0, 2).map(t => (
            <p key={t.id} style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--red)' }}>
              {t.task_type}{t.description ? ` — ${t.description}` : ''} (due {formatDate(t.due_at, dateFormat)})
            </p>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, justifyContent: 'center' }}>
        {(['fish', 'plants', 'parameters', 'schedule', 'daily', 'alerts', 'gallery', 'edit'] as Tab[]).map(t => {
          const Icon = TAB_ICONS[t]
          const label = t.charAt(0).toUpperCase() + t.slice(1)
          return (
            <button
              key={t}
              title={label}
              onClick={() => setTab(t)}
              style={{ ...tabStyle(tab === t), position: 'relative', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', padding: isMobile ? '7px 10px' : '6px 12px' }}
            >
              <Icon size={isMobile ? 16 : 13} />
              {!isMobile && label}
              {t === 'alerts' && unackAlerts.length > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: '#e24b4a', color: '#fff', borderRadius: 10,
                  fontSize: 9, padding: '1px 4px', lineHeight: 1.4,
                }}>
                  {unackAlerts.length}
                </span>
              )}
              {t === 'schedule' && overdueTasks.length > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: 'var(--red-border)', color: '#fff', borderRadius: 10,
                  fontSize: 9, padding: '1px 4px', lineHeight: 1.4,
                }}>
                  {overdueTasks.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* FISH TAB */}
      {tab === 'fish' && (
        <Card>
          <SectionTitle>Fish</SectionTitle>
          {fish.data?.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No fish added yet.</p>}
          {fish.data?.map(f => {
            const hc = HEALTH_COLORS[f.health_status] ?? HEALTH_COLORS.healthy
            const isEditing = editingFishId === f.id
            return (
              <div key={f.id} style={{ borderBottom: '0.5px solid var(--border-sub)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {f.common_name ?? f.species_slug}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>×{f.quantity}</span>
                    {f.latin_name && (
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>{f.latin_name}</p>
                    )}
                    {f.notes && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-2)' }}>{f.notes}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <Tag bg={hc.bg} color={hc.color}>{f.health_status}</Tag>
                    <button
                      onClick={() => isEditing ? setEditingFishId(null) : startEditFish(f)}
                      style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: '0.5px solid var(--btn-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      onClick={async () => { await api.fish.remove(id!, f.id); fish.reload() }}
                      style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={11} />Remove
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <FieldLabel>Quantity</FieldLabel>
                        <input
                          type="number" min="1" value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <FieldLabel>Health status</FieldLabel>
                        <select
                          value={editHealth}
                          onChange={e => setEditHealth(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        >
                          {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <FieldLabel>Notes</FieldLabel>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="e.g. Hikari micro pellets, twice daily"
                        rows={2}
                        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                      />
                    </div>
                    <button
                      onClick={saveEditFish}
                      style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ marginTop: 16, borderTop: '0.5px solid var(--border-sub)', paddingTop: 14 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--text-label)', margin: '0 0 8px' }}>
              <Plus size={12} />Add fish
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <FieldLabel>Species</FieldLabel>
                <SpeciesAutocomplete type="fish" value={fishName} onChange={(slug, name) => { setFishSlug(slug); setFishName(name) }} />
              </div>
              <div>
                <FieldLabel>Qty</FieldLabel>
                <input type="number" value={fishQty} onChange={e => setFishQty(e.target.value)} style={{ width: 60 }} min="1" />
              </div>
              <button onClick={async () => {
                if (!fishSlug) return
                await api.fish.add(id!, { species_slug: fishSlug, quantity: Number(fishQty), notes: null })
                setFishSlug(''); setFishName(''); setFishQty('1')
                fish.reload()
              }}>Add</button>
            </div>
            <CompatibilityCheck tankId={id!} slug={fishSlug} />
          </div>
        </Card>
      )}

      {/* PLANTS TAB */}
      {tab === 'plants' && (
        <Card>
          <SectionTitle>Plants</SectionTitle>
          {plants.data?.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No plants added yet.</p>}
          {plants.data?.map(p => {
            const sc = PLANT_STATUS_COLORS[p.plant_status] ?? PLANT_STATUS_COLORS.planted
            const isEditing = editingPlantId === p.id
            return (
              <div key={p.id} style={{ borderBottom: '0.5px solid var(--border-sub)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {p.common_name ?? p.species_slug}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>×{p.quantity}</span>
                    {p.latin_name && (
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>{p.latin_name}</p>
                    )}
                    {p.notes && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-2)' }}>{p.notes}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <Tag bg={sc.bg} color={sc.color}>{p.plant_status}</Tag>
                    <button
                      onClick={() => {
                        if (isEditing) { setEditingPlantId(null); return }
                        setEditingPlantId(p.id)
                        setEditPlantQty(String(p.quantity))
                        setEditPlantStatus(p.plant_status)
                        setEditPlantNotes(p.notes ?? '')
                      }}
                      style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: '0.5px solid var(--btn-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      onClick={async () => { await api.plants.remove(id!, p.id); plants.reload() }}
                      style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={11} />Remove
                    </button>
                  </div>
                </div>
                {isEditing && (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <FieldLabel>Quantity</FieldLabel>
                        <input type="number" min="1" value={editPlantQty} onChange={e => setEditPlantQty(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <FieldLabel>Status</FieldLabel>
                        <select value={editPlantStatus} onChange={e => setEditPlantStatus(e.target.value)} style={{ width: '100%' }}>
                          <option value="planned">Planned</option>
                          <option value="planted">Planted</option>
                          <option value="removed">Removed</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <FieldLabel>Notes</FieldLabel>
                      <input value={editPlantNotes} onChange={e => setEditPlantNotes(e.target.value)} placeholder="Optional notes…" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <button
                      onClick={async () => {
                        await api.plants.update(id!, p.id, {
                          quantity: Number(editPlantQty),
                          plant_status: editPlantStatus,
                          notes: editPlantNotes || null,
                        })
                        setEditingPlantId(null)
                        plants.reload()
                      }}
                      style={{ padding: '6px 16px', borderRadius: 8, border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ marginTop: 16, borderTop: '0.5px solid var(--border-sub)', paddingTop: 14 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--text-label)', margin: '0 0 8px' }}>
              <Plus size={12} />Add plant
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <FieldLabel>Species</FieldLabel>
                <SpeciesAutocomplete type="plant" value={plantName} onChange={(slug, name) => { setPlantSlug(slug); setPlantName(name) }} />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={plantAddStatus} onChange={e => setPlantAddStatus(e.target.value)}>
                  <option value="planned">Planned</option>
                  <option value="planted">Planted</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
              <div>
                <FieldLabel>Qty</FieldLabel>
                <input type="number" value={plantQty} onChange={e => setPlantQty(e.target.value)} style={{ width: 60 }} min="1" />
              </div>
              <button onClick={async () => {
                if (!plantSlug) return
                await api.plants.add(id!, { species_slug: plantSlug, quantity: Number(plantQty), notes: null, plant_status: plantAddStatus })
                setPlantSlug(''); setPlantName(''); setPlantQty('1'); setPlantAddStatus('planted')
                plants.reload()
              }}>Add</button>
            </div>
          </div>
        </Card>
      )}

      {/* PARAMETERS TAB */}
      {tab === 'parameters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionTitle>Log parameters</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
              {([['pH', ph, setPh], ['Temp (°C)', temp, setTemp], ['Ammonia', ammonia, setAmmonia], ['Nitrite', nitrite, setNitrite], ['Nitrate', nitrate, setNitrate], ['GH (dGH)', gh, setGh], ['KH (dKH)', kh, setKh]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
                <div key={lbl}>
                  <FieldLabel>{lbl}</FieldLabel>
                  <input type="number" step="0.01" value={val} onChange={e => set(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <button
              style={{
                marginTop: 12, padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue-bg)'; e.currentTarget.style.color = 'var(--blue)' }}
              onClick={async () => {
                await api.parameters.log(id!, {
                  ph: ph ? Number(ph) : null,
                  temperature_c: temp ? Number(temp) : null,
                  ammonia_ppm: ammonia ? Number(ammonia) : null,
                  nitrite_ppm: nitrite ? Number(nitrite) : null,
                  nitrate_ppm: nitrate ? Number(nitrate) : null,
                  gh_dgh: gh ? Number(gh) : null,
                  kh_dkh: kh ? Number(kh) : null,
                  notes: null,
                })
                setPh(''); setTemp(''); setAmmonia(''); setNitrite(''); setNitrate(''); setGh(''); setKh('')
                params.reload(); alerts.reload()
              }}
            >Save reading</button>
          </Card>

          {chartData.length > 0 && (
            <>
              {[
                { key: 'ph', label: 'pH', color: '#378add', domain: [5, 9] },
                { key: 'temperature_c', label: 'Temperature (°C)', color: '#e07b3a', domain: [15, 35] },
                { key: 'ammonia_ppm', label: 'Ammonia (ppm)', color: '#c0392b', domain: [0, 2] },
                { key: 'nitrite_ppm', label: 'Nitrite (ppm)', color: '#8e44ad', domain: [0, 2] },
                { key: 'nitrate_ppm', label: 'Nitrate (ppm)', color: '#d4ac0d', domain: [0, 80] },
              ].filter(({ key }) => chartData.some((d: any) => d[key] != null)).map(({ key, label: lbl, color, domain }) => (
                <Card key={key}>
                  <SectionTitle>{lbl}</SectionTitle>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="recorded_at" tickFormatter={v => formatDate(v, dateFormat)} tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                      <YAxis domain={domain as [number, number]} tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                      <Tooltip
                        formatter={(v: number) => v.toFixed(2)}
                        labelFormatter={v => formatDateTime(v, dateFormat)}
                        contentStyle={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                      />
                      <Line type="monotone" dataKey={key} stroke={color} dot={chartData.length < 15} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* SCHEDULE TAB */}
      {tab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionTitle>Add task</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <FieldLabel>Task type</FieldLabel>
                <select value={taskType} onChange={e => setTaskType(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                  {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {!isRecurring && (
                <div>
                  <FieldLabel>Due date</FieldLabel>
                  <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-label)', marginBottom: 12 }}>
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
              Repeat this task
            </label>

            {isRecurring && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
                <div>
                  <FieldLabel>Every</FieldLabel>
                  <select value={recurWeeks} onChange={e => setRecurWeeks(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                    {[1, 2, 3, 4, 6, 8, 12].map(w => (
                      <option key={w} value={w}>{w === 1 ? 'week' : `${w} weeks`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>On</FieldLabel>
                  <select value={recurDay} onChange={e => setRecurDay(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                    {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Notes (optional)</FieldLabel>
              <input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="e.g. 30% water change" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <button onClick={addTask}>Add task</button>
          </Card>

          {pendingTasks.length > 0 && (
            <Card>
              <SectionTitle>Upcoming</SectionTitle>
              {pendingTasks.map(t => {
                const overdue = new Date(t.due_at) < new Date()
                return (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--border-sub)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.task_type}</span>
                        {overdue && <Tag compact bg="var(--red-bg)" color="var(--red)">Overdue</Tag>}
                        {t.is_recurring && (
                          <Tag compact bg="var(--blue-bg)" color="var(--blue)">
                            ↻ every {t.recur_every_weeks === 1 ? 'week' : `${t.recur_every_weeks} weeks`} on {DAY_NAMES[t.recur_day_of_week]}
                          </Tag>
                        )}
                      </div>
                      {t.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-2)' }}>{t.description}</p>}
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: overdue ? 'var(--red)' : 'var(--text-3)' }}>
                        Due {formatDate(t.due_at, dateFormat)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => completeTask(t.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer' }}>Done</button>
                      <button onClick={() => deleteTask(t.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                )
              })}
            </Card>
          )}

          {doneTasks.length > 0 && (
            <Card>
              <SectionTitle muted>Completed</SectionTitle>
              {doneTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border-sub)', opacity: 0.6 }}>
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'line-through' }}>{t.task_type}</span>
                    {t.description && <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>{t.description}</span>}
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>Completed {formatDate(t.completed_at, dateFormat)}</p>
                  </div>
                  <button onClick={() => deleteTask(t.id)} style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
            </Card>
          )}

          {tasks.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No tasks scheduled yet.</p>}
        </div>
      )}

      {/* DAILY TAB */}
      {tab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 0 }}>
            {/* Grid header */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', background: 'var(--surface-2)', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>Time</div>
              {DAY_ABBR.map((d, i) => (
                <div key={d} style={{
                  padding: '8px 4px', fontSize: 11, fontWeight: 600, textAlign: 'center',
                  color: i === todayColIndex ? 'var(--blue)' : 'var(--text-2)',
                  background: i === todayColIndex ? 'var(--blue-bg)' : 'transparent',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Scrollable rows */}
            <div>
              {Array.from({ length: 24 }, (_, hour) => {
                const rowHasTasks = [0, 1, 2, 3, 4, 5, 6].some(day => (dailyCellMap[`${day}-${hour}`]?.length ?? 0) > 0)
                return (
                  <div key={hour} style={{
                    display: 'grid',
                    gridTemplateColumns: '60px repeat(7, 1fr)',
                    borderBottom: '0.5px solid var(--border-sub)',
                    minHeight: rowHasTasks ? undefined : 30,
                    background: hour % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                  }}>
                    <div style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', alignSelf: 'flex-start', paddingTop: 8 }}>
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    {[0, 1, 2, 3, 4, 5, 6].map(day => {
                      const cellTasks = dailyCellMap[`${day}-${hour}`] ?? []
                      return (
                        <div key={day} style={{
                          padding: '4px 3px',
                          display: 'flex', flexDirection: 'column', gap: 2,
                          background: day === todayColIndex ? 'var(--blue-bg)' : 'transparent',
                        }}>
                          {cellTasks.map((task: any) => {
                            const c = task.color ?? '#1e88e5'
                            return (
                              <span key={task.id} title={`${task.name} — click × to remove`} style={{
                                display: 'flex', alignItems: 'center', gap: 2,
                                fontSize: 10, padding: '2px 5px', borderRadius: 4,
                                background: `${c}22`, color: c,
                                border: `0.5px solid ${c}55`,
                                lineHeight: 1.3, overflow: 'hidden',
                              }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {task.name}
                                </span>
                                <span
                                  onClick={() => removeDailyTask(task.id)}
                                  style={{ cursor: 'pointer', opacity: 0.7, flexShrink: 0, lineHeight: 1, fontSize: 11 }}
                                >×</span>
                              </span>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Add task form */}
          <Card>
            <SectionTitle>Add routine task</SectionTitle>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <FieldLabel>Task name</FieldLabel>
                <input
                  value={dtName} onChange={e => setDtName(e.target.value)}
                  placeholder="e.g. Morning feed, CO2 on, Lights on"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  onKeyDown={e => e.key === 'Enter' && addDailyTask()}
                />
              </div>
              <div>
                <FieldLabel>Hour</FieldLabel>
                <select value={dtHour} onChange={e => setDtHour(e.target.value)} style={{ width: 80 }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Minute</FieldLabel>
                <select value={dtMinute} onChange={e => setDtMinute(e.target.value)} style={{ width: 70 }}>
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Days</FieldLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {DAY_ABBR.map((d, i) => {
                  const on = dtDays.includes(i)
                  return (
                    <button key={d} onClick={() => setDtDays(prev => on ? prev.filter(x => x !== i) : [...prev, i].sort())}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        border: on ? '0.5px solid var(--blue-border)' : '0.5px solid var(--btn-border)',
                        background: on ? 'var(--blue-bg)' : 'transparent',
                        color: on ? 'var(--blue)' : 'var(--text-2)',
                        fontWeight: on ? 500 : 400,
                      }}
                    >{d}</button>
                  )
                })}
                <button onClick={() => setDtDays(dtDays.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6])}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-3)' }}>
                  {dtDays.length === 7 ? 'None' : 'Every day'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Colour</FieldLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {DAILY_COLORS.map(c => (
                  <button key={c} onClick={() => setDtColor(c)} style={{
                    width: 24, height: 24, borderRadius: 6, background: c, cursor: 'pointer',
                    border: dtColor === c ? `2.5px solid var(--text)` : '2px solid transparent',
                    padding: 0, flexShrink: 0,
                  }} />
                ))}
              </div>
            </div>

            <button
              onClick={addDailyTask}
              disabled={!dtName.trim() || dtDays.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                opacity: dtName.trim() && dtDays.length > 0 ? 1 : 0.45,
              }}
            >
              <Plus size={13} />Add to schedule
            </button>
          </Card>
        </div>
      )}

      {/* GALLERY TAB */}
      {tab === 'gallery' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display: 'none' }}
              onChange={handleGalleryUpload}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleGalleryUpload}
            />
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={galleryUploading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                cursor: galleryUploading ? 'not-allowed' : 'pointer', opacity: galleryUploading ? 0.6 : 1,
              }}
            >
              <Camera size={13} />{galleryUploading ? 'Uploading…' : 'Upload photos'}
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={galleryUploading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)',
                cursor: galleryUploading ? 'not-allowed' : 'pointer', opacity: galleryUploading ? 0.6 : 1,
              }}
            >
              <Camera size={13} />Take photo
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>JPEG, PNG, WebP or GIF · multiple files supported</span>
          </div>

          {galleryImages.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No photos yet. Upload some to start the gallery.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {galleryImages.map((img, idx) => (
                <div
                  key={img.filename}
                  style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: 'var(--surface-2)' }}
                >
                  <img
                    src={img.url}
                    alt=""
                    onClick={() => setLightboxIdx(idx)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteGalleryImage(img.filename) }}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6,
                      color: '#fff', cursor: 'pointer', padding: '2px 5px', lineHeight: 1, fontSize: 14,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT TAB */}
      {tab === 'edit' && <EditTankPanel tank={tank} onSave={reloadTank} />}

      {/* LIGHTBOX */}
      {lightboxIdx !== null && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightboxIdx(null)}
          onKeyDown={e => {
            if (e.key === 'Escape') setLightboxIdx(null)
            if (e.key === 'ArrowLeft' && lightboxIdx > 0) setLightboxIdx(i => i! - 1)
            if (e.key === 'ArrowRight' && lightboxIdx < galleryImages.length - 1) setLightboxIdx(i => i! + 1)
          }}
          tabIndex={-1}
          ref={el => el?.focus()}
        >
          <img
            src={galleryImages[lightboxIdx].url}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
          />
          {lightboxIdx > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => i! - 1) }}
              style={{ position: 'absolute', left: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '10px 14px', lineHeight: 0 }}>
              <Prev size={20} />
            </button>
          )}
          {lightboxIdx < galleryImages.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => i! + 1) }}
              style={{ position: 'absolute', right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '10px 14px', lineHeight: 0 }}>
              <Next size={20} />
            </button>
          )}
          <button onClick={() => setLightboxIdx(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 10px', lineHeight: 0 }}>
            <X size={18} />
          </button>
          <span style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {lightboxIdx + 1} / {galleryImages.length}
          </span>
        </div>
      )}

      {/* ALERTS TAB */}
      {tab === 'alerts' && (
        <Card>
          <SectionTitle>Alerts</SectionTitle>
          {alerts.data?.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No alerts.</p>}
          {alerts.data?.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '0.5px solid var(--border-sub)', opacity: a.acknowledged ? 0.5 : 1 }}>
              <div>
                <Tag bg={a.severity === 'danger' ? 'var(--red-bg)' : 'var(--amber-bg)'} color={a.severity === 'danger' ? 'var(--red)' : 'var(--amber)'} style={{ marginRight: 8 }}>
                  {a.severity}
                </Tag>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{a.message}</span>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>{formatDateTime(a.triggered_at, dateFormat)}</p>
              </div>
              {!a.acknowledged && (
                <button onClick={async () => { await api.alerts.acknowledge(id!, a.id); alerts.reload() }} style={{ fontSize: 11, background: 'none', border: '0.5px solid var(--btn-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}>
                  Ack
                </button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
