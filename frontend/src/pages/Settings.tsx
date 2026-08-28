import { useState, useRef, useEffect } from 'react'
import { CalendarDays, Ruler, Info, Download, Upload, Droplets, RefreshCw, Bell, Globe, Utensils, X } from 'lucide-react'
import { useSettings, formatDate, DateFormat, UnitSystem } from '../context/SettingsContext'
import { Card } from '../components/ui'
import { api, Tank } from '../api/client'

const APP_VERSION = '0.7.0'
const GITHUB_REPO = 'TankBook/TankBook-App'

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
  { value: 'imperial', label: 'Imperial (inches)', example: '23.62 × 15.75 × 11.81 in' },
]

export default function Settings() {
  const { dateFormat, setDateFormat, unitSystem, setUnitSystem, defaultTank, setDefaultTank, alertRetentionDays, setAlertRetentionDays, appUrl, setAppUrl, feedingAmountPresets, setFeedingAmountPresets, loading } = useSettings()
  const [tanks, setTanks] = useState<Tank[]>([])
  const [draftDateFormat, setDraftDateFormat] = useState<DateFormat>(dateFormat)
  const [draftUnitSystem, setDraftUnitSystem] = useState<UnitSystem>(unitSystem)
  const [draftDefaultTank, setDraftDefaultTank] = useState(defaultTank ?? '')
  const [draftAlertRetentionDays, setDraftAlertRetentionDays] = useState<number | null>(alertRetentionDays)
  const [draftAppUrl, setDraftAppUrl] = useState(appUrl ?? '')
  const [draftFeedingAmountPresets, setDraftFeedingAmountPresets] = useState<string[]>(feedingAmountPresets)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [newPreset, setNewPreset] = useState('')
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!loading) {
      setDraftDateFormat(dateFormat)
      setDraftUnitSystem(unitSystem)
      setDraftDefaultTank(defaultTank ?? '')
      setDraftAlertRetentionDays(alertRetentionDays)
      setDraftAppUrl(appUrl ?? '')
      setDraftFeedingAmountPresets(feedingAmountPresets)
    }
  }, [loading])

  function addPreset() {
    const value = newPreset.trim()
    if (!value || draftFeedingAmountPresets.includes(value)) return
    setDraftFeedingAmountPresets([...draftFeedingAmountPresets, value])
    setNewPreset('')
  }

  useEffect(() => {
    api.tanks.list().then(setTanks)
  }, [])

  const feedingAmountPresetsChanged = JSON.stringify(draftFeedingAmountPresets) !== JSON.stringify(feedingAmountPresets)

  const settingsChanged = draftDateFormat !== dateFormat
    || draftUnitSystem !== unitSystem
    || draftDefaultTank !== (defaultTank ?? '')
    || draftAlertRetentionDays !== alertRetentionDays
    || draftAppUrl !== (appUrl ?? '')
    || feedingAmountPresetsChanged

  async function saveSettings() {
    setSavingSettings(true)
    setSettingsSaved(false)
    try {
      await Promise.all([
        draftDateFormat !== dateFormat && setDateFormat(draftDateFormat),
        draftUnitSystem !== unitSystem && setUnitSystem(draftUnitSystem),
        draftDefaultTank !== (defaultTank ?? '') && setDefaultTank(draftDefaultTank || null),
        draftAlertRetentionDays !== alertRetentionDays && setAlertRetentionDays(draftAlertRetentionDays),
        draftAppUrl !== (appUrl ?? '') && setAppUrl(draftAppUrl || null),
        feedingAmountPresetsChanged && setFeedingAmountPresets(draftFeedingAmountPresets),
      ])
      setSettingsSaved(true)
    } finally {
      setSavingSettings(false)
    }
  }

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

      <Card style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, padding: 24 }}>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Droplets size={14} color="var(--text-2)" />Default Tank</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Pre-selects this tank on pages with a tank dropdown, like the Livestock Journal.
          </p>
          <select
            value={draftDefaultTank}
            onChange={e => { setDraftDefaultTank(e.target.value); setSettingsSaved(false) }}
            style={{ width: '100%' }}
          >
            <option value="">No default</option>
            {tanks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14} color="var(--text-2)" />Date Format</p>
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
                  border: draftDateFormat === opt.value ? '1px solid var(--blue-border)' : '0.5px solid var(--border)',
                  background: draftDateFormat === opt.value ? 'var(--blue-bg)' : 'transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="dateFormat"
                    checked={draftDateFormat === opt.value}
                    onChange={() => { setDraftDateFormat(opt.value); setSettingsSaved(false) }}
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

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Ruler size={14} color="var(--text-2)" />Dimension Units</p>
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
                  border: draftUnitSystem === opt.value ? '1px solid var(--blue-border)' : '0.5px solid var(--border)',
                  background: draftUnitSystem === opt.value ? 'var(--blue-bg)' : 'transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="unitSystem"
                    checked={draftUnitSystem === opt.value}
                    onChange={() => { setDraftUnitSystem(opt.value); setSettingsSaved(false) }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{opt.label}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>{opt.example}</span>
              </label>
            ))}
          </div>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={14} color="var(--text-2)" />Alert Retention</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Alerts older than this are automatically deleted when you view a tank's alert tab. Set to indefinite to keep alerts until manually deleted.
          </p>
          <select
            value={draftAlertRetentionDays ?? ''}
            onChange={e => { setDraftAlertRetentionDays(e.target.value ? Number(e.target.value) : null); setSettingsSaved(false) }}
            style={{ width: '100%' }}
          >
            <option value="">Indefinite (manual delete only)</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={14} color="var(--text-2)" />App URL</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            The URL this instance is reachable at. Used when sharing species YAML links with other TankBook instances. Leave blank to use the browser's current origin.
          </p>
          <input
            type="url"
            value={draftAppUrl}
            onChange={e => { setDraftAppUrl(e.target.value); setSettingsSaved(false) }}
            placeholder={`e.g. http://192.168.1.100:3000`}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Utensils size={14} color="var(--text-2)" />Feeding Amounts</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Presets for how much to feed. These become selectable when editing an inhabitant's feeding info.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newPreset}
              onChange={e => setNewPreset(e.target.value)}
              placeholder="e.g. 1 pinch, 2 cubes"
              onKeyDown={e => e.key === 'Enter' && addPreset()}
              style={{ flex: 1, boxSizing: 'border-box' }}
            />
            <button
              onClick={addPreset}
              disabled={!newPreset.trim()}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: newPreset.trim() ? 'pointer' : 'default',
                border: '0.5px solid var(--blue-border)',
                background: newPreset.trim() ? 'var(--blue-bg)' : 'var(--surface-2)',
                color: newPreset.trim() ? 'var(--blue)' : 'var(--text-3)',
              }}
            >
              Add
            </button>
          </div>
          {draftFeedingAmountPresets.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {draftFeedingAmountPresets.map(preset => (
                <span
                  key={preset}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 6px 4px 10px', borderRadius: 999, background: 'var(--surface-2)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                >
                  {preset}
                  <button
                    onClick={() => setDraftFeedingAmountPresets(draftFeedingAmountPresets.filter(p => p !== preset))}
                    style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, lineHeight: 0 }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} color="var(--text-2)" />Data Backup
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>
            Export all tank data, parameters, livestock, and journal entries to a JSON file. Restoring replaces all current data with the backup.
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
              setConfirmImport(true)
            }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                flex: 1, display: 'flex', flexDirection: isMobile && !exporting ? 'column' : 'row',
                alignItems: 'center', justifyContent: 'center', gap: isMobile && !exporting ? 2 : 6,
                fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.5 : 1,
                boxSizing: 'border-box',
              }}
            >
              {exporting ? 'Exporting…' : isMobile ? (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Download size={13} />Download</span>
                  <span>Backup</span>
                </>
              ) : (
                <><Download size={13} />Download Backup</>
              )}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center', justifyContent: 'center', gap: isMobile ? 2 : 6,
                fontSize: 13, padding: '7px 16px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--red-border)', background: 'var(--red-bg)', color: 'var(--red)',
                cursor: 'pointer', boxSizing: 'border-box',
              }}
            >
              {isMobile ? (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Upload size={13} />Restore</span>
                  <span>Backup</span>
                </>
              ) : (
                <><Upload size={13} />Restore Backup</>
              )}
            </button>
          </div>

          {confirmImport && importFile && (
            <div style={{ marginTop: 12, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 8, padding: '12px 14px' }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
                Replace all current data with "{importFile.name}"? This cannot be undone.
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
                  onClick={() => {
                    setConfirmImport(false)
                    setImportFile(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
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
            <div style={{ marginTop: 12, background: 'var(--green-bg)', border: '0.5px solid var(--green-border)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
                ✓ Restored {importResult.tanks_restored} tank{importResult.tanks_restored !== 1 ? 's' : ''} successfully.
              </p>
            </div>
          )}

          {importError && (
            <div style={{ marginTop: 12, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>{importError}</p>
            </div>
          )}
        </section>

        <section style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border-sub)' }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={14} color="var(--text-2)" />About
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--text-2)' }}>Current Version</p>
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
              {checking ? 'Checking…' : 'Check For Updates'}
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
        </section>

        <section style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'flex-end', gap: 12 }}>
          {settingsSaved && <span style={{ fontSize: 12, color: 'var(--green)', textAlign: isMobile ? 'center' : undefined }}>Settings saved</span>}
          <button
            onClick={saveSettings}
            disabled={!settingsChanged || savingSettings}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '0.5px solid var(--blue-border)',
              background: settingsChanged && !savingSettings ? 'var(--blue-bg)' : 'var(--surface-2)',
              color: settingsChanged && !savingSettings ? 'var(--blue)' : 'var(--text-3)',
              fontWeight: 500, cursor: settingsChanged && !savingSettings ? 'pointer' : 'default',
              width: isMobile ? '100%' : undefined, boxSizing: 'border-box',
            }}
          >
            {savingSettings ? 'Saving…' : 'Save Settings'}
          </button>
        </section>

      </Card>
    </div>
  )
}
