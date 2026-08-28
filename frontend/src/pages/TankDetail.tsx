import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Fish, Leaf, Droplets, CalendarCheck, Bell, Pencil, Trash2, Plus, ChevronLeft, ChevronDown, ListChecks, Camera, X, Utensils, BookOpen, FlaskConical, Thermometer, Lightbulb, Filter, Home, Clock, Calendar, ChevronLeft as Prev, ChevronRight as Next, Save, Target, type LucideIcon } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useTank, useFish, usePlants, useParameters, useAlerts } from '../hooks'
import { api, type Tank } from '../api/client'
import { useSettings, formatDate, formatDateTime, fromMM, toMM, fmtDim, dimInputProps } from '../context/SettingsContext'
import { Card, FieldLabel, Tag, SectionTitle, tabStyle } from '../components/ui'

type Tab = 'home' | 'inhabitants' | 'plants' | 'parameters' | 'weekly' | 'daily' | 'alerts' | 'gallery' | 'edit'

const TASK_TYPES = ['Water change', 'Filter clean', 'Fertiliser dose', 'CO2 check', 'Glass clean', 'Gravel vac', 'Other']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HEALTH_STATUSES = ['healthy', 'sick', 'quarantine', 'deceased']
const TAB_ICONS: Record<string, LucideIcon> = {
  home: Home,
  inhabitants: Fish,
  plants: Leaf,
  parameters: Droplets,
  weekly: CalendarCheck,
  daily: ListChecks,
  alerts: Bell,
  gallery: Camera,
  edit: Pencil,
}

const TAB_LABELS: Record<Tab, string> = {
  home: 'Home',
  inhabitants: 'Inhabitants',
  plants: 'Plants',
  parameters: 'Parameters',
  weekly: 'Weekly Tasks',
  daily: 'Daily Tasks',
  alerts: 'Alerts',
  gallery: 'Gallery',
  edit: 'Edit',
}

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const dateInputValue = (value: string) => {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
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

// General fishkeeping guideline ranges used to colour-code the latest-parameter cards.
// idealMin/idealMax = healthy range (green); okMin/okMax = borderline (amber); outside = danger (red).
type ParamRange = { idealMin: number; idealMax: number; okMin: number; okMax: number }
function getParamRange(key: string, waterType: string): ParamRange | null {
  const marine = waterType !== 'freshwater'
  switch (key) {
    case 'ph': return marine
      ? { idealMin: 8.0, idealMax: 8.4, okMin: 7.8, okMax: 8.6 }
      : { idealMin: 6.5, idealMax: 7.5, okMin: 6.0, okMax: 8.0 }
    case 'temperature_c': return { idealMin: 23, idealMax: 27, okMin: 20, okMax: 30 }
    case 'ammonia_ppm': return { idealMin: 0, idealMax: 0, okMin: 0, okMax: 0.25 }
    case 'nitrite_ppm': return { idealMin: 0, idealMax: 0, okMin: 0, okMax: 0.5 }
    case 'nitrate_ppm': return marine
      ? { idealMin: 0, idealMax: 5, okMin: 0, okMax: 20 }
      : { idealMin: 0, idealMax: 20, okMin: 0, okMax: 40 }
    case 'gh_dgh': return { idealMin: 4, idealMax: 12, okMin: 2, okMax: 20 }
    case 'kh_dkh': return { idealMin: 3, idealMax: 8, okMin: 1, okMax: 12 }
    case 'salinity_ppt': return { idealMin: 32, idealMax: 35, okMin: 28, okMax: 38 }
    case 'specific_gravity': return { idealMin: 1.023, idealMax: 1.025, okMin: 1.020, okMax: 1.026 }
    default: return null
  }
}
type ParamStatus = 'ideal' | 'ok' | 'bad'
function getParamStatus(key: string, value: number, waterType: string): ParamStatus | null {
  const r = getParamRange(key, waterType)
  if (!r) return null
  if (value >= r.idealMin && value <= r.idealMax) return 'ideal'
  if (value >= r.okMin && value <= r.okMax) return 'ok'
  return 'bad'
}
const PARAM_STATUS_COLORS: Record<ParamStatus, { bg: string; color: string; border: string }> = {
  ideal: { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-border)' },
  ok:    { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'var(--amber-border)' },
  bad:   { bg: 'var(--red-bg)',   color: 'var(--red)',   border: 'var(--red-border)' },
}

const FISH_STATUSES = ['planned', 'added', 'removed']
const FISH_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  planned: { bg: 'var(--blue-bg)',   color: 'var(--blue)'   },
  added:   { bg: 'var(--green-bg)',  color: 'var(--green)'  },
  removed: { bg: 'var(--tag-bg)',    color: 'var(--text-2)' },
}

function TankDimensionWireframe({ tank, unitSystem }: { tank: Tank; unitSystem: Parameters<typeof fmtDim>[1] }) {
  const width = fmtDim(tank.width_mm, unitSystem)
  const height = fmtDim(tank.height_mm, unitSystem)
  const depth = fmtDim(tank.depth_mm, unitSystem)
  const stroke = 'var(--blue)'
  const faintStroke = 'var(--blue-border)'

  return (
    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', overflow: 'hidden' }}>
      <svg viewBox="0 0 640 360" role="img" aria-label={`Tank wireframe: width ${width}, depth ${depth}, height ${height}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
        <g fill="none" stroke={stroke} strokeWidth="2">
          <path d="M170 120 L460 120 L460 280 L170 280 Z" fill="var(--surface)" fillOpacity="0.72" />
          <path d="M170 120 L250 65 L540 65 L460 120 Z" fill="var(--surface)" fillOpacity="0.32" />
          <path d="M460 120 L540 65 L540 225 L460 280 Z" fill="var(--surface-2)" fillOpacity="0.6" />
          <path d="M170 280 L250 225 L540 225" stroke={faintStroke} strokeDasharray="6 6" />
          <path d="M170 120 L250 65 M170 280 L250 225" stroke={faintStroke} />
        </g>
        <g fill="none" stroke={stroke} strokeWidth="1.5">
          <path d="M170 293 L460 293 M170 286 L170 300 M460 286 L460 300" />
          <path d="M475 292 L555 237 M475 286 L475 298 M555 231 L555 243" />
          <path d="M157 120 L157 280 M150 120 L164 120 M150 280 L164 280" />
        </g>
        <g fill="var(--text)" fontFamily="system-ui, sans-serif" textAnchor="middle">
          <text x="315" y="313" fontSize="15" fontWeight="600">Width: {width}</text>
          <text x="531" y="288" fontSize="15" fontWeight="600" transform="rotate(-34.5 531 288)">Depth: {depth}</text>
          <text x="137" y="205" fontSize="15" fontWeight="600" transform="rotate(-90 137 205)">Height: {height}</text>
        </g>
      </svg>
    </div>
  )
}

function DatePickerField({ value, onChange, isMobile }: { value: string; onChange: (v: string) => void; isMobile: boolean }) {
  const { dateFormat } = useSettings()
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? new Date(`${value}T00:00:00`) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const pad = (n: number) => String(n).padStart(2, '0')
  const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const selected = value ? new Date(`${value}T00:00:00`) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const monthLabel = viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div style={{ position: 'relative', width: isMobile ? '100%' : undefined }}>
      <button
        type="button"
        onClick={() => {
          if (!open && value) setViewMonth(new Date(new Date(`${value}T00:00:00`).getFullYear(), new Date(`${value}T00:00:00`).getMonth(), 1))
          setOpen(o => !o)
        }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          width: '100%', boxSizing: 'border-box',
          padding: '6px 10px', borderRadius: 8, border: '0.5px solid var(--btn-border)',
          background: 'var(--surface)', color: value ? 'var(--text)' : 'var(--text-3)', fontSize: 13, cursor: 'pointer',
        }}
      >
        <span>{value ? formatDate(value, dateFormat) : 'Select date'}</span>
        <Calendar size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: isMobile ? 0 : 'auto', zIndex: 100,
            width: isMobile ? '100%' : 250,
            background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)', padding: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <button type="button" onClick={() => setViewMonth(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4, lineHeight: 0 }}>
                <Prev size={16} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{monthLabel}</span>
              <button type="button" onClick={() => setViewMonth(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4, lineHeight: 0 }}>
                <Next size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((d, i) => {
                if (!d) return <div key={i} />
                const iso = toIso(d)
                const isSelected = selected != null && d.getTime() === selected.getTime()
                const isToday = d.getTime() === today.getTime()
                return (
                  <button
                    key={i} type="button"
                    onClick={() => { onChange(iso); setOpen(false) }}
                    style={{
                      padding: '6px 0', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                      border: isSelected ? '0.5px solid var(--blue-border)' : isToday ? '0.5px solid var(--btn-border)' : '0.5px solid transparent',
                      background: isSelected ? 'var(--blue-bg)' : 'transparent',
                      color: isSelected ? 'var(--blue)' : 'var(--text)',
                      fontWeight: isSelected ? 500 : 400,
                    }}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

type StripEntry = { value: number; color: string; label?: string | number }

// API Master Test Kit — liquid drop tests
const TEST_STRIP_MASTER: Record<string, StripEntry[]> = {
  'pH': [
    { value: 6.0, color: '#f5e03a' },
    { value: 6.4, color: '#d4c820' },
    { value: 6.8, color: '#aaba20' },
    { value: 7.0, color: '#82aa20' },
    { value: 7.2, color: '#5e9c20' },
    { value: 7.6, color: '#3e8820' },
    { value: 8.0, color: '#4a80cc' },
    { value: 8.2, color: '#3268b8' },
    { value: 8.4, color: '#1e50a0' },
  ],
  'Ammonia': [
    { value: 0,    color: '#f0e040' },
    { value: 0.25, color: '#c8d43c' },
    { value: 0.50, color: '#9cc438' },
    { value: 1.0,  color: '#70b034' },
    { value: 2.0,  color: '#4a9430' },
    { value: 4.0,  color: '#2a7428' },
    { value: 8.0,  color: '#105420' },
  ],
  'Nitrite': [
    { value: 0,    color: '#f8eef4' },
    { value: 0.25, color: '#f0b8d8' },
    { value: 0.50, color: '#e888bc' },
    { value: 1.0,  color: '#d85ca0' },
    { value: 2.0,  color: '#c03080' },
    { value: 5.0,  color: '#9a105c' },
  ],
  'Nitrate': [
    { value: 0,   color: '#f0e840' },
    { value: 5,   color: '#f0c838' },
    { value: 10,  color: '#e89838' },
    { value: 20,  color: '#e06c38' },
    { value: 40,  color: '#d44038' },
    { value: 80,  color: '#c01828' },
    { value: 160, color: '#880c18' },
  ],
  'GH (dGH)': [
    { value: 0,  color: '#e8503c' },
    { value: 1,  color: '#d0e890' },
    { value: 2,  color: '#b0d870' },
    { value: 3,  color: '#90c850' },
    { value: 6,  color: '#68a838' },
    { value: 10, color: '#448828' },
    { value: 14, color: '#2a6818' },
    { value: 21, color: '#144808' },
  ],
  'KH (dKH)': [
    { value: 0,  color: '#f0e440' },
    { value: 1,  color: '#c8daf0' },
    { value: 2,  color: '#98c0e8' },
    { value: 3,  color: '#70a8e0' },
    { value: 4,  color: '#4890d8' },
    { value: 6,  color: '#2870c0' },
    { value: 8,  color: '#1450a0' },
    { value: 10, color: '#083480' },
    { value: 12, color: '#041c60' },
  ],
  'KH / Alk': [
    { value: 0,  color: '#f0e440' },
    { value: 1,  color: '#c8daf0' },
    { value: 2,  color: '#98c0e8' },
    { value: 3,  color: '#70a8e0' },
    { value: 4,  color: '#4890d8' },
    { value: 6,  color: '#2870c0' },
    { value: 8,  color: '#1450a0' },
    { value: 10, color: '#083480' },
    { value: 12, color: '#041c60' },
  ],
}

// API 5-in-1 Test Strips — dip strips. GH/KH shown in ppm (tube label) but stored as dGH/dKH.
const PPM_TO_DEG = 17.848
const TEST_STRIP_5IN1: Record<string, StripEntry[]> = {
  'pH': [
    { value: 6.0, color: '#f0d040' },
    { value: 6.5, color: '#d4c028' },
    { value: 7.0, color: '#9ab424' },
    { value: 7.5, color: '#78a020' },
    { value: 8.0, color: '#5090c0' },
    { value: 8.5, color: '#3070a8' },
    { value: 9.0, color: '#1a5090' },
  ],
  'Nitrite': [
    { value: 0,   color: '#faf0f4' },
    { value: 0.5, color: '#f0c0d4' },
    { value: 1.0, color: '#e090b4' },
    { value: 3.0, color: '#d05090' },
    { value: 5.0, color: '#b02868' },
    { value: 10,  color: '#880840' },
  ],
  'Nitrate': [
    { value: 0,   color: '#f0e840' },
    { value: 20,  color: '#f0c038' },
    { value: 40,  color: '#e89038' },
    { value: 80,  color: '#e05830' },
    { value: 160, color: '#c82020' },
    { value: 200, color: '#a00818' },
  ],
  // value stored as dGH, label shows ppm from the tube
  'GH (dGH)': [
    { value: 0,                         color: '#f4f0e0', label: '0 ppm'   },
    { value: +(30  / PPM_TO_DEG).toFixed(1), color: '#c8e898', label: '30 ppm'  },
    { value: +(60  / PPM_TO_DEG).toFixed(1), color: '#98d068', label: '60 ppm'  },
    { value: +(120 / PPM_TO_DEG).toFixed(1), color: '#60a838', label: '120 ppm' },
    { value: +(180 / PPM_TO_DEG).toFixed(1), color: '#286820', label: '180 ppm' },
  ],
  // value stored as dKH, label shows ppm from the tube
  'KH (dKH)': [
    { value: 0,                          color: '#f0e048', label: '0 ppm'   },
    { value: +(40  / PPM_TO_DEG).toFixed(1), color: '#b8d8f0', label: '40 ppm'  },
    { value: +(80  / PPM_TO_DEG).toFixed(1), color: '#88b8e0', label: '80 ppm'  },
    { value: +(120 / PPM_TO_DEG).toFixed(1), color: '#5898d0', label: '120 ppm' },
    { value: +(180 / PPM_TO_DEG).toFixed(1), color: '#2878c0', label: '180 ppm' },
    { value: +(240 / PPM_TO_DEG).toFixed(1), color: '#0c5098', label: '240 ppm' },
  ],
  'KH / Alk': [
    { value: 0,                          color: '#f0e048', label: '0 ppm'   },
    { value: +(40  / PPM_TO_DEG).toFixed(1), color: '#b8d8f0', label: '40 ppm'  },
    { value: +(80  / PPM_TO_DEG).toFixed(1), color: '#88b8e0', label: '80 ppm'  },
    { value: +(120 / PPM_TO_DEG).toFixed(1), color: '#5898d0', label: '120 ppm' },
    { value: +(180 / PPM_TO_DEG).toFixed(1), color: '#2878c0', label: '180 ppm' },
    { value: +(240 / PPM_TO_DEG).toFixed(1), color: '#0c5098', label: '240 ppm' },
  ],
}

const TEST_STRIP_VALUES = TEST_STRIP_MASTER

// --- Species autocomplete ---
function SpeciesAutocomplete({ type, value, onChange }: {
  type: 'fish' | 'plant' | 'invertebrate' | 'amphibian'
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
  const navigate = useNavigate()

  const [name, setName] = useState(tank.name)
  const [volume, setVolume] = useState(String(tank.volume_litres))
  const [waterType, setWaterType] = useState(tank.water_type ?? 'freshwater')
  const [substrate, setSubstrate] = useState(tank.substrate ?? '')
  const [hasLighting, setHasLighting] = useState(tank.has_lighting)
  const [lightIntensity, setLightIntensity] = useState(tank.light_intensity ?? '')
  const [lightWatts, setLightWatts] = useState(tank.light_watts != null ? String(tank.light_watts) : '')
  const [lightTechnology, setLightTechnology] = useState(tank.light_technology ?? '')
  const [filterFlow, setFilterFlow] = useState(tank.filter_flow_lph != null ? String(tank.filter_flow_lph) : '')
  const [hasFilter, setHasFilter] = useState(tank.has_filter)
  const [width, setWidth] = useState(tank.width_mm != null ? String(fromMM(tank.width_mm, unitSystem)) : '')
  const [height, setHeight] = useState(tank.height_mm != null ? String(fromMM(tank.height_mm, unitSystem)) : '')
  const [depth, setDepth] = useState(tank.depth_mm != null ? String(fromMM(tank.depth_mm, unitSystem)) : '')
  const [co2, setCo2] = useState(tank.co2_injection)
  const [co2Source, setCo2Source] = useState(tank.co2_source ?? '')
  const [co2Method, setCo2Method] = useState(tank.co2_method ?? '')
  const [hasHeater, setHasHeater] = useState(tank.has_heater)
  const [heaterWatts, setHeaterWatts] = useState(tank.heater_watts != null ? String(tank.heater_watts) : '')
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  async function save() {
    await fetch(`/api/tanks/${tank.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, volume_litres: Number(volume),
        water_type: waterType,
        substrate: substrate || null,
        has_filter: hasFilter,
        filter_flow_lph: hasFilter && filterFlow ? Number(filterFlow) : null,
        width_mm: width ? toMM(Number(width), unitSystem) : null,
        height_mm: height ? toMM(Number(height), unitSystem) : null,
        depth_mm: depth ? toMM(Number(depth), unitSystem) : null,
        co2_injection: co2,
        co2_source: co2 && co2Source ? co2Source : null,
        co2_method: co2 && co2Method ? co2Method : null,
        has_heater: hasHeater,
        heater_watts: hasHeater && heaterWatts ? Number(heaterWatts) : null,
        has_lighting: hasLighting,
        light_intensity: hasLighting && lightIntensity ? lightIntensity : null,
        light_watts: hasLighting && lightWatts ? Number(lightWatts) : null,
        light_technology: hasLighting && lightTechnology ? lightTechnology : null,
        setup_date: tank.setup_date,
      }),
    })
    onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <SectionTitle>Edit Tank</SectionTitle>
      <div style={{ marginBottom: 12 }}>
        <FieldLabel>Tank Name</FieldLabel>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
        {([['Width', width, setWidth], ['Height', height, setHeight], ['Depth', depth, setDepth]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
          <div key={lbl}>
            <FieldLabel>{lbl} ({unitSystem})</FieldLabel>
            <input type="number" min="0" step={dp.step} placeholder={dp.placeholder}
              value={val} onChange={e => set(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        ))}
        <div>
          <FieldLabel>Volume (Litres)</FieldLabel>
          <input type="number" min="0"
            value={volume} onChange={e => setVolume(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <FieldLabel>Water Type</FieldLabel>
        <select value={waterType} onChange={e => setWaterType(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
          <option value="freshwater">Freshwater</option>
          <option value="saltwater">Saltwater / Marine</option>
          <option value="brackish">Brackish</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <FieldLabel>Substrate</FieldLabel>
        <input value={substrate} onChange={e => setSubstrate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => { const next = !hasFilter; setHasFilter(next); if (!next) setFilterFlow('') }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: `0.5px solid ${hasFilter ? 'var(--blue-border)' : 'var(--btn-border)'}`,
            background: hasFilter ? 'var(--blue-bg)' : 'transparent',
            color: hasFilter ? 'var(--blue)' : 'var(--text-3)',
            opacity: hasFilter ? 1 : 0.55,
          }}
        >
          <Filter size={14} /> Filter
        </button>
        <button
          type="button"
          onClick={() => { const next = !co2; setCo2(next); if (!next) { setCo2Source(''); setCo2Method('') } }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: `0.5px solid ${co2 ? 'var(--green-border)' : 'var(--btn-border)'}`,
            background: co2 ? 'var(--green-bg)' : 'transparent',
            color: co2 ? 'var(--green)' : 'var(--text-3)',
            opacity: co2 ? 1 : 0.55,
          }}
        >
          <FlaskConical size={14} /> CO₂ Injection
        </button>
        <button
          type="button"
          onClick={() => { const next = !hasHeater; setHasHeater(next); if (!next) setHeaterWatts('') }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: `0.5px solid ${hasHeater ? 'var(--orange-border, color-mix(in srgb, var(--orange, #ef6c00) 30%, transparent))' : 'var(--btn-border)'}`,
            background: hasHeater ? 'var(--orange-bg)' : 'transparent',
            color: hasHeater ? 'var(--orange, #ef6c00)' : 'var(--text-3)',
            opacity: hasHeater ? 1 : 0.55,
          }}
        >
          <Thermometer size={14} /> Heater
        </button>
        <button
          type="button"
          onClick={() => { const next = !hasLighting; setHasLighting(next); if (!next) { setLightIntensity(''); setLightWatts(''); setLightTechnology('') } }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: `0.5px solid ${hasLighting ? 'var(--amber-border)' : 'var(--btn-border)'}`,
            background: hasLighting ? 'var(--amber-bg)' : 'transparent',
            color: hasLighting ? 'var(--amber)' : 'var(--text-3)',
            opacity: hasLighting ? 1 : 0.55,
          }}
        >
          <Lightbulb size={14} /> Lighting
        </button>
      </div>
      {hasFilter && (
        <div className="unit-field" style={{ marginBottom: 12 }}>
          <input
            type="number" min="1" placeholder="Flow rate"
            value={filterFlow} onChange={e => setFilterFlow(e.target.value)}
          />
          <span>L/h</span>
        </div>
      )}
      {co2 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
          <select value={co2Source} onChange={e => setCo2Source(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
            <option value="">Source</option>
            <option value="Pressurized CO2">Pressurized CO2</option>
            <option value="Yeast">Yeast</option>
            <option value="Chemical">Chemical</option>
            <option value="Liquid Carbon">Liquid Carbon</option>
          </select>
          <select value={co2Method} onChange={e => setCo2Method(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
            <option value="">Injection method</option>
            <option value="In-line with Filter">In-line with Filter</option>
            <option value="CO2 Diffuser">CO2 Diffuser</option>
          </select>
        </div>
      )}
      {hasHeater && (
        <div className="unit-field" style={{ marginBottom: 12 }}>
          <input
            type="number" min="1" placeholder="Watts"
            value={heaterWatts} onChange={e => setHeaterWatts(e.target.value)}
          />
          <span>W</span>
        </div>
      )}
      {hasLighting && (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginBottom: 12, alignItems: isMobile ? 'stretch' : 'center' }}>
          <select value={lightIntensity} onChange={e => setLightIntensity(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
            <option value="">Intensity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <div className="unit-field" style={{ flex: 1 }}>
            <input
              type="number" min="1" placeholder="Watts"
              value={lightWatts} onChange={e => setLightWatts(e.target.value)}
            />
            <span>W</span>
          </div>
          <select value={lightTechnology} onChange={e => setLightTechnology(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
            <option value="">Technology</option>
            <option value="LED">LED</option>
            <option value="T5">T5 Fluorescent</option>
            <option value="T8">T8 Fluorescent</option>
            <option value="Metal Halide">Metal Halide</option>
            <option value="CFL">CFL</option>
            <option value="Other">Other</option>
          </select>
        </div>
      )}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '0.5px solid var(--border)' }}>
        {!showDeleteConfirm ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '0.5px solid var(--red-border)', background: 'transparent', color: 'var(--red)', fontSize: 13, cursor: 'pointer', width: isMobile ? '100%' : undefined, boxSizing: 'border-box' }}
            >
              <Trash2 size={14} /> Delete Tank
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isMobile ? '100%' : undefined }}>
              <button onClick={save} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: isMobile ? '100%' : undefined, boxSizing: 'border-box' }}><Save size={14} /> Save changes</button>
              {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved ✓</span>}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 500, color: 'var(--red)' }}>Delete "{tank.name}"?</p>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--red)', opacity: 0.8 }}>
              This will permanently remove the tank and all its fish, plants, water parameters, maintenance tasks, and journal entries. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  await fetch(`/api/tanks/${tank.id}`, { method: 'DELETE' })
                  navigate('/')
                }}
                style={{ padding: '6px 16px', borderRadius: 8, border: '0.5px solid var(--red-border)', background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
            </div>
          </div>
        )}
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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    return t && t in TAB_ICONS ? (t as Tab) : 'home'
  })

  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    }, { replace: true })
  }, [tab])
  const fromRoomId = searchParams.get('fromRoom')
  const fromRoomName = searchParams.get('fromRoomName')
  const { data: tank, reload: reloadTank } = useTank(id!)
  const fish = useFish(id!)
  const plants = usePlants(id!)
  const params = useParameters(id!, 100)
  const alerts = useAlerts(id!)
  const { dateFormat, unitSystem, feedingAmountPresets } = useSettings()

  const [showAddFish, setShowAddFish] = useState(false)
  const [showAddPlant, setShowAddPlant] = useState(false)

  const [addOrganismType, setAddOrganismType] = useState<'fish' | 'invertebrate' | 'amphibian'>('fish')
  const [fishSlug, setFishSlug] = useState('')
  const [fishName, setFishName] = useState('')
  const [fishQty, setFishQty] = useState('1')
  const [fishAddStatus, setFishAddStatus] = useState('added')

  const [editingFishId, setEditingFishId] = useState<string | null>(null)
  const [editOrganismType, setEditOrganismType] = useState('fish')
  const [editQty, setEditQty] = useState('')
  const [editFishStatus, setEditFishStatus] = useState('added')
  const [editHealth, setEditHealth] = useState('')
  const [editFoodTypes, setEditFoodTypes] = useState('')
  const [editFeedingTimes, setEditFeedingTimes] = useState('')
  const [editFeedingAmount, setEditFeedingAmount] = useState('')
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
  const [salinity, setSalinity] = useState('')
  const [sg, setSg] = useState('')
  const [stripModal, setStripModal] = useState<{ label: string; setter: (v: string) => void } | null>(null)
  const [stripKit, setStripKit] = useState<'master' | '5in1'>('master')
  const [hiddenOptimumLines, setHiddenOptimumLines] = useState<Record<string, boolean>>({})

  const [dailyTasks, setDailyTasks] = useState<any[]>([])
  const [dtName, setDtName] = useState('')
  const [dtHour, setDtHour] = useState('8')
  const [dtMinute, setDtMinute] = useState('0')
  const [dtDays, setDtDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [dtTimePickerOpen, setDtTimePickerOpen] = useState(false)
  const [dtColor, setDtColor] = useState(DAILY_COLORS[0])

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  const [isCompactTabs, setIsCompactTabs] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const [tabMenuOpen, setTabMenuOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const handler = (e: MediaQueryListEvent) => setIsCompactTabs(e.matches)
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
  const [skipTaskId, setSkipTaskId] = useState<string | null>(null)
  const [skipTimes, setSkipTimes] = useState('1')
  const [editingCompletedTaskId, setEditingCompletedTaskId] = useState<string | null>(null)
  const [editingCompletedDate, setEditingCompletedDate] = useState('')
  const [completedExpanded, setCompletedExpanded] = useState(false)

  useEffect(() => {
    if (tab === 'weekly' || tab === 'home') loadTasks()
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
    if (!taskDue) return
    const body: any = { task_type: taskType, description: taskDesc || null }
    if (isRecurring) {
      body.is_recurring = true
      body.recur_every_weeks = Number(recurWeeks)
      body.recur_day_of_week = Number(recurDay)
    }
    body.due_at = new Date(taskDue).toISOString()
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

  async function skipTask(taskId: string) {
    const times = Math.max(1, Number(skipTimes) || 1)
    await api.maintenance.skip(id!, taskId, times)
    setSkipTaskId(null)
    setSkipTimes('1')
    loadTasks()
  }

  function startEditCompletedDate(task: any) {
    setEditingCompletedTaskId(task.id)
    setEditingCompletedDate(dateInputValue(task.completed_at))
  }

  async function saveCompletedDate(taskId: string) {
    if (!editingCompletedDate) return
    await api.maintenance.updateCompletedDate(id!, taskId, new Date(`${editingCompletedDate}T12:00:00`).toISOString())
    setEditingCompletedTaskId(null)
    setEditingCompletedDate('')
    loadTasks()
  }

  function startEditFish(f: { id: string; quantity: number; organism_type: string; fish_status: string; health_status: string; food_types: string | null; feeding_times_per_day: number | null; feeding_amount: string | null; notes: string | null }) {
    setEditingFishId(f.id)
    setEditOrganismType(f.organism_type)
    setEditQty(String(f.quantity))
    setEditFishStatus(f.fish_status)
    setEditHealth(f.health_status)
    setEditFoodTypes(f.food_types ?? '')
    setEditFeedingTimes(f.feeding_times_per_day ? String(f.feeding_times_per_day) : '')
    setEditFeedingAmount(f.feeding_amount ?? '')
    setEditNotes(f.notes ?? '')
  }

  async function saveEditFish() {
    if (!editingFishId) return
    await api.fish.update(id!, editingFishId, {
      quantity: Number(editQty),
      organism_type: editOrganismType,
      fish_status: editFishStatus,
      health_status: editHealth,
      food_types: editFoodTypes || null,
      feeding_times_per_day: editFeedingTimes ? Number(editFeedingTimes) : null,
      feeding_amount: editFeedingAmount || null,
      notes: editNotes || null,
    })
    setEditingFishId(null)
    fish.reload()
  }

  function openCarersGuide(tank: Tank, inhabitants: typeof fish.data, plantList: typeof plants.data, pendingTaskList: typeof tasks) {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const byType: Record<string, NonNullable<typeof fish.data>> = {}
    ;(inhabitants ?? []).filter(f => f.fish_status === 'added').forEach(f => {
      if (!byType[f.organism_type]) byType[f.organism_type] = []
      byType[f.organism_type].push(f)
    })
    const typeLabel: Record<string, string> = { fish: 'Fish', invertebrate: 'Invertebrates', amphibian: 'Amphibians' }

    const feedingRows = Object.entries(byType).flatMap(([oType, entries]) => {
      const grouped = new Map<string, NonNullable<typeof fish.data>>()
      entries.forEach(f => {
        const key = f.species_slug
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(f)
      })
      return [...grouped.entries()].map(([, rows]) => {
        const first = rows[0]
        const totalQty = rows.reduce((s, r) => s + r.quantity, 0)
        const foodTypes = first.food_types ?? '—'
        const feedTimes = first.feeding_times_per_day ? `${first.feeding_times_per_day}× daily` : '—'
        return `
          <tr>
            <td>${first.common_name ?? first.species_slug}${first.latin_name ? `<br><em style="font-size:11px;color:#888">${first.latin_name}</em>` : ''}</td>
            <td>${typeLabel[oType] ?? oType}</td>
            <td>${totalQty}</td>
            <td>${foodTypes}</td>
            <td>${feedTimes}</td>
            <td>${first.notes ?? '—'}</td>
          </tr>`
      })
    }).join('')

    const taskRows = (pendingTaskList ?? []).map(t => `
      <tr>
        <td>${t.task_type}</td>
        <td>${t.description ?? '—'}</td>
        <td>${t.due_at ? new Date(t.due_at).toLocaleDateString('en-GB') : '—'}</td>
        <td>${t.is_recurring ? `Every ${t.recur_every_weeks ?? '?'} week(s)` : 'One-off'}</td>
      </tr>`).join('')

    const plantRows = (plantList ?? []).filter(p => p.plant_status === 'planted').map(p => `
      <tr><td>${p.common_name ?? p.species_slug}</td><td>${p.quantity}</td><td>${p.notes ?? '—'}</td></tr>`).join('')

    const heaterInfo = tank.has_heater ? (tank.heater_watts ? `${tank.heater_watts}W heater` : 'Yes') : 'No'

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Carer's Guide — ${tank.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px 40px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
  h2 { font-size: 15px; font-weight: 600; margin: 28px 0 10px; padding-bottom: 4px; border-bottom: 1.5px solid #e0e0e0; color: #333; }
  .meta { font-size: 12px; color: #888; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 7px 10px; background: #f5f5f5; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 1px solid #e0e0e0; }
  td { padding: 8px 10px; border-bottom: 0.5px solid #eee; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .overview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-bottom: 8px; }
  .stat { background: #f8f8f8; border-radius: 8px; padding: 10px 12px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 2px; }
  .stat-value { font-size: 14px; font-weight: 600; color: #1a1a1a; }
  .tip { background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #7d5a00; margin-top: 24px; }
  @media print {
    body { padding: 20px; }
    button { display: none; }
  }
</style>
</head>
<body>
<h1>${tank.name}</h1>
<p class="meta">Carer's guide generated ${today}</p>

<h2>Tank Overview</h2>
<div class="overview-grid">
  <div class="stat"><div class="stat-label">Volume</div><div class="stat-value">${tank.volume_litres}L</div></div>
  <div class="stat"><div class="stat-label">Water Type</div><div class="stat-value">${tank.water_type.charAt(0).toUpperCase() + tank.water_type.slice(1)}</div></div>
  <div class="stat"><div class="stat-label">Heater</div><div class="stat-value">${heaterInfo}</div></div>
  <div class="stat"><div class="stat-label">CO₂</div><div class="stat-value">${tank.co2_injection ? 'Yes' : 'No'}</div></div>
  ${tank.lighting ? `<div class="stat"><div class="stat-label">Lighting</div><div class="stat-value">${tank.lighting}</div></div>` : ''}
  ${tank.filter_flow_lph ? `<div class="stat"><div class="stat-label">Filter</div><div class="stat-value">${tank.filter_flow_lph} L/h</div></div>` : ''}
</div>

${feedingRows ? `<h2>Feeding Schedule</h2>
<table>
  <thead><tr><th>Species</th><th>Type</th><th>Qty</th><th>Food</th><th>Frequency</th><th>Notes</th></tr></thead>
  <tbody>${feedingRows}</tbody>
</table>` : ''}

${plantRows ? `<h2>Plants</h2>
<table>
  <thead><tr><th>Species</th><th>Qty</th><th>Notes</th></tr></thead>
  <tbody>${plantRows}</tbody>
</table>` : ''}

${taskRows ? `<h2>Pending Maintenance</h2>
<table>
  <thead><tr><th>Task</th><th>Description</th><th>Due</th><th>Recurrence</th></tr></thead>
  <tbody>${taskRows}</tbody>
</table>` : ''}

<div class="tip">💡 If you have any questions, contact the tank owner before making changes to feeding, equipment, or water chemistry.</div>

<div class="no-print" style="margin-top:32px;text-align:center">
  <button onclick="window.print()" style="padding:10px 28px;font-size:14px;font-weight:600;border-radius:8px;border:1.5px solid #1e88e5;background:#e3f2fd;color:#1e88e5;cursor:pointer;">🖨️ Print / Save as PDF</button>
</div>
</body>
</html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
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
  const hasParamInput = [ph, temp, ammonia, nitrite, nitrate, gh, kh, salinity, sg].some(v => v.trim() !== '')

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const inhabitantCounts = {
    fish: (fish.data ?? []).filter(f => f.organism_type === 'fish').reduce((sum, f) => sum + f.quantity, 0),
    invertebrate: (fish.data ?? []).filter(f => f.organism_type === 'invertebrate').reduce((sum, f) => sum + f.quantity, 0),
    amphibian: (fish.data ?? []).filter(f => f.organism_type === 'amphibian').reduce((sum, f) => sum + f.quantity, 0),
  }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const overdueTasks = pendingTasks.filter(t => { const d = new Date(t.due_at); d.setHours(0, 0, 0, 0); return d < todayStart })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, display: 'flex' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', padding: '6px 10px', border: '0.5px solid var(--btn-border)', borderRadius: 7, background: 'transparent' }}>
              <ChevronLeft size={13} />All tanks
            </Link>
          </div>
          {fromRoomId && (
            <button
              onClick={() => navigate(`/rooms/${fromRoomId}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--blue)', padding: '6px 10px', border: '0.5px solid var(--blue-border)', borderRadius: 7, background: 'var(--blue-bg)', cursor: 'pointer' }}
            >
              <ChevronLeft size={13} />Back to {fromRoomName || 'room'}
            </button>
          )}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => openCarersGuide(tank, fish.data ?? [], plants.data ?? [], tasks.filter(t => t.status === 'pending'))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}
            >
              <BookOpen size={13} />Carer's Guide
            </button>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {tank.water_type && tank.water_type !== 'freshwater' && (() => {
              const styles: Record<string, { bg: string; color: string; label: string }> = {
                saltwater: { bg: 'var(--blue-bg)',  color: 'var(--blue)',  label: 'Saltwater' },
                brackish:  { bg: 'var(--green-bg)', color: 'var(--green)', label: 'Brackish'  },
              }
              const s = styles[tank.water_type]
              return s ? <Tag bg={s.bg} color={s.color}>{s.label}</Tag> : null
            })()}
          </div>
          {tank.co2_injection && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {tank.co2_injection && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6, background: 'var(--green-bg)', color: 'var(--green)', border: '0.5px solid var(--green-border)' }}>
                  <FlaskConical size={11} />CO₂
                </span>
              )}
            </div>
          )}
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

      {isMobile ? (
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <button
            onClick={() => setTabMenuOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', width: '100%',
              fontSize: 14, fontWeight: 500, padding: '10px 12px',
              borderRadius: 10, border: '0.5px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
            }}
          >
            {(() => {
              const Icon = TAB_ICONS[tab]
              return <Icon size={16} style={{ flexShrink: 0 }} />
            })()}
            <span style={{ marginLeft: 8, flex: 1, textAlign: 'left' }}>{TAB_LABELS[tab]}</span>
            <ChevronDown size={16} style={{ flexShrink: 0, transform: tabMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {tabMenuOpen && (
            <>
              <div onClick={() => setTabMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.16)', overflow: 'hidden',
              }}>
                {(['home', 'inhabitants', 'plants', 'parameters', 'daily', 'weekly', 'alerts', 'gallery', 'edit'] as Tab[]).map(t => {
                  const Icon = TAB_ICONS[t]
                  const label = TAB_LABELS[t]
                  const badge =
                    t === 'alerts' && unackAlerts.length > 0 ? `${unackAlerts.length}` :
                    t === 'weekly' && overdueTasks.length > 0 ? `${overdueTasks.length}` :
                    null
                  return (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setTabMenuOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '10px 12px', fontSize: 14, textAlign: 'left', cursor: 'pointer',
                        border: 'none', borderBottom: '0.5px solid var(--border-sub)',
                        background: tab === t ? 'var(--blue-bg)' : 'transparent',
                        color: tab === t ? 'var(--blue)' : 'var(--text)',
                        fontWeight: tab === t ? 500 : 400,
                      }}
                    >
                      <Icon size={16} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{label}</span>
                      {badge && (
                        <span style={{
                          background: t === 'alerts' ? '#e24b4a' : 'var(--red-border)', color: '#fff', borderRadius: 10,
                          fontSize: 10, padding: '1px 6px', lineHeight: 1.4,
                        }}>
                          {badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: isCompactTabs ? 2 : 4, width: 'fit-content', margin: '0 auto 20px' }}>
          {(['home', 'inhabitants', 'plants', 'parameters', 'daily', 'weekly', 'alerts', 'gallery', 'edit'] as Tab[]).map(t => {
            const Icon = TAB_ICONS[t]
            const label = TAB_LABELS[t]
            return (
              <button
                key={t}
                title={label}
                onClick={() => setTab(t)}
                style={{
                  ...tabStyle(tab === t), position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: isCompactTabs ? 3 : 5, padding: isCompactTabs ? '6px 7px' : '6px 12px', fontSize: isCompactTabs ? 12 : 13,
                }}
              >
                <Icon size={isCompactTabs ? 12 : 13} />
                {label}
                {t === 'alerts' && unackAlerts.length > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: '#e24b4a', color: '#fff', borderRadius: 10,
                    fontSize: 9, padding: '1px 4px', lineHeight: 1.4,
                  }}>
                    {unackAlerts.length}
                  </span>
                )}
                {t === 'weekly' && overdueTasks.length > 0 && (
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
      )}

      {/* HOME TAB */}
      {tab === 'home' && (
        <Card style={{ display: 'grid', gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>{tank.name}</h2>
          <TankDimensionWireframe tank={tank} unitSystem={unitSystem} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Fish', count: inhabitantCounts.fish },
              { label: 'Invertebrates', count: inhabitantCounts.invertebrate },
              { label: 'Amphibians', count: inhabitantCounts.amphibian },
            ].map(({ label, count }) => (
              <Card key={label} style={{ textAlign: 'center', padding: '14px 12px' }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)' }}>{label}</p>
                <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{count}</p>
              </Card>
            ))}
          </div>

          {(() => {
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
            const dueTodayTasks = pendingTasks.filter(t => {
              const d = new Date(t.due_at); d.setHours(0, 0, 0, 0)
              return d.getTime() === todayStart.getTime()
            })
            if (dueTodayTasks.length === 0) return null
            return (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Weekly Tasks Due Today
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dueTodayTasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--amber-bg)', border: '0.5px solid var(--amber-border)' }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.task_type}</span>
                        {t.description && <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 6 }}>{t.description}</span>}
                      </div>
                      <button
                        onClick={() => completeTask(t.id)}
                        style={{ flexShrink: 0, fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer' }}
                      >
                        Done
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {(() => {
            const latest = params.data?.[0]
            if (!latest) return null
            const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''))
            const readings = [
              { key: 'ph', label: 'pH', value: latest.ph },
              { key: 'temperature_c', label: 'Temp (°C)', value: latest.temperature_c },
              { key: 'ammonia_ppm', label: 'Ammonia (ppm)', value: latest.ammonia_ppm },
              { key: 'nitrite_ppm', label: 'Nitrite (ppm)', value: latest.nitrite_ppm },
              { key: 'nitrate_ppm', label: 'Nitrate (ppm)', value: latest.nitrate_ppm },
              { key: 'gh_dgh', label: 'GH (dGH)', value: latest.gh_dgh },
              { key: 'kh_dkh', label: tank.water_type === 'freshwater' ? 'KH (dKH)' : 'KH / Alk', value: latest.kh_dkh },
              ...(tank.water_type !== 'freshwater' ? [
                { key: 'salinity_ppt', label: 'Salinity (ppt)', value: latest.salinity_ppt },
                { key: 'specific_gravity', label: 'Specific Gravity', value: latest.specific_gravity },
              ] : []),
            ].filter(r => r.value != null) as { key: string; label: string; value: number }[]
            if (readings.length === 0) return null
            return (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Latest Parameters · {formatDate(latest.recorded_at, dateFormat)}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                  {readings.map(({ key, label, value }) => {
                    const status = getParamStatus(key, value, tank.water_type)
                    const sc = status ? PARAM_STATUS_COLORS[status] : null
                    return (
                      <Card
                        key={label}
                        style={{
                          textAlign: 'center', padding: '14px 12px',
                          background: sc?.bg ?? 'var(--surface)',
                          border: `0.5px solid ${sc?.border ?? 'var(--border)'}`,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 11, color: sc?.color ?? 'var(--text-2)', opacity: sc ? 0.85 : 1 }}>{label}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 600, color: sc?.color ?? 'var(--text)' }}>{fmt(value)}</p>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </Card>
      )}

      {/* INHABITANTS TAB */}
      {tab === 'inhabitants' && (
        <Card>
          <SectionTitle>Inhabitants</SectionTitle>
          {fish.data?.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No inhabitants added yet.</p>}
          {(() => {
            type FishEntry = NonNullable<typeof fish.data>[0]
            const ORGANISM_SECTIONS: Array<{ type: string; label: string }> = [
              { type: 'fish', label: 'Fish' },
              { type: 'invertebrate', label: 'Invertebrates' },
              { type: 'amphibian', label: 'Amphibians' },
            ]
            const visibleSections = ORGANISM_SECTIONS
              .map(({ type: oType, label: oLabel }) => ({ oType, oLabel, ofType: (fish.data ?? []).filter(f => f.organism_type === oType) }))
              .filter(s => s.ofType.length > 0)
            return visibleSections.map(({ oType, oLabel, ofType }, sectionIndex) => {
              const grouped = new Map<string, FishEntry[]>()
              for (const f of ofType) {
                const key = f.species_slug
                if (!grouped.has(key)) grouped.set(key, [])
                grouped.get(key)!.push(f)
              }
              return (
                <div key={oType} style={{ marginBottom: 16, paddingTop: sectionIndex > 0 ? 16 : 0, borderTop: sectionIndex > 0 ? '0.5px solid var(--border-sub)' : 'none' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>{oLabel}</p>
                  {[...grouped.entries()].map(([, entries]) => {
                    const first = entries[0]
                    const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0)
                    const statusTotals = new Map<string, number>()
                    entries.forEach(entry => statusTotals.set(entry.fish_status, (statusTotals.get(entry.fish_status) ?? 0) + entry.quantity))
                    return (
                      <div key={first.species_slug} style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', minWidth: 0 }}>
                            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{first.common_name ?? first.species_slug}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>×{totalQuantity}</span>
                            {first.latin_name && <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', marginLeft: 8 }}>{first.latin_name}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {[...statusTotals.entries()].map(([status, quantity]) => {
                              const sc = FISH_STATUS_COLORS[status] ?? FISH_STATUS_COLORS.added
                              return <Tag key={status} compact bg={sc.bg} color={sc.color}>{cap(status)} ×{quantity}</Tag>
                            })}
                            {entries.map(f => (
                              <button key={f.id} onClick={() => startEditFish(f)} style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: '0.5px solid var(--btn-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>Edit {cap(f.fish_status)}</button>
                            ))}
                            {entries.map(f => (
                              <button key={`remove-${f.id}`} aria-label={`Remove ${f.quantity} ${f.common_name ?? f.species_slug}`} onClick={async () => { await api.fish.remove(id!, f.id); fish.reload() }} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={11} />
                              </button>
                            ))}
                          </div>
                        </div>
                        {[...new Set(entries.map(entry => entry.notes).filter(Boolean))].join(' · ') && <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-3)' }}>{[...new Set(entries.map(entry => entry.notes).filter(Boolean))].join(' · ')}</p>}
                      </div>
                    )
                  })}
                </div>
              )
            })
          })()}
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => setShowAddFish(true)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500, cursor: 'pointer', border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', width: isMobile ? '100%' : undefined, boxSizing: 'border-box' }}
            >
              <Plus size={13} />Add Inhabitant
            </button>
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
            return (
              <div key={p.id} style={{ borderBottom: '0.5px solid var(--border-sub)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0' }}>
                  <div style={{ minWidth: 0 }}>
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
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Tag bg={sc.bg} color={sc.color}>{cap(p.plant_status)}</Tag>
                    <button
                      onClick={() => {
                        setEditingPlantId(p.id)
                        setEditPlantQty(String(p.quantity))
                        setEditPlantStatus(p.plant_status)
                        setEditPlantNotes(p.notes ?? '')
                      }}
                      style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: '0.5px solid var(--btn-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => { await api.plants.remove(id!, p.id); plants.reload() }}
                      style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={11} />Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 16, borderTop: '0.5px solid var(--border-sub)', paddingTop: 14 }}>
            <button
              onClick={() => setShowAddPlant(true)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500, cursor: 'pointer', border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)', width: isMobile ? '100%' : undefined, boxSizing: 'border-box' }}
            >
              <Plus size={13} />Add Plant
            </button>
          </div>
        </Card>
      )}

      {/* PARAMETERS TAB */}
      {tab === 'parameters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionTitle>Log Parameters</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
              {([
                ['Temp (°C)', temp, setTemp],
                ['pH', ph, setPh],
                ['Ammonia', ammonia, setAmmonia],
                ['Nitrite', nitrite, setNitrite],
                ['Nitrate', nitrate, setNitrate],
                ...(tank.water_type === 'freshwater'
                  ? [['GH (dGH)', gh, setGh], ['KH (dKH)', kh, setKh]]
                  : [['GH (dGH)', gh, setGh], ['KH / Alk', kh, setKh],
                     ['Salinity (ppt)', salinity, setSalinity], ['Specific Gravity', sg, setSg]]),
              ] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
                <div key={lbl}>
                  <FieldLabel>{lbl}</FieldLabel>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input type="number" step="0.01" value={val} onChange={e => set(e.target.value)} style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }} />
                    {TEST_STRIP_VALUES[lbl] && (
                      <button
                        title="Select from API test strip"
                        onClick={() => setStripModal({ label: lbl, setter: set })}
                        style={{ padding: '0 8px', borderRadius: 6, border: '0.5px solid var(--btn-border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        <FlaskConical size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              disabled={!hasParamInput}
              style={{
                marginTop: 12, padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: hasParamInput ? 'pointer' : 'not-allowed',
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                opacity: hasParamInput ? 1 : 0.45,
                transition: 'background 0.15s, color 0.15s',
                width: isMobile ? '100%' : undefined, boxSizing: 'border-box',
              }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'var(--blue)'; e.currentTarget.style.color = '#fff' } }}
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
                  salinity_ppt: salinity ? Number(salinity) : null,
                  specific_gravity: sg ? Number(sg) : null,
                  notes: null,
                })
                setPh(''); setTemp(''); setAmmonia(''); setNitrite(''); setNitrate('')
                setGh(''); setKh(''); setSalinity(''); setSg('')
                params.reload(); alerts.reload()
              }}
            >Save Reading</button>
          </Card>

          {chartData.length > 0 && (
            <>
              {[
                { key: 'ph', label: 'pH', color: '#378add', domain: [5, 9] },
                { key: 'temperature_c', label: 'Temperature (°C)', color: '#e07b3a', domain: [15, 35] },
                { key: 'ammonia_ppm', label: 'Ammonia (ppm)', color: '#c0392b', domain: [0, 2] },
                { key: 'nitrite_ppm', label: 'Nitrite (ppm)', color: '#8e44ad', domain: [0, 2] },
                { key: 'nitrate_ppm', label: 'Nitrate (ppm)', color: '#d4ac0d', domain: [0, 80] },
                ...(tank.water_type !== 'freshwater' ? [
                  { key: 'salinity_ppt', label: 'Salinity (ppt)', color: '#1abc9c', domain: [0, 45] },
                  { key: 'specific_gravity', label: 'Specific Gravity', color: '#16a085', domain: [1.000, 1.035] },
                ] : []),
              ].filter(({ key }) => chartData.some((d: any) => d[key] != null)).map(({ key, label: lbl, color, domain }) => {
                const range = getParamRange(key, tank.water_type)
                const optimum = range ? (range.idealMin + range.idealMax) / 2 : null
                const showOptimum = optimum != null && !hiddenOptimumLines[key]
                return (
                  <Card key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                      <p style={{ fontWeight: 500, fontSize: 14, margin: 0, color: 'var(--text)' }}>
                        {lbl}
                        {showOptimum && (
                          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)', marginLeft: 8 }}>
                            Optimum: {optimum!.toFixed(2)}
                          </span>
                        )}
                      </p>
                      {optimum != null && (
                        <button
                          type="button"
                          title={showOptimum ? 'Hide optimum line' : 'Show optimum line'}
                          onClick={() => setHiddenOptimumLines(prev => ({ ...prev, [key]: !prev[key] }))}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', borderRadius: 6,
                            border: `0.5px solid ${showOptimum ? 'var(--blue-border)' : 'var(--btn-border)'}`,
                            background: showOptimum ? 'var(--blue-bg)' : 'transparent',
                            color: showOptimum ? 'var(--blue)' : 'var(--text-3)',
                            cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          <Target size={13} />
                        </button>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <XAxis dataKey="recorded_at" tickFormatter={v => formatDate(v, dateFormat)} tick={{ fontSize: 11, fill: 'var(--text-2)' }} interval={0} />
                        <YAxis domain={domain as [number, number]} tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                        <Tooltip
                          formatter={(v: number) => v.toFixed(2)}
                          labelFormatter={v => formatDateTime(v, dateFormat)}
                          contentStyle={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                        />
                        {showOptimum && (
                          <ReferenceLine y={optimum!} stroke="var(--text-3)" strokeDasharray="4 4" strokeWidth={1} />
                        )}
                        <Line type="monotone" dataKey={key} stroke={color} dot={chartData.length < 15} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* SCHEDULE TAB */}
      {tab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionTitle>Add Weekly Task</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <FieldLabel>Task Type</FieldLabel>
                <select value={taskType} onChange={e => setTaskType(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                  {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>{isRecurring ? 'First Due Date' : 'Due Date'}</FieldLabel>
                <DatePickerField value={taskDue} onChange={setTaskDue} isMobile={isMobile} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Notes (Optional)</FieldLabel>
              <input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="e.g. 30% water change" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['oneoff', 'repeating'] as const).map(mode => {
                const active = (mode === 'repeating') === isRecurring
                const activeBorder = mode === 'repeating' ? 'var(--red-border)' : 'var(--blue-border)'
                const activeBg = mode === 'repeating' ? 'var(--red-bg)' : 'var(--blue-bg)'
                const activeColor = mode === 'repeating' ? 'var(--red)' : 'var(--blue)'
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setIsRecurring(mode === 'repeating')}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      border: `0.5px solid ${active ? activeBorder : 'var(--btn-border)'}`,
                      background: active ? activeBg : 'transparent',
                      color: active ? activeColor : 'var(--text-2)',
                    }}
                  >
                    {mode === 'oneoff' ? 'One-off' : 'Repeating'}
                  </button>
                )
              })}
            </div>

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

            <button
              onClick={addTask}
              disabled={!taskDue}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: taskDue ? 'pointer' : 'default',
                border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)',
                opacity: taskDue ? 1 : 0.45,
                width: '100%', boxSizing: 'border-box',
              }}
            >
              <Plus size={13} />Add Weekly Task
            </button>
          </Card>

          {pendingTasks.length > 0 && (
            <Card>
              <SectionTitle>Upcoming</SectionTitle>
              {pendingTasks.map((t, i) => {
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const due = new Date(t.due_at); due.setHours(0, 0, 0, 0)
                const overdue = due < today
                const dueToday = due.getTime() === today.getTime()
                const skipping = skipTaskId === t.id
                const isLast = i === pendingTasks.length - 1
                return (
                  <div key={t.id} style={{ padding: '10px 0', borderBottom: (!isLast || skipping) ? '0.5px solid var(--border-sub)' : 'none' }}>
                    {isMobile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.task_type}</span>
                          {overdue && <Tag compact bg="var(--red-bg)" color="var(--red)">Overdue</Tag>}
                          {dueToday && <Tag compact bg="var(--amber-bg)" color="var(--amber)">Due today</Tag>}
                          {t.is_recurring && (
                            <Tag compact bg="var(--blue-bg)" color="var(--blue)">
                              ↻ every {t.recur_every_weeks === 1 ? 'week' : `${t.recur_every_weeks} weeks`} on {DAY_NAMES[t.recur_day_of_week]}
                            </Tag>
                          )}
                        </div>
                        {t.description && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>{t.description}</p>}
                        <p style={{ margin: 0, fontSize: 11, color: overdue ? 'var(--red)' : dueToday ? 'var(--amber)' : 'var(--text-3)' }}>
                          Due {formatDate(t.due_at, dateFormat)}
                        </p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => completeTask(t.id)} style={{ flex: 1, fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer' }}>Done</button>
                          <button
                            onClick={() => { setSkipTaskId(skipping ? null : t.id); setSkipTimes('1') }}
                            style={{ flex: 1, fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--amber-border)', background: skipping ? 'var(--amber-bg)' : 'transparent', color: 'var(--amber)', cursor: 'pointer' }}
                          >Skip</button>
                          <button onClick={() => deleteTask(t.id)} style={{ flex: 1, fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Remove</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.task_type}</span>
                            {overdue && <Tag compact bg="var(--red-bg)" color="var(--red)">Overdue</Tag>}
                            {dueToday && <Tag compact bg="var(--amber-bg)" color="var(--amber)">Due today</Tag>}
                            {t.is_recurring && (
                              <Tag compact bg="var(--blue-bg)" color="var(--blue)">
                                ↻ every {t.recur_every_weeks === 1 ? 'week' : `${t.recur_every_weeks} weeks`} on {DAY_NAMES[t.recur_day_of_week]}
                              </Tag>
                            )}
                          </div>
                          {t.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-2)' }}>{t.description}</p>}
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: overdue ? 'var(--red)' : dueToday ? 'var(--amber)' : 'var(--text-3)' }}>
                            Due {formatDate(t.due_at, dateFormat)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => completeTask(t.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer' }}>Done</button>
                          <button
                            onClick={() => { setSkipTaskId(skipping ? null : t.id); setSkipTimes('1') }}
                            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--amber-border)', background: skipping ? 'var(--amber-bg)' : 'transparent', color: 'var(--amber)', cursor: 'pointer' }}
                          >Skip</button>
                          <button onClick={() => deleteTask(t.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Remove</button>
                        </div>
                      </div>
                    )}
                    {skipping && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--amber-bg)', border: '0.5px solid var(--amber-border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--amber)', whiteSpace: 'nowrap' }}>
                          {t.is_recurring ? 'Skip next' : 'Skip for'}
                        </span>
                        <input
                          type="number" min="1" value={skipTimes}
                          onChange={e => setSkipTimes(e.target.value)}
                          style={{ width: 52, fontSize: 12, padding: '2px 6px', borderRadius: 6, border: '0.5px solid var(--amber-border)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--amber)', whiteSpace: 'nowrap' }}>
                          {t.is_recurring ? `occurrence${Number(skipTimes) === 1 ? '' : 's'}` : `day${Number(skipTimes) === 1 ? '' : 's'}`}
                        </span>
                        <button onClick={() => skipTask(t.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--amber-border)', background: 'var(--amber)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Confirm</button>
                        <button onClick={() => setSkipTaskId(null)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </Card>
          )}

          {doneTasks.length > 0 && (
            <Card>
              <button
                type="button"
                onClick={() => setCompletedExpanded(e => !e)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  marginBottom: completedExpanded ? 12 : 0,
                }}
              >
                <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-2)' }}>Completed</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '1px 8px' }}>
                    {doneTasks.length}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--text-3)', transform: completedExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </span>
              </button>
              {completedExpanded && doneTasks.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: i === doneTasks.length - 1 ? 'none' : '0.5px solid var(--border-sub)', opacity: 0.6 }}>
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'line-through' }}>{t.task_type}</span>
                    {t.description && <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>{t.description}</span>}
                    {editingCompletedTaskId === t.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                        <input
                          type="date"
                          value={editingCompletedDate}
                          onChange={e => setEditingCompletedDate(e.target.value)}
                          style={{ fontSize: 11, padding: '2px 5px', borderRadius: 5, border: '0.5px solid var(--btn-border)', background: 'var(--surface)', color: 'var(--text)' }}
                        />
                        <button onClick={() => saveCompletedDate(t.id)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingCompletedTaskId(null)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>Completed {formatDate(t.completed_at, dateFormat)}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {editingCompletedTaskId !== t.id && <button onClick={() => startEditCompletedDate(t)} style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit date</button>}
                    <button onClick={() => deleteTask(t.id)} style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {tasks.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No tasks scheduled yet.</p>}
        </div>
      )}

      {/* DAILY TAB */}
      {tab === 'daily' && (() => {
        const todayTasks = dailyTasks
          .filter((t: any) => t.days.split(',').map(Number).includes(todayColIndex))
          .sort((a: any, b: any) => a.hour !== b.hour ? a.hour - b.hour : a.minute - b.minute)

        // Derive feeding entries from added inhabitants — one entry per unique species
        const feedingEntries = (() => {
          const seen = new Set<string>()
          const entries: { name: string; times: number; food: string | null; amount: string | null }[] = []
          for (const f of (fish.data ?? [])) {
            if (f.fish_status !== 'added' || !f.feeding_times_per_day) continue
            if (seen.has(f.species_slug)) continue
            seen.add(f.species_slug)
            entries.push({ name: f.common_name ?? f.species_slug, times: f.feeding_times_per_day, food: f.food_types ?? null, amount: f.feeding_amount ?? null })
          }
          return entries
        })()

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Add task form */}
            <Card>
              <SectionTitle>Add Daily Task</SectionTitle>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <FieldLabel>Task Name</FieldLabel>
                  <input
                    value={dtName} onChange={e => setDtName(e.target.value)}
                    placeholder="e.g. CO2 on, Lights on, Dose ferts"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    onKeyDown={e => e.key === 'Enter' && addDailyTask()}
                  />
                </div>
                {(() => {
                  const hour24 = Number(dtHour)
                  const h12 = (hour24 % 12) || 12
                  const ampm = hour24 < 12 ? 'AM' : 'PM'
                  const setHourFrom12 = (newH12: number) => {
                    const newHour24 = ampm === 'AM' ? newH12 % 12 : (newH12 % 12) + 12
                    setDtHour(String(newHour24))
                  }
                  const setAmPm = (period: 'AM' | 'PM') => {
                    const newHour24 = period === 'AM' ? h12 % 12 : (h12 % 12) + 12
                    setDtHour(String(newHour24))
                  }
                  const pillStyle = (on: boolean): React.CSSProperties => ({
                    padding: '6px 0', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    border: on ? '0.5px solid var(--blue-border)' : '0.5px solid var(--btn-border)',
                    background: on ? 'var(--blue-bg)' : 'transparent',
                    color: on ? 'var(--blue)' : 'var(--text-2)',
                    fontWeight: on ? 500 : 400,
                  })
                  return (
                    <div style={{ position: 'relative', width: isMobile ? '100%' : undefined }}>
                      <FieldLabel>Time</FieldLabel>
                      <button
                        type="button"
                        onClick={() => setDtTimePickerOpen(o => !o)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                          width: isMobile ? '100%' : 120, boxSizing: 'border-box',
                          padding: '6px 10px', borderRadius: 8, border: '0.5px solid var(--btn-border)',
                          background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        <span>{h12}:{String(Number(dtMinute)).padStart(2, '0')} {ampm}</span>
                        <Clock size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      </button>

                      {dtTimePickerOpen && (
                        <>
                          <div onClick={() => setDtTimePickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: isMobile ? 0 : 'auto', zIndex: 100,
                            width: isMobile ? '100%' : 250,
                            background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.16)', padding: 12,
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 10 }}>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                <button key={h} type="button" onClick={() => setHourFrom12(h)} style={pillStyle(h === h12)}>{h}</button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                              {[0, 15, 30, 45].map(m => (
                                <button key={m} type="button" onClick={() => setDtMinute(String(m))} style={{ ...pillStyle(m === Number(dtMinute)), flex: 1 }}>
                                  {String(m).padStart(2, '0')}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {(['AM', 'PM'] as const).map(period => (
                                <button key={period} type="button" onClick={() => setAmPm(period)} style={{ ...pillStyle(period === ampm), flex: 1 }}>
                                  {period}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Days</FieldLabel>
                <div style={{ display: 'flex', gap: isMobile ? 3 : 6, width: '100%' }}>
                  {DAY_NAMES.map((name, i) => {
                    const on = dtDays.includes(i)
                    return (
                      <button key={name} onClick={() => setDtDays(prev => on ? prev.filter(x => x !== i) : [...prev, i].sort())}
                        style={{
                          flex: 1, minWidth: 0, padding: isMobile ? '7px 1px' : '4px 6px', borderRadius: 6,
                          fontSize: isMobile ? 12 : 12, cursor: 'pointer',
                          border: on ? '0.5px solid var(--blue-border)' : '0.5px solid var(--btn-border)',
                          background: on ? 'var(--blue-bg)' : 'transparent',
                          color: on ? 'var(--blue)' : 'var(--text-2)',
                          fontWeight: on ? 500 : 400,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip',
                        }}
                      >{isMobile ? name[0] : name}</button>
                    )
                  })}
                  <button onClick={() => setDtDays(dtDays.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6])}
                    style={{
                      flex: isMobile ? 1.4 : 1.2, minWidth: 0, padding: isMobile ? '7px 1px' : '4px 6px', borderRadius: 6,
                      fontSize: isMobile ? 11 : 11, cursor: 'pointer', border: '0.5px solid var(--btn-border)',
                      background: 'transparent', color: 'var(--text-3)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip',
                    }}>
                    {dtDays.length === 7 ? 'None' : (isMobile ? 'All' : 'Every day')}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel>Colour</FieldLabel>
                <div style={{ display: 'flex', gap: isMobile ? 3 : 6, width: '100%' }}>
                  {DAILY_COLORS.map(c => (
                    <button key={c} onClick={() => setDtColor(c)} style={{
                      flex: 1, minWidth: 0, height: 32, borderRadius: 6, background: c, cursor: 'pointer',
                      border: dtColor === c ? `2.5px solid var(--text)` : '2px solid transparent',
                      padding: 0,
                    }} />
                  ))}
                </div>
              </div>

              <button
                onClick={addDailyTask}
                disabled={!dtName.trim() || dtDays.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)',
                  opacity: dtName.trim() && dtDays.length > 0 ? 1 : 0.45,
                  width: '100%', boxSizing: 'border-box',
                }}
              >
                <Plus size={13} />Add Daily Task
              </button>
            </Card>

            {/* Today's tasks */}
            <Card>
              <SectionTitle>Today's Tasks</SectionTitle>
              {feedingEntries.map((entry, i) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 10, padding: '8px 0', borderBottom: (i === feedingEntries.length - 1 && todayTasks.length === 0) ? 'none' : '0.5px solid var(--border-sub)' }}>
                  <Utensils size={12} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: isMobile ? 3 : 0 }} />
                  {isMobile ? (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>Feed {entry.name}</span>
                      {entry.amount && <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 5 }}>· {entry.amount}</span>}
                      {entry.food && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>{entry.food}</p>}
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>
                      Feed {entry.name}
                      {entry.amount && <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 5 }}>· {entry.amount}</span>}
                      {entry.food && <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 5 }}>({entry.food})</span>}
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--blue)', background: 'var(--blue-bg)', border: '0.5px solid var(--blue-border)', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>
                    ×{entry.times} daily
                  </span>
                </div>
              ))}
              {todayTasks.length === 0 && feedingEntries.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>No tasks scheduled for today.</p>
              )}
              {todayTasks.map((task: any, i: number) => {
                const c = task.color ?? '#1e88e5'
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i === todayTasks.length - 1 ? 'none' : '0.5px solid var(--border-sub)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 36 }}>
                      {String(task.hour).padStart(2, '0')}:{String(task.minute).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{task.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                      {task.days.split(',').map((d: string) => DAY_ABBR[Number(d)]).join(', ')}
                    </span>
                    <button onClick={() => removeDailyTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', lineHeight: 0, padding: 2, flexShrink: 0 }}>
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </Card>

            {/* All scheduled tasks */}
            {dailyTasks.filter((t: any) => !t.days.split(',').map(Number).includes(todayColIndex)).length > 0 && (
              <Card>
                <SectionTitle>Other Scheduled Tasks</SectionTitle>
                {(() => {
                  const otherTasks = dailyTasks
                    .filter((t: any) => !t.days.split(',').map(Number).includes(todayColIndex))
                    .sort((a: any, b: any) => a.hour !== b.hour ? a.hour - b.hour : a.minute - b.minute)
                  return otherTasks.map((task: any, i: number) => {
                    const c = task.color ?? '#1e88e5'
                    return (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i === otherTasks.length - 1 ? 'none' : '0.5px solid var(--border-sub)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 36 }}>
                          {String(task.hour).padStart(2, '0')}:{String(task.minute).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{task.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                          {task.days.split(',').map((d: string) => DAY_ABBR[Number(d)]).join(', ')}
                        </span>
                        <button onClick={() => removeDailyTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', lineHeight: 0, padding: 2, flexShrink: 0 }}>
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })
                })()}
              </Card>
            )}
          </div>
        )
      })()}

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
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
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

      {/* FEEDING PLAN MODAL */}

      {/* EDIT FISH MODAL */}
      {editingFishId && (
        <div
          onMouseDown={() => setEditingFishId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: 400, maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Edit Inhabitant</p>
              <button onClick={() => setEditingFishId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', lineHeight: 0 }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: editFishStatus === 'added' ? '80px 1fr 1fr' : '80px 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <FieldLabel>Quantity</FieldLabel>
                <input type="number" min="1" max="10" value={editQty} onChange={e => setEditQty(String(Math.min(10, Number(e.target.value) || 1)))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={editFishStatus} onChange={e => setEditFishStatus(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                  {FISH_STATUSES.map(s => <option key={s} value={s}>{cap(s)}</option>)}
                </select>
              </div>
              {editFishStatus === 'added' && (
                <div>
                  <FieldLabel>Health Status</FieldLabel>
                  <select value={editHealth} onChange={e => setEditHealth(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                    {HEALTH_STATUSES.map(s => <option key={s} value={s}>{cap(s)}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginBottom: 12 }}>
              <div>
                <FieldLabel>Food Types</FieldLabel>
                <input value={editFoodTypes} onChange={e => setEditFoodTypes(e.target.value)} placeholder="e.g. Flake, frozen bloodworm" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <FieldLabel>Feeds Per Day</FieldLabel>
                <select value={editFeedingTimes} onChange={e => setEditFeedingTimes(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                  <option value="">—</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}×</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Feeding Amount</FieldLabel>
              <select value={editFeedingAmount} onChange={e => setEditFeedingAmount(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">—</option>
                {feedingAmountPresets.map(preset => <option key={preset} value={preset}>{preset}</option>)}
              </select>
              {feedingAmountPresets.length === 0 && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-3)' }}>
                  Add presets in Settings → Feeding Amounts to choose one here.
                </p>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Notes</FieldLabel>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Any extra care notes" rows={2} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingFishId(null)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)' }}>Cancel</button>
              <button onClick={saveEditFish} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PLANT MODAL */}
      {editingPlantId && (
        <div
          onMouseDown={() => setEditingPlantId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: 400, maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Edit Plant</p>
              <button onClick={() => setEditingPlantId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', lineHeight: 0 }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <FieldLabel>Quantity</FieldLabel>
                <input type="number" min="1" value={editPlantQty} onChange={e => setEditPlantQty(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={editPlantStatus} onChange={e => setEditPlantStatus(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                  <option value="planned">Planned</option>
                  <option value="planted">Planted</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Notes</FieldLabel>
              <input value={editPlantNotes} onChange={e => setEditPlantNotes(e.target.value)} placeholder="Optional notes…" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingPlantId(null)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)' }}>Cancel</button>
              <button
                onClick={async () => {
                  await api.plants.update(id!, editingPlantId, {
                    quantity: Number(editPlantQty),
                    plant_status: editPlantStatus,
                    notes: editPlantNotes || null,
                  })
                  setEditingPlantId(null)
                  plants.reload()
                }}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD INHABITANT MODAL */}
      {showAddFish && (
        <div
          onMouseDown={() => { setShowAddFish(false); setFishSlug(''); setFishName(''); setFishQty('1'); setFishAddStatus('added') }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: 420, maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Add Inhabitant</p>
              <button onClick={() => { setShowAddFish(false); setFishSlug(''); setFishName(''); setFishQty('1'); setFishAddStatus('added') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', lineHeight: 0 }}><X size={18} /></button>
            </div>
            {/* Type selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {(['fish', 'invertebrate', 'amphibian'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setAddOrganismType(t); setFishSlug(''); setFishName('') }}
                  style={{
                    flex: 1, padding: '6px 8px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: `0.5px solid ${addOrganismType === t ? 'var(--blue-border)' : 'var(--border)'}`,
                    background: addOrganismType === t ? 'var(--blue-bg)' : 'transparent',
                    color: addOrganismType === t ? 'var(--blue)' : 'var(--text-2)',
                  }}
                >
                  {t === 'fish' ? 'Fish' : t === 'invertebrate' ? 'Invertebrate' : 'Amphibian'}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Species</FieldLabel>
              <SpeciesAutocomplete type={addOrganismType} value={fishName} onChange={(slug, name) => { setFishSlug(slug); setFishName(name) }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <FieldLabel>Quantity</FieldLabel>
                <input type="number" value={fishQty} onChange={e => setFishQty(String(Math.min(10, Number(e.target.value) || 1)))} min="1" max="10" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={fishAddStatus} onChange={e => setFishAddStatus(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                  {FISH_STATUSES.map(s => <option key={s} value={s}>{cap(s)}</option>)}
                </select>
              </div>
            </div>
            {addOrganismType === 'fish' && <CompatibilityCheck tankId={id!} slug={fishSlug} />}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setShowAddFish(false); setFishSlug(''); setFishName(''); setFishQty('1'); setFishAddStatus('added') }} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)' }}>Cancel</button>
              <button
                disabled={!fishSlug}
                onClick={async () => {
                  if (!fishSlug) return
                  await api.fish.add(id!, { species_slug: fishSlug, quantity: Number(fishQty), organism_type: addOrganismType, fish_status: fishAddStatus, notes: null })
                  setFishSlug(''); setFishName(''); setFishQty('1'); setFishAddStatus('added')
                  setShowAddFish(false)
                  fish.reload()
                }}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: fishSlug ? 'pointer' : 'not-allowed', border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', opacity: fishSlug ? 1 : 0.45 }}
              >Add Inhabitant</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PLANT MODAL */}
      {showAddPlant && (
        <div
          onMouseDown={() => { setShowAddPlant(false); setPlantSlug(''); setPlantName(''); setPlantQty('1'); setPlantAddStatus('planted') }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: 400, maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Add Plant</p>
              <button onClick={() => { setShowAddPlant(false); setPlantSlug(''); setPlantName(''); setPlantQty('1'); setPlantAddStatus('planted') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', lineHeight: 0 }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Species</FieldLabel>
              <SpeciesAutocomplete type="plant" value={plantName} onChange={(slug, name) => { setPlantSlug(slug); setPlantName(name) }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 16 }}>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={plantAddStatus} onChange={e => setPlantAddStatus(e.target.value)} style={{ width: '100%' }}>
                  <option value="planned">Planned</option>
                  <option value="planted">Planted</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
              <div>
                <FieldLabel>Quantity</FieldLabel>
                <input type="number" value={plantQty} onChange={e => setPlantQty(e.target.value)} min="1" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAddPlant(false); setPlantSlug(''); setPlantName(''); setPlantQty('1'); setPlantAddStatus('planted') }} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)' }}>Cancel</button>
              <button
                disabled={!plantSlug}
                onClick={async () => {
                  if (!plantSlug) return
                  await api.plants.add(id!, { species_slug: plantSlug, quantity: Number(plantQty), notes: null, plant_status: plantAddStatus })
                  setPlantSlug(''); setPlantName(''); setPlantQty('1'); setPlantAddStatus('planted')
                  setShowAddPlant(false)
                  plants.reload()
                }}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: plantSlug ? 'pointer' : 'not-allowed', border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)', opacity: plantSlug ? 1 : 0.45 }}
              >Add Plant</button>
            </div>
          </div>
        </div>
      )}

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
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {!a.acknowledged && (
                  <button onClick={async () => { await api.alerts.acknowledge(id!, a.id); alerts.reload() }} style={{ fontSize: 11, background: 'none', border: '0.5px solid var(--btn-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', color: 'var(--text-2)' }}>
                    Ack
                  </button>
                )}
                <button onClick={async () => { await api.alerts.delete(id!, a.id); alerts.reload() }} style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '2px 4px' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {stripModal && (() => {
        const kitData = stripKit === '5in1' ? TEST_STRIP_5IN1 : TEST_STRIP_MASTER
        const entries = kitData[stripModal.label]
        const isGHKH5in1 = stripKit === '5in1' && (stripModal.label === 'GH (dGH)' || stripModal.label === 'KH (dKH)' || stripModal.label === 'KH / Alk')
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setStripModal(null)}
          >
            <div
              style={{ background: 'var(--surface)', borderRadius: 14, border: '0.5px solid var(--border)', width: '100%', maxWidth: 520, padding: '20px 20px 24px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{stripModal.label}</span>
                <button onClick={() => setStripModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4, lineHeight: 0 }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['master', '5in1'] as const).map(kit => (
                  <button
                    key={kit}
                    onClick={() => setStripKit(kit)}
                    style={{
                      fontSize: 12, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontWeight: 500,
                      border: '0.5px solid var(--btn-border)',
                      background: stripKit === kit ? 'var(--blue-bg)' : 'var(--surface-2)',
                      color: stripKit === kit ? 'var(--blue)' : 'var(--text-2)',
                    }}
                  >
                    {kit === 'master' ? 'Master Test Kit' : '5-in-1 Test Strip'}
                  </button>
                ))}
              </div>
              {!entries ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
                  This parameter is not measured by the 5-in-1 strip.
                </p>
              ) : (
                <>
                  {isGHKH5in1 && (
                    <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 12px' }}>
                      Values shown in ppm (as printed on tube) — converted to dGH/dKH when saved.
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${entries.length}, 1fr)`, gap: 6 }}>
                    {entries.map(({ value, color, label }) => (
                      <button
                        key={value}
                        onClick={() => { stripModal.setter(String(value)); setStripModal(null) }}
                        style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                      >
                        <div style={{ height: 52, background: color, width: '100%' }} />
                        <div style={{ padding: '5px 2px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: 'var(--text)', background: 'var(--surface-2)' }}>
                          {label ?? value}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
