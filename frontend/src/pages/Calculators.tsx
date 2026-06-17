import { useState, useEffect } from 'react'
import { Ruler, FlaskConical, type LucideIcon } from 'lucide-react'
import { Card, FieldLabel } from '../components/ui'
import { useSettings, dimInputProps } from '../context/SettingsContext'

// ── Calculator registry ───────────────────────────────────────────────────────

type CalcId = 'volume' | 'dosage'

interface CalcDef {
  id: CalcId
  label: string
  hint: string
  icon: LucideIcon
}

const CALCULATORS: CalcDef[] = [
  { id: 'volume',  label: 'Tank Volume',       hint: 'From dimensions',      icon: Ruler         },
  { id: 'dosage',  label: 'Chemical Dosage',   hint: 'API liquid & powder',  icon: FlaskConical  },
]

// ── Volume calculator ─────────────────────────────────────────────────────────

type TankShape = 'rectangular' | 'cylinder'

function toCm(v: number, unit: 'mm' | 'cm' | 'm'): number {
  if (unit === 'mm') return v / 10
  if (unit === 'm')  return v * 100
  return v
}

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

// ── Dosage calculator ─────────────────────────────────────────────────────────

type DoseUnit = 'ml' | 'packet'

interface APIProduct {
  id: string
  name: string
  category: 'conditioner' | 'bacteria' | 'treatment' | 'ph'
  use: string
  doseAmount: number  // per 10 US gallons
  doseUnit: DoseUnit
  schedule?: string
  warning?: string
}

// 10 US gallons in litres
const TEN_GAL_L = 37.854

const CATEGORY_LABELS: Record<string, string> = {
  conditioner: 'Conditioner',
  bacteria:    'Bacteria',
  treatment:   'Treatment',
  ph:          'pH',
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  conditioner: { bg: 'var(--blue-bg)',  color: 'var(--blue)'  },
  bacteria:    { bg: 'var(--green-bg)', color: 'var(--green)' },
  treatment:   { bg: 'var(--red-bg)',   color: 'var(--red)'   },
  ph:          { bg: 'var(--orange-bg, #fff4e6)', color: 'var(--orange, #c27216)' },
}

const API_PRODUCTS: APIProduct[] = [
  // Conditioners
  {
    id: 'aqua-essential',
    name: 'Aqua Essential',
    category: 'conditioner',
    use: 'Removes chlorine & chloramines, detoxifies ammonia, nitrite and nitrate',
    doseAmount: 5,
    doseUnit: 'ml',
    schedule: 'Add when performing water changes or setting up a new tank. Dose proportionally to the volume of water being replaced.',
  },
  {
    id: 'stress-coat',
    name: 'Stress Coat+',
    category: 'conditioner',
    use: 'Removes chlorine & chloramines, promotes slime coat',
    doseAmount: 5,
    doseUnit: 'ml',
    schedule: 'Add when performing water changes or when fish are stressed.',
  },
  {
    id: 'ammo-lock',
    name: 'Ammo Lock',
    category: 'conditioner',
    use: 'Detoxifies ammonia and neutralises nitrite stress',
    doseAmount: 5,
    doseUnit: 'ml',
    schedule: 'Use when ammonia or nitrite is detected. Safe to repeat every 24 hours. Continue until readings reach zero.',
  },
  // Bacteria
  {
    id: 'quick-start',
    name: 'Quick Start',
    category: 'bacteria',
    use: 'Live nitrifying bacteria for cycling and water changes',
    doseAmount: 5,
    doseUnit: 'ml',
    schedule: 'Add when setting up a new tank or after a large water change. Dose again with each subsequent change.',
  },
  // Treatments
  {
    id: 'melafix',
    name: 'Melafix',
    category: 'treatment',
    use: 'Treats bacterial infections — fin rot, eye cloud, body slime',
    doseAmount: 5,
    doseUnit: 'ml',
    schedule: 'Add daily for 7 days. On day 8, perform a 25% water change. Repeat if needed.',
  },
  {
    id: 'pimafix',
    name: 'Pimafix',
    category: 'treatment',
    use: 'Treats fungal infections, mouth fungus and cotton wool disease',
    doseAmount: 5,
    doseUnit: 'ml',
    schedule: 'Add daily for 7 days. On day 8, perform a 25% water change. Can be used alongside Melafix.',
  },
  {
    id: 'super-ick-cure',
    name: 'Super Ick Cure',
    category: 'treatment',
    use: 'Kills Ich (white spot) and other external parasites',
    doseAmount: 5,
    doseUnit: 'ml',
    schedule: 'Perform a 25% water change, then add dose. Repeat every other day until Ich clears (usually 3–5 doses).',
    warning: 'Remove activated carbon during treatment. Not safe for scaleless fish (loaches, catfish), invertebrates, or live plants.',
  },
  {
    id: 'general-cure',
    name: 'General Cure',
    category: 'treatment',
    use: 'Treats internal & external parasites — flukes, worms, velvet, fish lice',
    doseAmount: 1,
    doseUnit: 'packet',
    schedule: 'Add dose on day 1. Repeat the same dose after 48 hours. On day 5, perform a 25% water change.',
    warning: 'Remove activated carbon before dosing. Not safe for invertebrates.',
  },
  {
    id: 'erythromycin',
    name: 'E.M. Erythromycin',
    category: 'treatment',
    use: 'Antibiotic for Gram-positive bacterial infections — fin rot, pop-eye, body slime',
    doseAmount: 1,
    doseUnit: 'packet',
    schedule: 'Add dose every 24 hours for 3 consecutive days. On day 4, perform a 25% water change.',
    warning: 'Remove activated carbon. May temporarily inhibit nitrifying bacteria — monitor ammonia closely.',
  },
  {
    id: 'tetracycline',
    name: 'Tetracycline',
    category: 'treatment',
    use: 'Antibiotic for Gram-negative bacterial infections — pop-eye, fin rot, columnaris',
    doseAmount: 1,
    doseUnit: 'packet',
    schedule: 'Add dose every 24 hours for 4 consecutive days. On day 5, perform a 25% water change.',
    warning: 'Remove activated carbon. Not for use in marine or reef tanks. May temporarily inhibit nitrifying bacteria.',
  },
  {
    id: 'fin-body-cure',
    name: 'Fin & Body Cure',
    category: 'treatment',
    use: 'Broad-spectrum treatment for bacterial fin, tail and body infections',
    doseAmount: 1,
    doseUnit: 'packet',
    schedule: 'Add dose every 24 hours for 5 consecutive days. On day 6, perform a 25% water change.',
    warning: 'Remove activated carbon before dosing.',
  },
  {
    id: 'fungus-cure',
    name: 'Fungus Cure',
    category: 'treatment',
    use: 'Treats external fungal infections and associated secondary bacterial infections',
    doseAmount: 1,
    doseUnit: 'packet',
    schedule: 'Add dose every 24 hours for 4 consecutive days. On day 5, perform a 25% water change.',
    warning: 'Remove activated carbon. Use with caution in tanks with scaleless fish.',
  },
  // pH
  {
    id: 'ph-up',
    name: 'pH Up',
    category: 'ph',
    use: 'Raises and stabilises pH',
    doseAmount: 1,
    doseUnit: 'ml',
    schedule: 'Add slowly to a high-flow area. Test pH after 1 hour and repeat if needed. Do not change pH by more than 0.2 per day.',
    warning: 'Rapid pH changes stress fish. Never mix pH Up and pH Down directly. Target slow, gradual adjustment.',
  },
  {
    id: 'ph-down',
    name: 'pH Down',
    category: 'ph',
    use: 'Lowers and stabilises pH',
    doseAmount: 1,
    doseUnit: 'ml',
    schedule: 'Add slowly to a high-flow area. Test pH after 1 hour and repeat if needed. Do not change pH by more than 0.2 per day.',
    warning: 'Rapid pH changes stress fish. Never mix pH Down and pH Up directly. Target slow, gradual adjustment.',
  },
]

const DOSAGE_CATEGORIES = [
  { id: 'all',         label: 'All' },
  { id: 'conditioner', label: 'Conditioners' },
  { id: 'bacteria',    label: 'Bacteria' },
  { id: 'treatment',   label: 'Treatments' },
  { id: 'ph',          label: 'pH' },
]

function DosageCalculator() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [volume, setVolume] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const filtered = catFilter === 'all'
    ? API_PRODUCTS
    : API_PRODUCTS.filter(p => p.category === catFilter)

  const selected = API_PRODUCTS.find(p => p.id === selectedId)
  const vol = parseFloat(volume)

  let dose: number | null = null
  if (selected && vol > 0) {
    dose = (vol / TEN_GAL_L) * selected.doseAmount
  }

  const filterBtn = (id: string, label: string) => {
    const active = catFilter === id
    return (
      <button
        key={id}
        onClick={() => setCatFilter(id)}
        style={{
          padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: active ? 500 : 400,
          border: active ? '0.5px solid var(--blue-border)' : '0.5px solid var(--btn-border)',
          background: active ? 'var(--blue-bg)' : 'transparent',
          color: active ? 'var(--blue)' : 'var(--text-2)',
        }}
      >{label}</button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
        Select an <strong style={{ color: 'var(--text)', fontWeight: 500 }}>API</strong> product and enter the
        volume of water being treated — the full tank for a new setup, or just the water being added for a water change.
      </p>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {DOSAGE_CATEGORIES.map(c => filterBtn(c.id, c.label))}
      </div>

      {/* Product grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 8 }}>
        {filtered.map(p => {
          const isActive = selectedId === p.id
          const cat = CATEGORY_COLORS[p.category]
          return (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: isActive ? '1.5px solid var(--blue)' : '0.5px solid var(--border)',
                background: isActive ? 'var(--blue-bg)' : 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: isActive ? 'var(--blue)' : 'var(--text)', lineHeight: 1.3 }}>
                  {p.name}
                </p>
                <span style={{
                  flexShrink: 0, fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                  background: cat.bg, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {CATEGORY_LABELS[p.category]}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>{p.use}</p>
            </button>
          )
        })}
      </div>

      {/* Volume input */}
      <Card>
        <FieldLabel>Volume of water to treat (litres)</FieldLabel>
        <input
          type="number" min="0" step="1"
          value={volume} onChange={e => setVolume(e.target.value)}
          placeholder="e.g. 50"
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-3)' }}>
          {!selectedId
            ? 'Select a product above to see the dose.'
            : 'Enter the full tank volume for a new setup, or just the volume of water being added for a water change.'}
        </p>
      </Card>

      {/* Result */}
      {selected && dose !== null && (
        <div style={{ background: 'var(--blue-bg)', border: '0.5px solid var(--blue-border)', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            API {selected.name} — dose for {vol.toFixed(0)} L
          </p>
          <p style={{ margin: '0 0 4px', lineHeight: 1 }}>
            <span style={{ fontSize: 52, fontWeight: 700, color: 'var(--blue)' }}>
              {selected.doseUnit === 'ml' ? dose.toFixed(1) : dose.toFixed(2)}
            </span>
            <span style={{ fontSize: 22, fontWeight: 400, color: 'var(--blue)', marginLeft: 8 }}>
              {selected.doseUnit === 'ml' ? 'mL' : dose === 1 ? 'packet' : 'packets'}
            </span>
          </p>

          {selected.doseUnit === 'ml' && (
            <p style={{ margin: '0 0 0', fontSize: 12, color: 'var(--text-2)' }}>
              ≈ {(dose / 4.92892).toFixed(1)} tsp &nbsp;·&nbsp; {(dose / 14.7868).toFixed(1)} tbsp
            </p>
          )}
          {selected.doseUnit === 'packet' && dose !== Math.round(dose) && (
            <p style={{ margin: '0 0 0', fontSize: 12, color: 'var(--text-2)' }}>
              i.e. {dose < 1 ? `${(dose * 100).toFixed(0)}% of a packet` : `${Math.floor(dose)} full + ${((dose % 1) * 100).toFixed(0)}% of a packet`}
            </p>
          )}

          {selected.schedule && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid var(--blue-border)' }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Dosing schedule
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.7 }}>{selected.schedule}</p>
            </div>
          )}

          {selected.warning && (
            <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 8, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--red)', lineHeight: 1.6 }}>
                ⚠ {selected.warning}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Calculator components map ─────────────────────────────────────────────────

const CALC_COMPONENTS: Record<CalcId, () => JSX.Element> = {
  volume: VolumeCalculator,
  dosage: DosageCalculator,
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
