import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { DashboardSectionLayout } from '../api/client'

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type Theme = 'light' | 'dark'
export type UnitSystem = 'mm' | 'cm' | 'm' | 'imperial'

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
  feedingAmountPresets: string[]
  setFeedingAmountPresets: (presets: string[]) => Promise<void>
  allowTankCreation: boolean
  setAllowTankCreation: (allow: boolean) => Promise<void>
  dashboardLayout: DashboardSectionLayout[]
  setDashboardLayout: (layout: DashboardSectionLayout[]) => Promise<void>
  dashboardStats: string[]
  setDashboardStats: (keys: string[]) => Promise<void>
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
  feedingAmountPresets: [],
  setFeedingAmountPresets: async () => {},
  allowTankCreation: true,
  setAllowTankCreation: async () => {},
  dashboardLayout: [],
  setDashboardLayout: async () => {},
  dashboardStats: [],
  setDashboardStats: async () => {},
  theme: 'light',
  toggleTheme: () => {},
  loading: true,
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Date format and unit system are per-user preferences, edited on the Profile page —
  // sourced from and persisted to the logged-in account rather than the shared app settings.
  const { user, updateProfile } = useAuth()
  const dateFormat = (user?.date_format as DateFormat) ?? 'DD/MM/YYYY'
  const unitSystem = (user?.unit_system as UnitSystem) ?? 'cm'
  const dashboardLayout = user?.dashboard_layout ?? []
  const dashboardStats = user?.dashboard_stats ?? []
  const defaultTank = user?.default_tank_id ?? null
  const [alertRetentionDays, setAlertRetentionDaysState] = useState<number | null>(null)
  const [appUrl, setAppUrlState] = useState<string | null>(null)
  const [feedingAmountPresets, setFeedingAmountPresetsState] = useState<string[]>([])
  const [allowTankCreation, setAllowTankCreationState] = useState(true)
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'light'
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/')
      .then(r => r.json())
      .then(d => {
        setAlertRetentionDaysState(d.alert_retention_days ?? null)
        setAppUrlState(d.app_url ?? null)
        setFeedingAmountPresetsState(d.feeding_amount_presets ?? [])
        setAllowTankCreationState(d.allow_tank_creation ?? true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  async function setDateFormat(f: DateFormat) {
    await updateProfile({ date_format: f })
  }

  async function setUnitSystem(u: UnitSystem) {
    await updateProfile({ unit_system: u })
  }

  async function setDashboardLayout(layout: DashboardSectionLayout[]) {
    await updateProfile({ dashboard_layout: layout })
  }

  async function setDashboardStats(keys: string[]) {
    await updateProfile({ dashboard_stats: keys })
  }

  async function setDefaultTank(id: string | null) {
    await updateProfile({ default_tank_id: id })
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

  async function setFeedingAmountPresets(presets: string[]) {
    setFeedingAmountPresetsState(presets)
    await fetch('/api/settings/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feeding_amount_presets: presets }),
    })
  }

  async function setAllowTankCreation(allow: boolean) {
    setAllowTankCreationState(allow)
    await fetch('/api/settings/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allow_tank_creation: allow }),
    })
  }

  function toggleTheme() {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }

  return (
    <SettingsContext.Provider value={{ dateFormat, setDateFormat, unitSystem, setUnitSystem, defaultTank, setDefaultTank, alertRetentionDays, setAlertRetentionDays, appUrl, setAppUrl, feedingAmountPresets, setFeedingAmountPresets, allowTankCreation, setAllowTankCreation, dashboardLayout, setDashboardLayout, dashboardStats, setDashboardStats, theme, toggleTheme, loading }}>
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
  if (unit === 'imperial') return mm / 25.4
  return mm
}

export function toMM(value: number, unit: UnitSystem): number {
  if (unit === 'cm') return Math.round(value * 10)
  if (unit === 'm') return Math.round(value * 1000)
  if (unit === 'imperial') return Math.round(value * 25.4)
  return Math.round(value)
}

export function fmtDim(mm: number | null | undefined, unit: UnitSystem): string {
  if (mm == null) return '—'
  const v = fromMM(mm, unit)
  if (unit === 'mm') return `${v} mm`
  if (unit === 'cm') return `${parseFloat(v.toFixed(1))} cm`
  if (unit === 'imperial') return `${parseFloat(v.toFixed(2))} in`
  return `${parseFloat(v.toFixed(3))} m`
}

export function dimInputProps(unit: UnitSystem): { step: string; placeholder: string } {
  if (unit === 'mm') return { step: '1', placeholder: 'e.g. 600' }
  if (unit === 'cm') return { step: '0.1', placeholder: 'e.g. 60' }
  if (unit === 'imperial') return { step: '0.01', placeholder: 'e.g. 23.62' }
  return { step: '0.001', placeholder: 'e.g. 0.6' }
}
