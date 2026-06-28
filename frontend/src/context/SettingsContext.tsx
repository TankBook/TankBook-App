import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type Theme = 'light' | 'dark'
export type UnitSystem = 'mm' | 'cm' | 'm'

interface SettingsContextValue {
  dateFormat: DateFormat
  setDateFormat: (f: DateFormat) => Promise<void>
  unitSystem: UnitSystem
  setUnitSystem: (u: UnitSystem) => Promise<void>
  defaultTank: string | null
  setDefaultTank: (id: string | null) => Promise<void>
  alertRetentionDays: number | null
  setAlertRetentionDays: (days: number | null) => Promise<void>
  appUrl: string | null
  setAppUrl: (url: string | null) => Promise<void>
  theme: Theme
  toggleTheme: () => void
  loading: boolean
}

const SettingsContext = createContext<SettingsContextValue>({
  dateFormat: 'DD/MM/YYYY',
  setDateFormat: async () => {},
  unitSystem: 'cm',
  setUnitSystem: async () => {},
  defaultTank: null,
  setDefaultTank: async () => {},
  alertRetentionDays: null,
  setAlertRetentionDays: async () => {},
  appUrl: null,
  setAppUrl: async () => {},
  theme: 'light',
  toggleTheme: () => {},
  loading: true,
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [dateFormat, setDateFormatState] = useState<DateFormat>('DD/MM/YYYY')
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('cm')
  const [defaultTank, setDefaultTankState] = useState<string | null>(null)
  const [alertRetentionDays, setAlertRetentionDaysState] = useState<number | null>(null)
  const [appUrl, setAppUrlState] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'light'
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/')
      .then(r => r.json())
      .then(d => {
        setDateFormatState(d.date_format)
        setUnitSystemState(d.unit_system ?? 'cm')
        setDefaultTankState(d.default_tank_id ?? null)
        setAlertRetentionDaysState(d.alert_retention_days ?? null)
        setAppUrlState(d.app_url ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  async function setDateFormat(f: DateFormat) {
    setDateFormatState(f)
    await fetch('/api/settings/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_format: f }),
    })
  }

  async function setUnitSystem(u: UnitSystem) {
    setUnitSystemState(u)
    await fetch('/api/settings/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit_system: u }),
    })
  }

  async function setDefaultTank(id: string | null) {
    setDefaultTankState(id)
    await fetch('/api/settings/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_tank_id: id }),
    })
  }

  async function setAlertRetentionDays(days: number | null) {
    setAlertRetentionDaysState(days)
    await fetch('/api/settings/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_retention_days: days }),
    })
  }

  async function setAppUrl(url: string | null) {
    setAppUrlState(url)
    await fetch('/api/settings/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_url: url || null }),
    })
  }

  function toggleTheme() {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }

  return (
    <SettingsContext.Provider value={{ dateFormat, setDateFormat, unitSystem, setUnitSystem, defaultTank, setDefaultTank, alertRetentionDays, setAlertRetentionDays, appUrl, setAppUrl, theme, toggleTheme, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}

export function formatDate(date: string | Date, format: DateFormat): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()

  switch (format) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`
    case 'DD/MM/YYYY':
    default:
      return `${dd}/${mm}/${yyyy}`
  }
}

export function formatDateTime(date: string | Date, format: DateFormat): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(d, format)} ${hh}:${min}`
}

export function fromMM(mm: number, unit: UnitSystem): number {
  if (unit === 'cm') return mm / 10
  if (unit === 'm') return mm / 1000
  return mm
}

export function toMM(value: number, unit: UnitSystem): number {
  if (unit === 'cm') return Math.round(value * 10)
  if (unit === 'm') return Math.round(value * 1000)
  return Math.round(value)
}

export function fmtDim(mm: number | null | undefined, unit: UnitSystem): string {
  if (mm == null) return '—'
  const v = fromMM(mm, unit)
  if (unit === 'mm') return `${v} mm`
  if (unit === 'cm') return `${parseFloat(v.toFixed(1))} cm`
  return `${parseFloat(v.toFixed(3))} m`
}

export function dimInputProps(unit: UnitSystem): { step: string; placeholder: string } {
  if (unit === 'mm') return { step: '1', placeholder: 'e.g. 600' }
  if (unit === 'cm') return { step: '0.1', placeholder: 'e.g. 60' }
  return { step: '0.001', placeholder: 'e.g. 0.6' }
}
