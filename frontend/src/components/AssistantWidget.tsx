import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bot, X, Plus, Maximize2 } from 'lucide-react'
import { ChatPane } from './ChatPane'
import { api, hasPermission, AgentSettings } from '../api/client'
import { useAssistantConversation } from '../hooks/useAssistantConversation'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'tankbook-widget-conversation-id'

export default function AssistantWidget() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const canUse = hasPermission(user?.permissions.ai, 'use')
  const canEdit = hasPermission(user?.permissions.ai, 'edit')
  const [open, setOpen] = useState(false)
  // Use-only accounts can't read /agent/settings (edit-only endpoint) — assume
  // configured and let an actual chat attempt surface "not configured" if it isn't.
  const [configured, setConfigured] = useState(!canEdit)

  const conv = useAssistantConversation(localStorage.getItem(STORAGE_KEY))

  // The button/panel float at a fixed distance from the bottom of the viewport, but
  // the footer sits in normal document flow — so scrolling to the bottom of a page
  // can bring the footer up underneath them. footerExtra lifts both by however much
  // of the footer is currently showing, keeping the same 20px gap above the footer
  // that they keep from the screen edge otherwise. The panel also grows upward from
  // its bottom offset, so chatHeight caps its chat area so the panel as a whole never
  // rises above the navbar (same 20px gap below it).
  const [footerExtra, setFooterExtra] = useState(0)
  const [chatHeight, setChatHeight] = useState(360)

  useEffect(() => {
    function recalc() {
      const footerRect = document.querySelector('footer')?.getBoundingClientRect()
      const visibleFooter = footerRect ? Math.min(footerRect.height, Math.max(0, window.innerHeight - footerRect.top)) : 0
      setFooterExtra(visibleFooter)

      const navBottom = document.querySelector('nav')?.getBoundingClientRect().bottom ?? 0
      const panelBottomOffset = 84 + visibleFooter
      const gapBelowNav = 20
      const chrome = 110 // header + input row + borders, the panel's non-scrolling parts
      const available = window.innerHeight - navBottom - gapBelowNav - panelBottomOffset - chrome
      setChatHeight(Math.max(120, Math.min(360, available)))
    }
    recalc()
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', recalc, { passive: true })
    return () => {
      window.removeEventListener('resize', recalc)
      window.removeEventListener('scroll', recalc)
    }
  }, [])

  useEffect(() => {
    if (!canUse || !canEdit) return
    api.agent.getSettings()
      .then((s: AgentSettings) => setConfigured(!!s.provider && !!s.model))
      .catch(() => setConfigured(false))
  }, [canUse, canEdit])

  useEffect(() => {
    if (conv.activeId) localStorage.setItem(STORAGE_KEY, conv.activeId)
    else localStorage.removeItem(STORAGE_KEY)
  }, [conv.activeId])

  // Avoid a second chat surface stacked on top of the full Assistant page itself.
  if (pathname === '/assistant' || !canUse || !configured) return null

  return (
    <>
      {open && (
        <div
          style={{
            position: 'fixed', bottom: 84 + footerExtra, left: 20, zIndex: 300,
            width: 340, maxWidth: 'calc(100vw - 40px)',
            background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14,
            boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderBottom: '0.5px solid var(--border)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
              <Bot size={15} />Assistant
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={conv.startNewChat}
                title="New chat"
                style={{ display: 'flex', padding: 5, borderRadius: 6, border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', lineHeight: 0 }}
              >
                <Plus size={14} />
              </button>
              <Link
                to="/assistant"
                title="Open full history"
                style={{ display: 'flex', padding: 5, borderRadius: 6, color: 'var(--text-3)', lineHeight: 0 }}
              >
                <Maximize2 size={14} />
              </Link>
              <button
                onClick={() => setOpen(false)}
                title="Close"
                style={{ display: 'flex', padding: 5, borderRadius: 6, border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', lineHeight: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <ChatPane
            messages={conv.messages}
            sending={conv.sending}
            error={conv.error}
            loadingConversation={conv.loadingConversation}
            onSend={conv.send}
            height={chatHeight}
            emptyHint='Ask me anything about your tanks.'
          />
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title="Chat with the assistant"
        style={{
          position: 'fixed', bottom: 20 + footerExtra, left: 20, zIndex: 300,
          width: 48, height: 48, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.18)', cursor: 'pointer',
        }}
      >
        {open ? <X size={20} /> : <Bot size={20} />}
      </button>
    </>
  )
}
