import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bot, X, Plus, Maximize2 } from 'lucide-react'
import { ChatPane } from './ChatPane'
import { api, AgentSettings } from '../api/client'
import { useAssistantConversation } from '../hooks/useAssistantConversation'

const STORAGE_KEY = 'tankbook-widget-conversation-id'

export default function AssistantWidget() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [configured, setConfigured] = useState(false)

  const conv = useAssistantConversation(localStorage.getItem(STORAGE_KEY))

  useEffect(() => {
    api.agent.getSettings()
      .then((s: AgentSettings) => setConfigured(!!s.provider && !!s.model))
      .catch(() => setConfigured(false))
  }, [])

  useEffect(() => {
    if (conv.activeId) localStorage.setItem(STORAGE_KEY, conv.activeId)
    else localStorage.removeItem(STORAGE_KEY)
  }, [conv.activeId])

  // Avoid a second chat surface stacked on top of the full Assistant page itself.
  if (pathname === '/assistant' || !configured) return null

  return (
    <>
      {open && (
        <div
          style={{
            position: 'fixed', bottom: 84, left: 20, zIndex: 300,
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
            height={360}
            emptyHint='Ask me anything about your tanks.'
          />
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title="Chat with the assistant"
        style={{
          position: 'fixed', bottom: 20, left: 20, zIndex: 300,
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
