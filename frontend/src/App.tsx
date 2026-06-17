import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Cog, PencilRuler, NotebookPen, ShieldCheck, type LucideIcon } from 'lucide-react'

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
import TankDetail from './pages/TankDetail'
import SpeciesBrowser from './pages/SpeciesBrowser'
import TankDesigner from './pages/TankDesigner'
import Settings from './pages/Settings'
import LivestockJournal from './pages/LivestockJournal'
import CompatibilityChecker from './pages/CompatibilityChecker'
import { SettingsProvider, useSettings } from './context/SettingsContext'

function Nav() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useSettings()

  const link = (to: string, label: string, Icon: LucideIcon) => (
    <Link to={to} style={{
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
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '12px 24px', borderBottom: '0.5px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24, textDecoration: 'none' }}>
        <AquaDropIcon size={26} />
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '0.04em' }}>AQUA LOG</span>
          <span style={{ fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.06em', fontWeight: 500 }}>LOG. CARE. THRIVE.</span>
        </span>
      </span>
      {link('/', 'Dashboard', LayoutDashboard)}
      {link('/designer', 'Designer', PencilRuler)}
      {link('/species', 'Species', BookOpen)}
      {link('/compatibility', 'Compatibility', ShieldCheck)}
      {link('/journal', 'Journal', NotebookPen)}
      <span style={{ flex: 1 }} />
      <button
        onClick={toggleTheme}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        style={{
          fontSize: 15,
          padding: '4px 8px',
          border: '0.5px solid var(--border)',
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--text-2)',
          cursor: 'pointer',
          lineHeight: 1,
          marginRight: 4,
        }}
      >
        {theme === 'light' ? '☾' : '☀'}
      </button>
      {link('/settings', 'Settings', Cog)}
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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.04em' }}>AQUA LOG</span>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>© {new Date().getFullYear()}</span>
      </span>
      <a
        href="https://github.com/ThatTom/Aqua-Log"
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
              <Route path="/designer" element={<TankDesigner />} />
              <Route path="/species" element={<SpeciesBrowser />} />
              <Route path="/compatibility" element={<CompatibilityChecker />} />
              <Route path="/journal" element={<LivestockJournal />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </SettingsProvider>
  )
}
