import { useState } from 'react'
import { CalendarDays, Ruler, UserCircle } from 'lucide-react'
import { Card } from '../components/ui'
import { useSettings, formatDate, DateFormat, UnitSystem } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'

const FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK / Europe)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
]

const UNIT_OPTIONS: { value: UnitSystem; label: string; example: string }[] = [
  { value: 'mm', label: 'Millimetres (mm)', example: '600 × 400 × 300 mm' },
  { value: 'cm', label: 'Centimetres (cm)', example: '60 × 40 × 30 cm' },
  { value: 'm',  label: 'Metres (m)',        example: '0.6 × 0.4 × 0.3 m' },
  { value: 'imperial', label: 'Imperial (inches)', example: '23.62 × 15.75 × 11.81 in' },
]

export default function Profile() {
  const { user } = useAuth()
  const { dateFormat, setDateFormat, unitSystem, setUnitSystem } = useSettings()
  const [savingDateFormat, setSavingDateFormat] = useState(false)
  const [savingUnitSystem, setSavingUnitSystem] = useState(false)
  const exampleDate = new Date()

  async function pickDateFormat(f: DateFormat) {
    setSavingDateFormat(true)
    try { await setDateFormat(f) } finally { setSavingDateFormat(false) }
  }

  async function pickUnitSystem(u: UnitSystem) {
    setSavingUnitSystem(true)
    try { await setUnitSystem(u) } finally { setSavingUnitSystem(false) }
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <UserCircle size={20} />Profile
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-2)' }}>
        Your own preferences — these apply only to {user?.display_name || user?.email}, not the rest of this instance.
      </p>

      <Card style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, padding: 24 }}>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14} color="var(--text-2)" />Date Format</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Controls how dates are displayed across tanks, parameters, and the maintenance schedule.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: savingDateFormat ? 0.6 : 1 }}>
            {FORMAT_OPTIONS.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: dateFormat === opt.value ? '1px solid var(--blue-border)' : '0.5px solid var(--border)',
                  background: dateFormat === opt.value ? 'var(--blue-bg)' : 'transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="dateFormat"
                    checked={dateFormat === opt.value}
                    disabled={savingDateFormat}
                    onChange={() => pickDateFormat(opt.value)}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{opt.label}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                  {formatDate(exampleDate, opt.value)}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Ruler size={14} color="var(--text-2)" />Dimension Units</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Controls how tank dimensions (width, height, depth) are displayed and entered. Changing this converts existing values automatically.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: savingUnitSystem ? 0.6 : 1 }}>
            {UNIT_OPTIONS.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: unitSystem === opt.value ? '1px solid var(--blue-border)' : '0.5px solid var(--border)',
                  background: unitSystem === opt.value ? 'var(--blue-bg)' : 'transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="unitSystem"
                    checked={unitSystem === opt.value}
                    disabled={savingUnitSystem}
                    onChange={() => pickUnitSystem(opt.value)}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{opt.label}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>{opt.example}</span>
              </label>
            ))}
          </div>
        </section>

      </Card>
    </div>
  )
}
