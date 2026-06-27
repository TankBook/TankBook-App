import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Cog, NotebookPen, ShieldCheck, Calculator, Receipt, Menu, X, Plus, Fish, Droplets, ChevronLeft, type LucideIcon } from 'lucide-react'
import { api } from './api/client'

function GitHubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function AquaDropIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C12 21 4.5 14 4.5 9.5C4.5 5.91 7.91 3 12 3C16.09 3 19.5 5.91 19.5 9.5C19.5 14 12 21 12 21Z"
        fill="#26C6DA" fillOpacity="0.2" stroke="#26C6DA" strokeWidth="1.6" strokeLinejoin="round"
      />
      <path d="M12 17.5V11" stroke="#43A047" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M12 15.5C12 15.5 8.5 13.5 8.5 10.5C8.5 10.5 12 11 12 15.5Z" fill="#43A047"/>
      <path d="M12 12.5C12 12.5 15.5 10.5 15.5 7.5C15.5 7.5 12 8 12 12.5Z" fill="#43A047"/>
    </svg>
  )
}
import Dashboard from './pages/Dashboard'
import SpendingTracker from './pages/SpendingTracker'
import TankDetail from './pages/TankDetail'
import SpeciesBrowser from './pages/SpeciesBrowser'
import Settings from './pages/Settings'
import LivestockJournal from './pages/LivestockJournal'
import CompatibilityChecker from './pages/CompatibilityChecker'
import Calculators from './pages/Calculators'
import { SettingsProvider, useSettings } from './context/SettingsContext'

const QA_CATEGORIES = ['Equipment', 'Livestock', 'Plants', 'Food', 'Chemicals', 'Medication', 'Decor', 'Subscription', 'Other']

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function QuickAdd() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'pick' | 'tank' | 'param' | 'expense'>('pick')
  const [tanks, setTanks] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  const [qaName, setQaName] = useState('')
  const [qaVolume, setQaVolume] = useState('')
  const [qaWaterType, setQaWaterType] = useState('freshwater')

  const [paramTank, setParamTank] = useState('')
  const [ph, setPh] = useState('')
  const [temp, setTemp] = useState('')
  const [ammonia, setAmmonia] = useState('')
  const [nitrite, setNitrite] = useState('')
  const [nitrate, setNitrate] = useState('')

  const [expTank, setExpTank] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expCat, setExpCat] = useState(QA_CATEGORIES[0])
  const [expDesc, setExpDesc] = useState('')
  const [expDate, setExpDate] = useState(todayIso)

  useEffect(() => {
    if (open) api.tanks.list().then(t => {
      setTanks(t)
      if (t.length) setParamTank(t[0].id)
    })
  }, [open])

  function resetForms() {
    setMode('pick'); setSaving(false)
    setQaName(''); setQaVolume(''); setQaWaterType('freshwater')
    setPh(''); setTemp(''); setAmmonia(''); setNitrite(''); setNitrate('')
    setExpTank(''); setExpAmount(''); setExpCat(QA_CATEGORIES[0]); setExpDesc(''); setExpDate(todayIso())
  }

  function close() { setOpen(false); resetForms() }

  async function saveTank() {
    if (!qaName || !qaVolume) return
    setSaving(true)
    try {
      await api.tanks.create({ name: qaName, volume_litres: Number(qaVolume), water_type: qaWaterType, co2_injection: false, has_heater: false, heater_watts: null, setup_date: null, substrate: null, lighting: null, filter_flow_lph: null, width_mm: null, height_mm: null, depth_mm: null })
      close()
    } finally { setSaving(false) }
  }

  async function saveParam() {
    if (!paramTank) return
    setSaving(true)
    try {
      await api.parameters.log(paramTank, { ph: ph ? Number(ph) : null, temperature_c: temp ? Number(temp) : null, ammonia_ppm: ammonia ? Number(ammonia) : null, nitrite_ppm: nitrite ? Number(nitrite) : null, nitrate_ppm: nitrate ? Number(nitrate) : null, gh_dgh: null, kh_dkh: null, salinity_ppt: null, specific_gravity: null, notes: null })
      close()
    } finally { setSaving(false) }
  }

  async function saveExpense() {
    if (!expAmount || isNaN(Number(expAmount))) return
    setSaving(true)
    try {
      await api.spending.add({ tank_id: expTank || null, amount: Number(expAmount), category: expCat, description: expDesc || null, purchase_date: expDate, notes: null })
      close()
    } finally { setSaving(false) }
  }

  const lbl = (text: string) => <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{text}</p>

  const backBtn = (
    <button onClick={() => setMode('pick')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, padding: 0, marginBottom: 16 }}>
      <ChevronLeft size={13} />Back
    </button>
  )

  const saveRow = (onClick: () => void, disabled: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
      <button onClick={onClick} disabled={disabled || saving} style={{ padding: '7px 20px', borderRadius: 8, border: '0.5px solid var(--blue-border)', background: disabled || saving ? 'var(--surface-2)' : 'var(--blue-bg)', color: disabled || saving ? 'var(--text-3)' : 'var(--blue)', fontWeight: 500, fontSize: 13, cursor: disabled || saving ? 'default' : 'pointer' }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )

  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box' }

  let body: React.ReactNode = null

  if (mode === 'pick') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {([
          { Icon: Fish,     label: 'Add Tank',            sub: 'Create a new tank',            m: 'tank'    },
          { Icon: Droplets, label: 'Record Parameters',   sub: 'Log water quality for a tank', m: 'param'   },
          { Icon: Receipt,  label: 'New Expense',         sub: 'Track a purchase',             m: 'expense' },
        ] as const).map(({ Icon, label, sub, m }) => (
          <button key={m} onClick={() => setMode(m)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%', border: '0.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}>
            <span style={{ color: 'var(--blue)', lineHeight: 0, flexShrink: 0 }}><Icon size={16} /></span>
            <span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{label}</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{sub}</span>
            </span>
          </button>
        ))}
      </div>
    )
  } else if (mode === 'tank') {
    body = (
      <>
        {backBtn}
        <p style={{ margin: '0 0 16px', fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>Add Tank</p>
        <div style={{ marginBottom: 12 }}>
          {lbl('Tank name *')}
          <input value={qaName} onChange={e => setQaName(e.target.value)} placeholder="e.g. Living Room Display" style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            {lbl('Volume (litres) *')}
            <input type="number" min="1" value={qaVolume} onChange={e => setQaVolume(e.target.value)} placeholder="200" style={inputStyle} />
          </div>
          <div>
            {lbl('Water type')}
            <select value={qaWaterType} onChange={e => setQaWaterType(e.target.value)} style={{ width: '100%' }}>
              <option value="freshwater">Freshwater</option>
              <option value="marine">Marine</option>
              <option value="brackish">Brackish</option>
            </select>
          </div>
        </div>
        {saveRow(saveTank, !qaName || !qaVolume)}
      </>
    )
  } else if (mode === 'param') {
    body = (
      <>
        {backBtn}
        <p style={{ margin: '0 0 16px', fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>Record Parameters</p>
        <div style={{ marginBottom: 12 }}>
          {lbl('Tank *')}
          <select value={paramTank} onChange={e => setParamTank(e.target.value)} style={{ width: '100%' }}>
            {tanks.length === 0 && <option value="">No tanks yet</option>}
            {tanks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([
            { label: 'pH',           value: ph,      set: setPh,      ph: '7.0' },
            { label: 'Temp (°C)',    value: temp,    set: setTemp,    ph: '25'  },
            { label: 'Ammonia ppm', value: ammonia,  set: setAmmonia, ph: '0.0' },
            { label: 'Nitrite ppm', value: nitrite,  set: setNitrite, ph: '0.0' },
            { label: 'Nitrate ppm', value: nitrate,  set: setNitrate, ph: '20'  },
          ]).map(f => (
            <div key={f.label}>
              {lbl(f.label)}
              <input type="number" step="any" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={inputStyle} />
            </div>
          ))}
        </div>
        {saveRow(saveParam, !paramTank || tanks.length === 0)}
      </>
    )
  } else if (mode === 'expense') {
    body = (
      <>
        {backBtn}
        <p style={{ margin: '0 0 16px', fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>New Expense</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            {lbl('Amount (£) *')}
            <input type="number" min="0" step="0.01" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
          <div>
            {lbl('Category')}
            <select value={expCat} onChange={e => setExpCat(e.target.value)} style={{ width: '100%' }}>
              {QA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          {lbl('Description')}
          <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="e.g. Fluval 307 canister filter" style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
          <div>
            {lbl('Tank (optional)')}
            <select value={expTank} onChange={e => setExpTank(e.target.value)} style={{ width: '100%' }}>
              <option value="">None</option>
              {tanks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            {lbl('Date')}
            <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} style={inputStyle} />
          </div>
        </div>
        {saveRow(saveExpense, !expAmount || isNaN(Number(expAmount)))}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Quick add"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: '0.5px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', marginRight: 6 }}
      >
        <Plus size={15} />
      </button>

      {open && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440, margin: '0 16px', boxShadow: '0 16px 48px rgba(0,0,0,0.22)', border: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: mode === 'pick' ? 16 : 0 }}>
              <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>{mode === 'pick' ? 'Quick Add' : ''}</p>
              <button onClick={close} style={{ lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0, marginLeft: 12, flexShrink: 0 }}><X size={16} /></button>
            </div>
            {body}
          </div>
        </div>
      )}
    </>
  )
}

const NAV_LINKS: [string, string, LucideIcon][] = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/species', 'Species', BookOpen],
  ['/compatibility', 'Compatibility', ShieldCheck],
  ['/journal', 'Tank Journal', NotebookPen],
  ['/calculators', 'Calculators', Calculator],
  ['/spending', 'Spending', Receipt],
]

function Nav() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => { setIsMobile(e.matches); setMenuOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const link = (to: string, label: string, Icon: LucideIcon, onClick?: () => void) => (
    <Link to={to} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 14,
      background: pathname === to ? 'var(--blue-bg)' : 'transparent',
      color: pathname === to ? 'var(--blue)' : 'var(--text-2)',
      fontWeight: pathname === to ? 500 : 400,
    }}>
      <Icon size={14} />
      {label}
    </Link>
  )

  return (
    <nav style={{
      position: 'relative',
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '12px 24px', borderBottom: '0.5px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24, textDecoration: 'none' }}>
        <AquaDropIcon size={26} />
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '0.04em' }}>TANKBOOK</span>
          <span style={{ fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.06em', fontWeight: 500 }}>LOG. CARE. THRIVE.</span>
        </span>
      </span>

      {!isMobile && NAV_LINKS.map(([to, label, Icon]) => link(to, label, Icon))}

      <span style={{ flex: 1 }} />

      <QuickAdd />

      <button
        onClick={toggleTheme}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        style={{
          fontSize: 15, padding: '4px 8px',
          border: '0.5px solid var(--border)', borderRadius: 8,
          background: 'transparent', color: 'var(--text-2)',
          cursor: 'pointer', lineHeight: 1, marginRight: 4,
        }}
      >
        {theme === 'light' ? '☾' : '☀'}
      </button>

      {isMobile ? (
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '6px', border: '0.5px solid var(--border)', borderRadius: 8,
            background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', lineHeight: 0,
          }}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      ) : (
        link('/settings', 'Settings', Cog)
      )}

      {isMobile && menuOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', borderBottom: '0.5px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 16px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {NAV_LINKS.map(([to, label, Icon]) => link(to, label, Icon, () => setMenuOpen(false)))}
          {link('/settings', 'Settings', Cog, () => setMenuOpen(false))}
        </div>
      )}
    </nav>
  )
}

function Footer() {
  return (
    <footer style={{
      borderTop: '0.5px solid var(--border)',
      background: 'var(--surface)',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AquaDropIcon size={18} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.04em' }}>TANKBOOK</span>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>© {new Date().getFullYear()}</span>
      </span>
      <a
        href="https://github.com/TankBook/TankBook-App"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--text-2)', textDecoration: 'none',
          padding: '5px 12px', borderRadius: 8,
          border: '0.5px solid var(--border)',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--blue)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--blue-border)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)' }}
      >
        <GitHubIcon size={14} />
        GitHub
      </a>
    </footer>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif' }}>
          <Nav />
          <div style={{ flex: 1, maxWidth: 960, width: '100%', margin: '0 auto', padding: '32px 24px' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tanks/:id" element={<TankDetail />} />
              <Route path="/species" element={<SpeciesBrowser />} />
              <Route path="/compatibility" element={<CompatibilityChecker />} />
              <Route path="/journal" element={<LivestockJournal />} />
              <Route path="/calculators" element={<Calculators />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/spending" element={<SpendingTracker />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </SettingsProvider>
  )
}
