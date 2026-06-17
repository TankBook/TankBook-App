import { useState, useRef, useEffect } from 'react'
import { CalendarDays, Ruler, Info, Download, Upload, Droplets, RefreshCw } from 'lucide-react'
import { useSettings, formatDate, DateFormat, UnitSystem } from '../context/SettingsContext'
import { Card } from '../components/ui'
import { api, Tank } from '../api/client'

const APP_VERSION = '0.5.0'
const GITHUB_REPO = 'ThatTom/Aqua-Log'

function semverNewer(current: string, latest: string): boolean {
  const c = current.split('.').map(Number)
  const l = latest.split('.').map(Number)
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] ?? 0, lv = l[i] ?? 0
    if (lv > cv) return true
    if (lv < cv) return false
  }
  return false
}

const FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK / Europe)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
]

const UNIT_OPTIONS: { value: UnitSystem; label: string; example: string }[] = [
  { value: 'mm', label: 'Millimetres (mm)', example: '600 × 400 × 300 mm' },
  { value: 'cm', label: 'Centimetres (cm)', example: '60 × 40 × 30 cm' },
  { value: 'm',  label: 'Metres (m)',        example: '0.6 × 0.4 × 0.3 m' },
]

export default function Settings() {
  const { dateFormat, setDateFormat, unitSystem, setUnitSystem, defaultTank, setDefaultTank, loading } = useSettings()
  const [tanks, setTanks] = useState<Tank[]>([])

  useEffect(() => {
    api.tanks.list().then(setTanks)
  }, [])

  const [checking, setChecking] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'up-to-date' | 'available' | 'no-releases' | 'error'>('idle')
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null)

  async function checkForUpdates() {
    setChecking(true)
    setUpdateStatus('idle')
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      if (res.status === 404) { setUpdateStatus('no-releases'); return }
      if (!res.ok) throw new Error('GitHub API error')
      const data = await res.json()
      const tag: string = (data.tag_name ?? '').replace(/^v/, '')
      setLatestVersion(tag)
      setReleaseUrl(data.html_url ?? null)
      setUpdateStatus(semverNewer(APP_VERSION, tag) ? 'available' : 'up-to-date')
    } catch {
      setUpdateStatus('error')
    } finally {
      setChecking(false)
    }
  }

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: boolean; tanks_restored: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [confirmImport, setConfirmImport] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExporting(true)
    try {
      const data = await api.backup.export()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `tankbook-backup-${ts}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    setImportResult(null)
    setImportError(null)
    setConfirmImport(false)
    try {
      const text = await importFile.text()
      const data = JSON.parse(text)
      const result = await api.backup.import(data)
      setImportResult(result)
      setImportFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: any) {
      setImportError(e.message ?? 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-2)' }}>Loading settings…</p>

  const exampleDate = new Date()

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Settings</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-2)' }}>
        App-wide settings for TankBook. There are no user accounts, so these apply to everyone using this instance.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16, alignItems: 'start' }}>

        {/* Left column — display preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14} color="var(--text-2)" />Date format</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Controls how dates are displayed across tanks, parameters, and the maintenance schedule.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    onChange={() => setDateFormat(opt.value)}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{opt.label}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                  {formatDate(exampleDate, opt.value)}
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Ruler size={14} color="var(--text-2)" />Dimension units</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Controls how tank dimensions (width, height, depth) are displayed and entered. Changing this converts existing values automatically.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    onChange={() => setUnitSystem(opt.value)}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{opt.label}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>{opt.example}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Droplets size={14} color="var(--text-2)" />Default tank</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Pre-selects this tank on pages with a tank dropdown, like the Livestock Journal.
          </p>
          <select
            value={defaultTank ?? ''}
            onChange={e => setDefaultTank(e.target.value || null)}
            style={{ width: '100%' }}
          >
            <option value="">No default</option>
            {tanks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Card>
        </div>{/* end left column */}

        {/* Right column — data & info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} color="var(--text-2)" />Data backup
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 16px' }}>
            Export all tank data, parameters, livestock, and journal entries to a JSON file. Import replaces all current data with the backup.
          </p>

          {/* Export */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: '0 0 8px' }}>Export</p>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.5 : 1,
              }}
            >
              <Download size={13} />{exporting ? 'Exporting…' : 'Download backup'}
            </button>
          </div>

          {/* Import */}
          <div style={{ borderTop: '0.5px solid var(--border-sub)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: '0 0 4px' }}>Import</p>
            <p style={{ fontSize: 11, color: 'var(--red)', margin: '0 0 10px' }}>
              Warning: importing will permanently replace all current data.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={e => {
                setImportFile(e.target.files?.[0] ?? null)
                setImportResult(null)
                setImportError(null)
                setConfirmImport(false)
              }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', cursor: 'pointer',
                  border: '0.5px solid var(--btn-border)', borderRadius: 8, overflow: 'hidden',
                  background: 'var(--surface)',
                }}
              >
                <span style={{ padding: '7px 12px', background: 'var(--surface-2)', borderRight: '0.5px solid var(--btn-border)', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  Choose file
                </span>
                <span style={{ padding: '7px 10px', fontSize: 12, color: importFile ? 'var(--text)' : 'var(--text-3)' }}>
                  {importFile ? importFile.name : 'No file chosen'}
                </span>
              </div>

              {importFile && !confirmImport && (
                <button
                  onClick={() => setConfirmImport(true)}
                  style={{
                    fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                    border: '0.5px solid var(--red-border)', background: 'var(--red-bg)', color: 'var(--red)',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                  Restore backup
                </button>
              )}
            </div>

            {confirmImport && (
              <div style={{ marginTop: 10, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
                  This will delete all current data and replace it with the backup. Are you sure?
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    style={{
                      fontSize: 13, padding: '6px 16px', borderRadius: 8, fontWeight: 500,
                      border: '0.5px solid var(--red-border)', background: 'var(--red)', color: '#fff',
                      cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1,
                    }}
                  >
                    {importing ? 'Restoring…' : 'Yes, restore'}
                  </button>
                  <button
                    onClick={() => setConfirmImport(false)}
                    style={{
                      fontSize: 13, padding: '6px 14px', borderRadius: 8,
                      border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {importResult && (
              <div style={{ marginTop: 10, background: 'var(--green-bg)', border: '0.5px solid var(--green-border)', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
                  ✓ Restored {importResult.tanks_restored} tank{importResult.tanks_restored !== 1 ? 's' : ''} successfully.
                </p>
              </div>
            )}

            {importError && (
              <div style={{ marginTop: 10, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>{importError}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={14} color="var(--text-2)" />About
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--text-2)' }}>Current version</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em' }}>
                v{APP_VERSION}
              </p>
            </div>
            <button
              onClick={checkForUpdates}
              disabled={checking}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, padding: '6px 14px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)',
                cursor: checking ? 'not-allowed' : 'pointer', opacity: checking ? 0.6 : 1,
              }}
            >
              <RefreshCw size={12} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
              {checking ? 'Checking…' : 'Check for updates'}
            </button>
          </div>

          {updateStatus === 'up-to-date' && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--green-bg)', border: '0.5px solid var(--green-border)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                ✓ You're up to date — v{APP_VERSION} is the latest release.
              </p>
            </div>
          )}

          {updateStatus === 'available' && latestVersion && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--blue-bg)', border: '0.5px solid var(--blue-border)' }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>
                Update available — v{latestVersion}
              </p>
              {releaseUrl && (
                <a
                  href={releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'underline' }}
                >
                  View release notes ↗
                </a>
              )}
            </div>
          )}

          {updateStatus === 'no-releases' && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '0.5px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>No releases published on GitHub yet.</p>
            </div>
          )}

          {updateStatus === 'error' && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--red)' }}>Could not reach GitHub. Check your connection and try again.</p>
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>
            TankBook is self-hosted aquarium management software. Species data lives in YAML
            files under <code style={{ fontSize: 11, background: 'var(--tag-bg)', padding: '1px 5px', borderRadius: 4, color: 'var(--text)' }}>species-data/</code>,
            while tank and parameter data is stored in SQLite.
          </p>
        </Card>
        </div>{/* end right column */}

      </div>
    </div>
  )
}
