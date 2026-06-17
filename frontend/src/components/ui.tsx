import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1.25rem', ...style }}>
      {children}
    </div>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>{children}</label>
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
