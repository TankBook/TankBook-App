import { useState, useEffect } from 'react'
import { Ruler, type LucideIcon } from 'lucide-react'
import { Card, FieldLabel } from '../components/ui'
import { useSettings, dimInputProps } from '../context/SettingsContext'

// ── Calculator registry ───────────────────────────────────────────────────────

type CalcId = 'volume'

interface CalcDef {
  id: CalcId
  label: string
  hint: string
  icon: LucideIcon
}

const CALCULATORS: CalcDef[] = [
  { id: 'volume', label: 'Tank Volume', hint: 'From dimensions', icon: Ruler },
]

// ── Volume calculator ─────────────────────────────────────────────────────────

type TankShape = 'rectangular' | 'cylinder'

// Convert a value in the user's unit to cm
function toCm(v: number, unit: 'mm' | 'cm' | 'm'): number {
  if (unit === 'mm') return v / 10
  if (unit === 'm')  return v * 100
  return v
}

// Format a surface area (in cm²) back to the user's unit
function fmtSurface(cm2: number, unit: 'mm' | 'cm' | 'm'): string {
  if (unit === 'mm') return `${(cm2 * 100).toFixed(0)} mm²`
  if (unit === 'm')  return `${(cm2 / 10000).toFixed(4)} m²`
  return `${cm2.toFixed(0)} cm²`
}

function VolumeCalculator() {
  const { unitSystem } = useSettings()
  const dp = dimInputProps(unitSystem)

  const [shape, setShape] = useState<TankShape>('rectangular')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [depth, setDepth] = useState('')
  const [diameter, setDiameter] = useState('')

  let litres: number | null = null
  let surfaceCm2: number | null = null

  if (shape === 'rectangular') {
    const w = parseFloat(width), h = parseFloat(height), d = parseFloat(depth)
    if (w > 0 && h > 0 && d > 0) {
      const wc = toCm(w, unitSystem), hc = toCm(h, unitSystem), dc = toCm(d, unitSystem)
      litres = (wc * hc * dc) / 1000
      surfaceCm2 = wc * dc
    }
  } else {
    const diam = parseFloat(diameter), h = parseFloat(height)
    if (diam > 0 && h > 0) {
      const rc = toCm(diam, unitSystem) / 2, hc = toCm(h, unitSystem)
      litres = (Math.PI * rc * rc * hc) / 1000
      surfaceCm2 = Math.PI * rc * rc
    }
  }

  const gallonsUS  = litres != null ? litres * 0.264172 : null
  const gallonsUK  = litres != null ? litres * 0.219969 : null
  const usable     = litres != null ? litres * 0.8 : null
  const surfaceStr = surfaceCm2 != null ? fmtSurface(surfaceCm2, unitSystem) : null

  function NumInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div>
        <FieldLabel>{label} ({unitSystem})</FieldLabel>
        <input
          type="number" min="0" step={dp.step}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={dp.placeholder}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>
    )
  }

  const shapeBtn = (id: TankShape, label: string) => {
    const active = shape === id
    return (
      <button
        key={id}
        onClick={() => { setShape(id); setWidth(''); setHeight(''); setDepth(''); setDiameter('') }}
        style={{
          padding: '6px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: active ? 500 : 400,
          border: active ? '0.5px solid var(--blue-border)' : '0.5px solid var(--btn-border)',
          background: active ? 'var(--blue-bg)' : 'transparent',
          color: active ? 'var(--blue)' : 'var(--text-2)',
        }}
      >{label}</button>
    )
  }

  const statCell = (label: string, value: string, sub?: string) => (
    <div key={label}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--blue)' }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>{sub}</p>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
        Enter your tank's <strong style={{ color: 'var(--text)', fontWeight: 500 }}>interior</strong> measurements (glass-to-glass)
        for the most accurate result.
      </p>

      <Card>
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Tank shape</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {shapeBtn('rectangular', 'Rectangular')}
            {shapeBtn('cylinder', 'Cylinder')}
          </div>
        </div>

        {shape === 'rectangular' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <NumInput label="Width" value={width} onChange={setWidth} />
            <NumInput label="Height" value={height} onChange={setHeight} />
            <NumInput label="Depth" value={depth} onChange={setDepth} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <NumInput label="Diameter" value={diameter} onChange={setDiameter} />
            <NumInput label="Height" value={height} onChange={setHeight} />
          </div>
        )}
      </Card>

      {litres != null && (
        <div style={{ background: 'var(--blue-bg)', border: '0.5px solid var(--blue-border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Total volume
            </p>
            <p style={{ margin: 0, lineHeight: 1 }}>
              <span style={{ fontSize: 52, fontWeight: 700, color: 'var(--blue)' }}>{litres.toFixed(1)}</span>
              <span style={{ fontSize: 22, fontWeight: 400, color: 'var(--blue)', marginLeft: 8 }}>L</span>
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${surfaceStr ? 4 : 3}, minmax(100px, 1fr))`,
            gap: 12, paddingTop: 16, borderTop: '0.5px solid var(--blue-border)',
          }}>
            {statCell('US gallons', `${gallonsUS!.toFixed(1)} gal`)}
            {statCell('UK gallons', `${gallonsUK!.toFixed(1)} gal`)}
            {statCell('Usable (~80%)', `${usable!.toFixed(1)} L`, 'After substrate & decor')}
            {surfaceStr && statCell('Surface area', surfaceStr, 'Top water surface')}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Calculator components map ─────────────────────────────────────────────────

const CALC_COMPONENTS: Record<CalcId, () => JSX.Element> = {
  volume: VolumeCalculator,
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Calculators() {
  const [active, setActive] = useState<CalcId>('volume')
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const ActiveCalc = CALC_COMPONENTS[active]
  const activeDef = CALCULATORS.find(c => c.id === active)!

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Calculators</h1>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: 'flex-start' }}>

        {/* Sidebar — horizontal scroll on mobile, vertical list on desktop */}
        {isMobile ? (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, width: '100%' }}>
            {CALCULATORS.map(c => {
              const isActive = c.id === active
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                    fontWeight: isActive ? 500 : 400, flexShrink: 0,
                    border: isActive ? '0.5px solid var(--blue-border)' : '0.5px solid var(--btn-border)',
                    background: isActive ? 'var(--blue-bg)' : 'var(--surface)',
                    color: isActive ? 'var(--blue)' : 'var(--text-2)',
                  }}
                >
                  <c.icon size={13} />{c.label}
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {CALCULATORS.map(c => {
              const isActive = c.id === active
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
                    border: isActive ? '0.5px solid var(--blue-border)' : '0.5px solid transparent',
                    background: isActive ? 'var(--blue-bg)' : 'transparent',
                  }}
                >
                  <c.icon size={15} color={isActive ? 'var(--blue)' : 'var(--text-3)'} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--blue)' : 'var(--text)' }}>
                      {c.label}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>{c.hint}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Active calculator */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!isMobile && (
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>
              {activeDef.label}
            </h2>
          )}
          <ActiveCalc />
        </div>
      </div>
    </div>
  )
}
