import React, { useState, useEffect } from 'react'
import { Fish, Leaf, Shrimp, Bug, X, Download } from 'lucide-react'
import { Tag } from './ui'
import { api } from '../api/client'
import { useSettings } from '../context/SettingsContext'

export interface Species {
  slug: string
  common_name: string
  latin_name: string
  type: string
  family?: string
  origin?: string
  care?: {
    difficulty?: string
    min_tank_litres?: number
    shoal_min?: number
    group_min?: number
    max_size_cm?: number
    lifespan_years?: number
    growth_rate?: string
  }
  water?: {
    temp_c?: { min: number; max: number }
    ph?: { min: number; max: number }
    gh_dgh?: { min: number; max: number }
    kh_dkh?: { min: number; max: number }
  }
  compatibility?: { temperament?: string }
  light?: { requirement?: string }
  co2_required?: boolean
  notes?: string
}

export function DifficultyBadge({ d }: { d?: string }) {
  if (!d) return null
  const palette: Record<string, { bg: string; color: string }> = {
    beginner:     { bg: 'var(--green-bg)', color: 'var(--green)' },
    intermediate: { bg: 'var(--amber-bg)', color: 'var(--amber)' },
    advanced:     { bg: 'var(--red-bg)',   color: 'var(--red)' },
  }
  const s = palette[d] ?? { bg: 'var(--tag-bg)', color: 'var(--text-2)' }
  return <Tag bg={s.bg} color={s.color}>{d}</Tag>
}

export function SpeciesImage({ slug, size = 44 }: { slug: string; size?: number }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <img
      src={api.images.speciesUrl(slug)}
      alt=""
      onError={() => setVisible(false)}
      style={{ width: size, height: size, borderRadius: size > 50 ? 10 : 6, objectFit: 'cover', flexShrink: 0, border: '0.5px solid var(--border)' }}
    />
  )
}

export function SpeciesDetailModal({ s, onClose, onEdit }: { s: Species; onClose: () => void; onEdit?: () => void }) {
  const [copied, setCopied] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const { appUrl } = useSettings()
  const yamlUrl = `/api/species/${s.slug}/yaml`
  const hostedUrl = (appUrl ? appUrl.replace(/\/$/, '') : window.location.origin) + yamlUrl

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const typeStyle: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    fish:         { bg: 'var(--cyan-bg)',   color: 'var(--cyan)',   icon: <Fish size={11} /> },
    plant:        { bg: 'var(--green-bg)',  color: 'var(--green)',  icon: <Leaf size={11} /> },
    invertebrate: { bg: 'var(--amber-bg)',  color: 'var(--amber)',  icon: <Shrimp size={11} /> },
    amphibian:    { bg: 'var(--tag-bg)',    color: 'var(--text-2)', icon: <Bug size={11} /> },
  }
  const ts = typeStyle[s.type] ?? { bg: 'var(--tag-bg)', color: 'var(--text-2)', icon: null }

  function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
        <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{value}</p>
      </div>
    )
  }

  const hasStats = s.water?.temp_c || s.water?.ph || s.water?.gh_dgh || s.water?.kh_dkh ||
    s.care?.min_tank_litres || s.care?.max_size_cm || s.care?.lifespan_years ||
    s.care?.shoal_min || s.care?.group_min || s.light?.requirement ||
    s.co2_required !== undefined || s.compatibility?.temperament

  return (
    <>
    <div
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 16, width: 560, maxWidth: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '20px 20px 16px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div
            onClick={() => setLightbox(true)}
            style={{ width: 72, height: 72, borderRadius: 10, flexShrink: 0, overflow: 'hidden', border: '0.5px solid var(--border)', background: ts.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}
          >
            <SpeciesImage slug={s.slug} size={72} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: 17, color: 'var(--text)' }}>{s.common_name}</p>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic' }}>{s.latin_name}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag bg={ts.bg} color={ts.color}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>{ts.icon}{s.type}</span>
              </Tag>
              <DifficultyBadge d={s.care?.difficulty} />
              {s.family && <Tag bg="var(--tag-bg)" color="var(--text-2)">{s.family}</Tag>}
              {s.origin && <Tag bg="var(--tag-bg)" color="var(--text-2)">{s.origin}</Tag>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, lineHeight: 0, flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {hasStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
              {s.water?.temp_c && <Stat label="Temperature" value={`${s.water.temp_c.min}–${s.water.temp_c.max} °C`} />}
              {s.water?.ph && <Stat label="pH" value={`${s.water.ph.min}–${s.water.ph.max}`} />}
              {s.water?.gh_dgh && <Stat label="GH" value={`${s.water.gh_dgh.min}–${s.water.gh_dgh.max} °dGH`} />}
              {s.water?.kh_dkh && <Stat label="KH" value={`${s.water.kh_dkh.min}–${s.water.kh_dkh.max} °dKH`} />}
              {s.care?.min_tank_litres && <Stat label="Min tank" value={`${s.care.min_tank_litres} L`} />}
              {s.care?.max_size_cm && <Stat label="Max size" value={`${s.care.max_size_cm} cm`} />}
              {s.care?.lifespan_years && <Stat label="Lifespan" value={`${s.care.lifespan_years} yr`} />}
              {s.care?.shoal_min && <Stat label="Min shoal" value={`${s.care.shoal_min}+`} />}
              {s.care?.group_min && <Stat label="Min group" value={`${s.care.group_min}+`} />}
              {s.light?.requirement && <Stat label="Light" value={s.light.requirement} />}
              {s.co2_required !== undefined && <Stat label="CO₂" value={s.co2_required ? 'Required' : 'Not required'} />}
              {s.compatibility?.temperament && <Stat label="Temperament" value={s.compatibility.temperament} />}
            </div>
          )}
          {s.notes && (
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Notes</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{s.notes}</p>
            </div>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>slug: {s.slug}</p>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '0.5px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href={yamlUrl}
            download={`${s.slug}.yaml`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', textDecoration: 'none' }}
          >
            <Download size={13} />YAML
          </a>
          <button
            onClick={() => { navigator.clipboard.writeText(hostedUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '0.5px solid var(--btn-border)', background: copied ? 'var(--green-bg)' : 'transparent', color: copied ? 'var(--green)' : 'var(--text-2)', cursor: 'pointer' }}
          >
            {copied ? '✓ Copied URL' : 'Copy URL'}
          </button>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)' }}>
            Close
          </button>
          {onEdit && (
            <button onClick={onEdit} style={{ padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)' }}>
              Edit species
            </button>
          )}
        </div>
      </div>
    </div>

    {lightbox && (
      <div
        onClick={() => setLightbox(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
      >
        <img
          src={api.images.speciesUrl(s.slug)}
          alt={s.common_name}
          style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 14, objectFit: 'contain', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        />
      </div>
    )}
    </>
  )
}
