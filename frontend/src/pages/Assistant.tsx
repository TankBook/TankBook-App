import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Cog, Plus, Trash2, MessageSquare } from 'lucide-react'
import { Card } from '../components/ui'
import { ChatPane } from '../components/ChatPane'
import { api, AgentSettings, Conversation } from '../api/client'
import { useSettings, formatDateTime } from '../context/SettingsContext'
import { useAssistantConversation } from '../hooks/useAssistantConversation'

export default function Assistant() {
  const { dateFormat } = useSettings()
  const [settings, setSettings] = useState<AgentSettings | null>(null)
  const [checkingSettings, setCheckingSettings] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 860px)').matches)

  const conv = useAssistantConversation()

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    api.agent.getSettings()
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setCheckingSettings(false))
    refreshConversations()
  }, [])

  const configured = !!settings?.provider && !!settings?.model

  function refreshConversations() {
    api.agent.listConversations().then(setConversations).catch(() => {})
  }

  async function handleSend(text: string) {
    await conv.send(text)
    refreshConversations()
  }

  async function removeConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await api.agent.deleteConversation(id)
      if (id === conv.activeId) conv.startNewChat()
      refreshConversations()
    } catch {
      // deletion failures aren't critical enough to surface a whole error state here
    }
  }

  if (checkingSettings) return <p style={{ color: 'var(--text-2)' }}>Loading…</p>

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Bot size={20} />Assistant
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-2)' }}>
        Ask questions about your tanks — water parameters, alerts, journal history, and species compatibility.
      </p>

      {!configured ? (
        <Card style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Bot size={28} color="var(--text-3)" style={{ marginBottom: 12 }} />
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>No AI provider configured</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-2)' }}>
            Connect Claude, OpenAI, or Ollama in Settings to start using the assistant.
          </p>
          <Link
            to="/settings"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500,
              padding: '7px 16px', borderRadius: 8, border: '0.5px solid var(--blue-border)',
              background: 'var(--blue-bg)', color: 'var(--blue)', textDecoration: 'none',
            }}
          >
            <Cog size={13} />Go to Settings
          </Link>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: 'flex-start' }}>
          <Card style={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', order: isMobile ? 2 : 1 }}>
            <ChatPane
              messages={conv.messages}
              sending={conv.sending}
              error={conv.error}
              loadingConversation={conv.loadingConversation}
              onSend={handleSend}
            />
          </Card>

          <Card style={{ width: isMobile ? '100%' : 260, flexShrink: 0, padding: 0, overflow: 'hidden', order: isMobile ? 1 : 2 }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border-sub)' }}>
              <button
                onClick={conv.startNewChat}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
                  padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                  boxSizing: 'border-box',
                }}
              >
                <Plus size={13} />New Chat
              </button>
            </div>
            <div style={{ maxHeight: isMobile ? 200 : 'min(60vh, 520px)', overflowY: 'auto' }}>
              {conversations.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '20px 12px' }}>
                  No conversations yet
                </p>
              ) : conversations.map(c => (
                <div
                  key={c.id}
                  onClick={() => conv.selectConversation(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    padding: '10px 16px', borderBottom: '0.5px solid var(--border-sub)',
                    background: c.id === conv.activeId ? 'var(--blue-bg)' : 'transparent',
                  }}
                >
                  <MessageSquare size={13} color={c.id === conv.activeId ? 'var(--blue)' : 'var(--text-3)'} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: c.id === conv.activeId ? 'var(--blue)' : 'var(--text)', fontWeight: c.id === conv.activeId ? 500 : 400,
                    }}>
                      {c.title || 'Untitled chat'}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)' }}>
                      {formatDateTime(c.updated_at, dateFormat)}
                    </p>
                  </div>
                  <button
                    onClick={e => removeConversation(c.id, e)}
                    title="Delete conversation"
                    style={{
                      display: 'flex', alignItems: 'center', background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--text-3)', padding: 4, lineHeight: 0, flexShrink: 0,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
