import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Tag, Card, SectionTitle } from '../components/ui'

interface Species {
  slug: string
  common_name: string
  latin_name: string
  type: string
  water?: {
    temp_c?: { min: number; max: number }
    ph?: { min: number; max: number }
  }
  compatibility?: {
    temperament?: string
    incompatible_with?: string[]
    compatible_with?: string[]
  }
  care?: { min_tank_litres?: number }
}

interface Conflict {
  severity: 'error' | 'warning'
  message: string
}

function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMax >= bMin && bMax >= aMin
}

function overlapWidth(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin)
}

function checkPair(a: Species, b: Species): Conflict[] {
  const conflicts: Conflict[] = []

  const aIncompat = a.compatibility?.incompatible_with ?? []
  const bIncompat = b.compatibility?.incompatible_with ?? []

  if (aIncompat.includes(b.slug)) {
    conflicts.push({ severity: 'error', message: `${a.common_name} is listed as incompatible with ${b.common_name}.` })
  } else if (bIncompat.includes(a.slug)) {
    conflicts.push({ severity: 'error', message: `${b.common_name} is listed as incompatible with ${a.common_name}.` })
  }

  const aTemp = a.water?.temp_c
  const bTemp = b.water?.temp_c
  if (aTemp && bTemp) {
    if (!rangesOverlap(aTemp.min, aTemp.max, bTemp.min, bTemp.max)) {
      conflicts.push({
        severity: 'error',
        message: `Temperature ranges don't overlap: ${a.common_name} needs ${aTemp.min}–${aTemp.max} °C, ${b.common_name} needs ${bTemp.min}–${bTemp.max} °C.`,
      })
    } else if (overlapWidth(aTemp.min, aTemp.max, bTemp.min, bTemp.max) < 2) {
      conflicts.push({
        severity: 'warning',
        message: `Temperature ranges barely overlap between ${a.common_name} and ${b.common_name} — very little margin for error.`,
      })
    }
  }

  const aPh = a.water?.ph
  const bPh = b.water?.ph
  if (aPh && bPh) {
    if (!rangesOverlap(aPh.min, aPh.max, bPh.min, bPh.max)) {
      conflicts.push({
        severity: 'error',
        message: `pH ranges don't overlap: ${a.common_name} needs ${aPh.min}–${aPh.max}, ${b.common_name} needs ${bPh.min}–${bPh.max}.`,
      })
    } else if (overlapWidth(aPh.min, aPh.max, bPh.min, bPh.max) < 0.3) {
      conflicts.push({
        severity: 'warning',
        message: `pH ranges barely overlap between ${a.common_name} and ${b.common_name}.`,
      })
    }
  }

  const predatory = ['predatory', 'aggressive']
  const aTem = a.compatibility?.temperament ?? ''
  const bTem = b.compatibility?.temperament ?? ''
  if (predatory.includes(aTem) && !predatory.includes(bTem)) {
    conflicts.push({ severity: 'warning', message: `${a.common_name} is ${aTem} and may predate or harass ${b.common_name}.` })
  } else if (predatory.includes(bTem) && !predatory.includes(aTem)) {
    conflicts.push({ severity: 'warning', message: `${b.common_name} is ${bTem} and may predate or harass ${a.common_name}.` })
  }

  return conflicts
}

function runChecks(selected: Species[]): Conflict[] {
  const all: Conflict[] = []
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      all.push(...checkPair(selected[i], selected[j]))
    }
  }
  return all
}

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  fish:        { bg: 'var(--blue-bg)',  color: 'var(--blue)'  },
  plant:       { bg: 'var(--green-bg)', color: 'var(--green)' },
  invertebrate:{ bg: 'var(--amber-bg)', color: 'var(--amber)' },
  amphibian:   { bg: 'var(--tag-bg)',   color: 'var(--text-2)'},
}

export default function CompatibilityChecker() {
  const [allSpecies, setAllSpecies] = useState<Species[]>([])
  const [selected, setSelected] = useState<Species[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Species[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/species/').then(r => r.json()).then(setAllSpecies)
  }, [])

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const q = search.toLowerCase()
    setResults(
      allSpecies
        .filter(s => !selected.find(sel => sel.slug === s.slug))
        .filter(s => s.common_name.toLowerCase().includes(q) || s.latin_name.toLowerCase().includes(q) || s.slug.includes(q))
        .slice(0, 8)
    )
  }, [search, allSpecies, selected])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function addSpecies(s: Species) {
    setSelected(prev => [...prev, s])
    setSearch('')
    setResults([])
    setDropdownOpen(false)
    inputRef.current?.focus()
  }

  function removeSpecies(slug: string) {
    setSelected(prev => prev.filter(s => s.slug !== slug))
  }

  const conflicts = runChecks(selected)
  const errors = conflicts.filter(c => c.severity === 'error')
  const warnings = conflicts.filter(c => c.severity === 'warning')

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Compatibility Checker</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
          Build a stocklist and instantly see conflicts based on species data.
        </p>
      </div>

      {/* Search */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle>Add Species To Stocklist</SectionTitle>
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setDropdownOpen(true) }}
            onFocus={() => search && setDropdownOpen(true)}
            placeholder="Search by name or slug…"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          {dropdownOpen && results.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
              background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden',
            }}>
              {results.map(s => {
                const ts = TYPE_STYLE[s.type] ?? TYPE_STYLE.fish
                return (
                  <div
                    key={s.slug}
                    onMouseDown={() => addSpecies(s)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', borderBottom: '0.5px solid var(--border-sub)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{s.common_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', fontStyle: 'italic' }}>{s.latin_name}</p>
                    </div>
                    <Tag bg={ts.bg} color={ts.color}>{s.type}</Tag>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {selected.map(s => {
              const ts = TYPE_STYLE[s.type] ?? TYPE_STYLE.fish
              return (
                <div
                  key={s.slug}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: ts.bg, border: `0.5px solid ${ts.color}33`,
                    borderRadius: 8, padding: '4px 10px',
                  }}
                >
                  <span style={{ fontSize: 13, color: ts.color, fontWeight: 500 }}>{s.common_name}</span>
                  <button
                    onClick={() => removeSpecies(s.slug)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: ts.color, display: 'flex', alignItems: 'center' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Results */}
      {selected.length < 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <ShieldCheck size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 14, margin: 0 }}>Add at least two species to check compatibility.</p>
        </div>
      )}

      {selected.length >= 2 && (
        <>
          {/* Summary banner */}
          {errors.length === 0 && warnings.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--green-bg)', border: '0.5px solid var(--green-border)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
              <CheckCircle size={18} color="var(--green)" />
              <p style={{ margin: 0, fontSize: 14, color: 'var(--green)', fontWeight: 500 }}>
                No compatibility issues found between these {selected.length} species.
              </p>
            </div>
          )}
          {errors.length > 0 && (
            <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <XCircle size={16} color="var(--red)" />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--red)' }}>
                  {errors.length} incompatibility {errors.length === 1 ? 'issue' : 'issues'} found
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {errors.map((c, i) => (
                  <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--red)', paddingLeft: 24 }}>• {c.message}</p>
                ))}
              </div>
            </div>
          )}
          {warnings.length > 0 && (
            <div style={{ background: 'var(--amber-bg)', border: '0.5px solid var(--amber-border)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <AlertTriangle size={16} color="var(--amber)" />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--amber)' }}>
                  {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {warnings.map((c, i) => (
                  <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--amber)', paddingLeft: 24 }}>• {c.message}</p>
                ))}
              </div>
            </div>
          )}

          {/* Water parameter summary */}
          <Card>
            <SectionTitle>Water Parameter Overlap</SectionTitle>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>Species</th>
                    <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>Temp (°C)</th>
                    <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>pH</th>
                    <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>Min tank (L)</th>
                    <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-2)', fontWeight: 500, fontSize: 11, borderBottom: '0.5px solid var(--border)' }}>Temperament</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map(s => {
                    const ts = TYPE_STYLE[s.type] ?? TYPE_STYLE.fish
                    return (
                      <tr key={s.slug}>
                        <td style={{ padding: '8px 10px', color: 'var(--text)', borderBottom: '0.5px solid var(--border-sub)' }}>
                          <p style={{ margin: '0 0 2px', fontWeight: 500 }}>{s.common_name}</p>
                          <Tag bg={ts.bg} color={ts.color}>{s.type}</Tag>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text)', borderBottom: '0.5px solid var(--border-sub)' }}>
                          {s.water?.temp_c ? `${s.water.temp_c.min}–${s.water.temp_c.max}` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text)', borderBottom: '0.5px solid var(--border-sub)' }}>
                          {s.water?.ph ? `${s.water.ph.min}–${s.water.ph.max}` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text)', borderBottom: '0.5px solid var(--border-sub)' }}>
                          {s.care?.min_tank_litres ?? '—'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '0.5px solid var(--border-sub)' }}>
                          {s.compatibility?.temperament ? (
                            <Tag
                              bg={s.compatibility.temperament === 'peaceful' ? 'var(--green-bg)' : s.compatibility.temperament === 'predatory' || s.compatibility.temperament === 'aggressive' ? 'var(--red-bg)' : 'var(--amber-bg)'}
                              color={s.compatibility.temperament === 'peaceful' ? 'var(--green)' : s.compatibility.temperament === 'predatory' || s.compatibility.temperament === 'aggressive' ? 'var(--red)' : 'var(--amber)'}
                            >
                              {s.compatibility.temperament}
                            </Tag>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
