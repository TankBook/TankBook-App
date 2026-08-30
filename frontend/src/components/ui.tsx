import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

function formatInline(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
}

export function renderNotes(text: string): string {
  if (!text) return ''
  const lines = text.split('\n')
  const parts: string[] = []
  let inList = false
  const closeList = () => { if (inList) { parts.push('</ul>'); inList = false } }

  for (const rawLine of lines) {
    const line = rawLine.trimStart()
    const heading = line.match(/^(#{1,6})\s+(.*)/)
    if (line.startsWith('- ')) {
      if (!inList) { parts.push('<ul style="margin:4px 0 4px;padding-left:18px;">'); inList = true }
      parts.push(`<li style="margin:2px 0">${formatInline(line.slice(2))}</li>`)
    } else if (heading) {
      closeList()
      const size = heading[1].length === 1 ? 15 : 13
      parts.push(`<span style="display:block;font-weight:600;font-size:${size}px;margin:6px 0 2px">${formatInline(heading[2])}</span>`)
    } else {
      closeList()
      if (line.trim() === '') parts.push('<br>')
      else parts.push(`<span style="display:block">${formatInline(line)}</span>`)
    }
  }
  closeList()
  return parts.join('')
}

export function RichTextarea({ value, onChange, rows = 4, placeholder }: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function wrap(before: string, after: string) {
    const el = ref.current; if (!el) return
    const s = el.selectionStart, e = el.selectionEnd
    const sel = value.slice(s, e) || 'text'
    onChange(value.slice(0, s) + before + sel + after + value.slice(e))
    requestAnimationFrame(() => {
      el.setSelectionRange(s + before.length, s + before.length + sel.length)
      el.focus()
    })
  }

  function insertBullet() {
    const el = ref.current; if (!el) return
    const s = el.selectionStart
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    const insert = s === lineStart ? '- ' : '\n- '
    onChange(value.slice(0, s) + insert + value.slice(s))
    requestAnimationFrame(() => { el.setSelectionRange(s + insert.length, s + insert.length); el.focus() })
  }

  const btn: CSSProperties = {
    padding: '7px 10px', borderRadius: 4, border: '0.5px solid var(--btn-border)',
    background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, lineHeight: 1,
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        <button type="button" onMouseDown={e => { e.preventDefault(); wrap('**', '**') }} style={{ ...btn, fontWeight: 700 }} title="Bold">B</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); wrap('__', '__') }} style={{ ...btn, textDecoration: 'underline' }} title="Underline">U</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); insertBullet() }} style={btn} title="Bullet point">•  List</button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
      />
    </div>
  )
}

export function AquaDropIcon({ size = 26 }: { size?: number }) {
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

export function Card({ children, style, ...rest }: { children: ReactNode; style?: CSSProperties } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1.25rem', ...style }}>
      {children}
    </div>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>{children}</label>
}

export function StatCard({ label, value, accent, icon: Icon }: {
  label: string; value: string | number; accent?: string
  icon?: LucideIcon
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{label}</p>
        {Icon && <Icon size={14} color="var(--text-3)" />}
      </div>
      <p style={{ fontSize: 24, fontWeight: 500, margin: 0, color: accent ?? 'var(--text)' }}>{value}</p>
    </div>
  )
}

export function Tag({ bg, color, children, compact, style }: {
  bg: string; color: string; children: ReactNode; compact?: boolean; style?: CSSProperties
}) {
  return (
    <span style={{ fontSize: 11, padding: compact ? '1px 6px' : '2px 8px', borderRadius: 6, background: bg, color, ...style }}>
      {children}
    </span>
  )
}

export function SectionTitle({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px', color: muted ? 'var(--text-2)' : 'var(--text)' }}>
      {children}
    </p>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      onMouseDown={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'var(--overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 14,
          padding: '1.5rem',
          width: 340,
          maxWidth: '90vw',
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        }}
      >
        {title && (
          <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 8px', color: 'var(--text)' }}>{title}</p>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: title ? '0 0 20px' : '0 0 16px', lineHeight: 1.55 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: danger ? '0.5px solid var(--red-border)' : '0.5px solid var(--blue-border)',
              background: danger ? 'var(--red-bg)' : 'var(--blue-bg)',
              color: danger ? 'var(--red)' : 'var(--blue)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Modal({ title, onClose, children, width = 500 }: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'var(--overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 14, width, maxWidth: '100%', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '0.5px solid var(--border)', flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{title}</p>
          <button
            onClick={onClose}
            style={{
              padding: '3px 7px', borderRadius: 6, border: '0.5px solid var(--border)',
              background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
            }}
          >✕</button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function tabStyle(active: boolean, bordered = false): CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
    border: bordered ? '0.5px solid var(--btn-border)' : 'none',
    background: active ? 'var(--blue-bg)' : 'transparent',
    color: active ? 'var(--blue)' : 'var(--text-2)',
    fontWeight: active ? 500 : 400,
  }
}

export function Dropdown({ value, onChange, options, style }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  style?: CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const selectedLabel = options.find(o => o.value === value)?.label ?? ''

  return (
    <div style={{ position: 'relative', ...style }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box',
          fontSize: 13, padding: '6px 10px', borderRadius: 8,
          border: '0.5px solid var(--btn-border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel}</span>
        <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: 6, color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
            background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)', overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
          }}>
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%',
                  padding: '8px 10px', fontSize: 13, textAlign: 'left', cursor: 'pointer',
                  border: 'none', borderBottom: '0.5px solid var(--border-sub)',
                  background: value === o.value ? 'var(--blue-bg)' : 'transparent',
                  color: value === o.value ? 'var(--blue)' : 'var(--text)',
                  fontWeight: value === o.value ? 500 : 400,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
