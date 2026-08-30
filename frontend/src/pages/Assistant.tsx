import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, Cog, Plus, Trash2, MessageSquare } from 'lucide-react'
import { Card } from '../components/ui'
import { api, AgentSettings, Conversation, ChatMessage } from '../api/client'
import { useSettings, formatDateTime } from '../context/SettingsContext'

export default function Assistant() {
  const { dateFormat } = useSettings()
  const [settings, setSettings] = useState<AgentSettings | null>(null)
  const [checkingSettings, setCheckingSettings] = useState(true)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 860px)').matches)
  const bottomRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const configured = !!settings?.provider && !!settings?.model

  function refreshConversations() {
    api.agent.listConversations().then(setConversations).catch(() => {})
  }

  function startNewChat() {
    setActiveId(null)
    setMessages([])
    setError(null)
  }

  async function selectConversation(id: string) {
    if (id === activeId) return
    setActiveId(id)
    setError(null)
    setLoadingConversation(true)
    try {
      const detail = await api.agent.getConversation(id)
      setMessages(detail.messages.map(m => ({ role: m.role, content: m.content })))
    } catch {
      setError('Could not load that conversation')
    } finally {
      setLoadingConversation(false)
    }
  }

  async function removeConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await api.agent.deleteConversation(id)
      if (id === activeId) startNewChat()
      refreshConversations()
    } catch {
      setError('Could not delete that conversation')
    }
  }

  async function send() {
    const content = input.trim()
    if (!content || sending) return
    setMessages(m => [...m, { role: 'user', content }])
    setInput('')
    setSending(true)
    setError(null)
    try {
      const result = await api.agent.chat(content, activeId)
      setMessages(m => [...m, { role: 'assistant', content: result.reply }])
      setActiveId(result.conversation_id)
      refreshConversations()
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong talking to the assistant')
    } finally {
      setSending(false)
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
            <div style={{ height: 'min(60vh, 520px)', overflowY: 'auto', padding: '20px' }}>
              {loadingConversation ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', marginTop: 40 }}>Loading conversation…</p>
              ) : messages.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', marginTop: 40 }}>
                  Try asking "Are there any active alerts?" or "How has the pH in my main tank changed recently?"
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!loadingConversation && messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      padding: '8px 12px',
                      borderRadius: 12,
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      background: m.role === 'user' ? 'var(--blue-bg)' : 'var(--surface-2)',
                      color: m.role === 'user' ? 'var(--blue)' : 'var(--text)',
                      border: m.role === 'user' ? '0.5px solid var(--blue-border)' : '0.5px solid var(--border)',
                    }}
                  >
                    {m.content}
                  </div>
                ))}
                {sending && (
                  <div style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--text-3)', padding: '8px 12px' }}>
                    Thinking…
                  </div>
                )}
              </div>
              <div ref={bottomRef} />
            </div>

            {error && (
              <p style={{ margin: '0 20px 8px', fontSize: 12, color: 'var(--red)' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '0.5px solid var(--border-sub)' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask about your tanks…"
                disabled={sending}
                style={{ flex: 1, boxSizing: 'border-box' }}
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: sending || !input.trim() ? 'default' : 'pointer',
                  border: '0.5px solid var(--blue-border)',
                  background: !sending && input.trim() ? 'var(--blue-bg)' : 'var(--surface-2)',
                  color: !sending && input.trim() ? 'var(--blue)' : 'var(--text-3)',
                }}
              >
                <Send size={13} />Send
              </button>
            </div>
          </Card>

          <Card style={{ width: isMobile ? '100%' : 260, flexShrink: 0, padding: 0, overflow: 'hidden', order: isMobile ? 1 : 2 }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border-sub)' }}>
              <button
                onClick={startNewChat}
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
                  onClick={() => selectConversation(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    padding: '10px 16px', borderBottom: '0.5px solid var(--border-sub)',
                    background: c.id === activeId ? 'var(--blue-bg)' : 'transparent',
                  }}
                >
                  <MessageSquare size={13} color={c.id === activeId ? 'var(--blue)' : 'var(--text-3)'} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: c.id === activeId ? 'var(--blue)' : 'var(--text)', fontWeight: c.id === activeId ? 500 : 400,
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
