import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Fish, Leaf, Bell, Clock, Plus, AlertTriangle, Timer, type LucideIcon } from 'lucide-react'
import { useTanks } from '../hooks'
import { api } from '../api/client'
import { useSettings, formatDate, toMM, dimInputProps } from '../context/SettingsContext'
import { Card, FieldLabel, Tag, SectionTitle } from '../components/ui'

interface DashboardStats {
  total_tanks: number
  total_fish: number
  total_species: number
  total_plants: number
  unack_alerts: number
  overdue_tasks: number
  upcoming_tasks: Array<{
    id: string; tank_id: string; task_type: string
    description: string | null; due_at: string; is_recurring: boolean
  }>
  tanks: Array<{
    id: string; name: string; volume_litres: number; water_type: string; co2_injection: boolean
    substrate: string | null; fish_count: number; fish_species: number
    plant_species: number; unack_alerts: number; overdue_tasks: number
    latest_ph: number | null; latest_temp: number | null
    latest_ammonia: number | null; latest_nitrite: number | null; latest_nitrate: number | null
    latest_recorded: string | null
  }>
}

const WATER_TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  freshwater: { bg: 'var(--cyan-bg)',   color: 'var(--cyan)',   label: 'Freshwater' },
  saltwater:  { bg: 'var(--blue-bg)',   color: 'var(--blue)',   label: 'Saltwater'  },
  brackish:   { bg: 'var(--green-bg)',  color: 'var(--green)',  label: 'Brackish'   },
}

function WaterTypeBadge({ type }: { type: string }) {
  const s = WATER_TYPE_STYLES[type] ?? WATER_TYPE_STYLES.freshwater
  return <Tag bg={s.bg} color={s.color}>{s.label}</Tag>
}

function StatCard({ label, value, accent, icon: Icon }: {
  label: string; value: string | number; accent?: string
  icon?: LucideIcon
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{label}</p>
        {Icon && <Icon size={14} color="var(--text-3)" />}
      </div>
      <p style={{ fontSize: 24, fontWeight: 500, margin: 0, color: accent ?? 'var(--text)' }}>{value}</p>
    </div>
  )
}

const PARAMS = [
  { key: 'latest_ph',      label: 'pH',   color: 'var(--blue)',              fmt: (v: number) => v.toFixed(1) },
  { key: 'latest_temp',    label: 'Temp', color: 'var(--orange, #ef6c00)',   fmt: (v: number) => `${v.toFixed(0)}°` },
  { key: 'latest_ammonia', label: 'NH₃',  color: 'var(--red)',               fmt: (v: number) => v.toFixed(2) },
  { key: 'latest_nitrite', label: 'NO₂',  color: 'var(--amber)',             fmt: (v: number) => v.toFixed(2) },
  { key: 'latest_nitrate', label: 'NO₃',  color: 'var(--green)',             fmt: (v: number) => v.toFixed(0) },
] as const

function TankOverviewCard({ tank }: { tank: DashboardStats['tanks'][0] }) {
  const navigate = useNavigate()
  const hasAlerts = tank.unack_alerts > 0 || tank.overdue_tasks > 0

  return (
    <div
      onClick={() => navigate(`/tanks/${tank.id}`)}
      style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 14, padding: '1rem 1.1rem', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--blue-border)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tank.name}
          </p>
          <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '1px 7px', borderRadius: 5, border: '0.5px solid var(--border)' }}>
            {tank.volume_litres} L
          </span>
        </div>
        <WaterTypeBadge type={tank.water_type} />
      </div>

      {/* Parameter grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
        {PARAMS.map(({ key, label, color, fmt }) => {
          const val = tank[key] as number | null
          return (
            <div key={key} style={{
              textAlign: 'center', background: 'var(--surface-2)',
              borderRadius: 8, padding: '7px 2px',
              border: '0.5px solid var(--border-sub)',
            }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: val != null ? color : 'var(--text-4)' }}>
                {val != null ? fmt(val) : '—'}
              </p>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-2)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Fish size={12} />
            {tank.fish_count} fish · {tank.fish_species} sp
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Leaf size={12} />
            {tank.plant_species} plant sp
          </span>
        </div>
        {tank.latest_recorded && (
          <span style={{ fontSize: 10, color: 'var(--text-4)' }}>
            {new Date(tank.latest_recorded).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Alerts strip */}
      {hasAlerts && (
        <div style={{ display: 'flex', gap: 6, paddingTop: 8, borderTop: '0.5px solid var(--border-sub)' }}>
          {tank.unack_alerts > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--amber)', background: 'var(--amber-bg)', padding: '3px 8px', borderRadius: 6 }}>
              <AlertTriangle size={11} />
              {tank.unack_alerts} alert{tank.unack_alerts > 1 ? 's' : ''}
            </span>
          )}
          {tank.overdue_tasks > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--red)', background: 'var(--red-bg)', padding: '3px 8px', borderRadius: 6 }}>
              <Timer size={11} />
              {tank.overdue_tasks} overdue
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { loading, reload } = useTanks()
  const { dateFormat, unitSystem } = useSettings()
  const dimProps = dimInputProps(unitSystem)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const [name, setName] = useState('')
  const [volume, setVolume] = useState('')
  const [waterType, setWaterType] = useState('freshwater')
  const [co2, setCo2] = useState(false)
  const [substrate, setSubstrate] = useState('')
  const [lighting, setLighting] = useState('')
  const [filterFlow, setFilterFlow] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [depth, setDepth] = useState('')

  async function loadStats() {
    const r = await fetch('/api/dashboard')
    setStats(await r.json())
  }

  useEffect(() => { loadStats() }, [])

  async function createTank() {
    if (!name || !volume) return
    await api.tanks.create({
      name,
      volume_litres: Number(volume),
      water_type: waterType,
      co2_injection: co2,
      substrate: substrate || null,
      lighting: lighting || null,
      filter_flow_lph: filterFlow ? Number(filterFlow) : null,
      width_mm: width ? toMM(Number(width), unitSystem) : null,
      height_mm: height ? toMM(Number(height), unitSystem) : null,
      depth_mm: depth ? toMM(Number(depth), unitSystem) : null,
      setup_date: null,
    })
    setName(''); setVolume(''); setWaterType('freshwater'); setCo2(false)
    setSubstrate(''); setLighting(''); setFilterFlow('')
    setWidth(''); setHeight(''); setDepth('')
    setShowForm(false)
    reload(); loadStats()
  }

  async function completeTask(tankId: string, taskId: string) {
    setCompletingId(taskId)
    try {
      await fetch(`/api/tanks/${tankId}/maintenance/${taskId}/complete`, { method: 'PATCH' })
      await loadStats()
    } finally {
      setCompletingId(null)
    }
  }

  if (loading || !stats) return <p style={{ color: 'var(--text-2)' }}>Loading dashboard…</p>

  const statsSidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <StatCard label="Tanks" value={stats.total_tanks} icon={Layers} />
      <StatCard label="Fish" value={stats.total_fish} icon={Fish} />
      <StatCard label="Fish species" value={stats.total_species} icon={Fish} />
      <StatCard label="Plant species" value={stats.total_plants} icon={Leaf} />
      <StatCard label="Alerts" value={stats.unack_alerts} icon={Bell} accent={stats.unack_alerts > 0 ? 'var(--amber)' : undefined} />
      <StatCard label="Overdue tasks" value={stats.overdue_tasks} icon={Clock} accent={stats.overdue_tasks > 0 ? 'var(--red)' : undefined} />

      {stats.upcoming_tasks.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Card>
            <SectionTitle>Upcoming</SectionTitle>
            {stats.upcoming_tasks.map(t => {
              const tank = stats.tanks.find(tk => tk.id === t.tank_id)
              return (
                <div key={t.id} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--border-sub)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: '0 0 2px' }}>{t.task_type}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0 }}>
                        {tank?.name}{t.is_recurring ? ' ↻' : ''}{t.description ? ` · ${t.description}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(t.due_at, dateFormat)}</span>
                      <button
                        onClick={() => completeTask(t.tank_id, t.id)}
                        disabled={completingId === t.id}
                        style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 6,
                          border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)',
                          cursor: 'pointer', opacity: completingId === t.id ? 0.5 : 1,
                        }}
                      >
                        {completingId === t.id ? '…' : 'Done'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Dashboard</h1>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', cursor: 'pointer', color: 'var(--blue)' }}>
          <Plus size={14} />
          Add Tank
        </button>
      </div>

      {isMobile && <div style={{ marginBottom: 20 }}>{statsSidebar}</div>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 500, fontSize: 15, margin: '0 0 12px', color: 'var(--text)' }}>Your Tanks</p>
          {stats.tanks.length === 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No tanks yet. Add your first one above.</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {stats.tanks.map(t => <TankOverviewCard key={t.id} tank={t} />)}
          </div>
        </div>

        {!isMobile && <div style={{ width: 220, flexShrink: 0 }}>{statsSidebar}</div>}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowForm(false) } }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>New Tank</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <FieldLabel>Tank Name *</FieldLabel>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Community tank" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <FieldLabel>Volume (Litres) *</FieldLabel>
                  <input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="e.g. 120" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <FieldLabel>Water Type</FieldLabel>
                <select value={waterType} onChange={e => setWaterType(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                  <option value="freshwater">Freshwater</option>
                  <option value="saltwater">Saltwater / Marine</option>
                  <option value="brackish">Brackish</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <FieldLabel>Substrate</FieldLabel>
                  <input value={substrate} onChange={e => setSubstrate(e.target.value)} placeholder="e.g. Fine sand" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <FieldLabel>Lighting</FieldLabel>
                  <input value={lighting} onChange={e => setLighting(e.target.value)} placeholder="e.g. LED full spectrum" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <FieldLabel>Filter Flow (L/h)</FieldLabel>
                  <input type="number" value={filterFlow} onChange={e => setFilterFlow(e.target.value)} placeholder="e.g. 600" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <FieldLabel>Width ({unitSystem})</FieldLabel>
                  <input type="number" min="0" step={dimProps.step} value={width} onChange={e => setWidth(e.target.value)} placeholder={dimProps.placeholder} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <FieldLabel>Height ({unitSystem})</FieldLabel>
                  <input type="number" min="0" step={dimProps.step} value={height} onChange={e => setHeight(e.target.value)} placeholder={dimProps.placeholder} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <FieldLabel>Depth ({unitSystem})</FieldLabel>
                  <input type="number" min="0" step={dimProps.step} value={depth} onChange={e => setDepth(e.target.value)} placeholder={dimProps.placeholder} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-label)' }}>
                <input type="checkbox" checked={co2} onChange={e => setCo2(e.target.checked)} />
                CO₂ injection
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '0.5px solid var(--border)' }}>
              <button onClick={() => setShowForm(false)} style={{ fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)' }}>
                Cancel
              </button>
              <button
                onClick={createTank}
                disabled={!name || !volume}
                style={{ fontSize: 13, padding: '7px 18px', borderRadius: 8, border: '0.5px solid var(--blue-border)', background: !name || !volume ? 'var(--surface-2)' : 'var(--blue-bg)', cursor: !name || !volume ? 'default' : 'pointer', color: !name || !volume ? 'var(--text-3)' : 'var(--blue)', fontWeight: 500 }}
              >
                Create tank
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
