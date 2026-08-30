import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { ChatMessage } from '../api/client'

export function ChatPane({
  messages,
  sending,
  error,
  loadingConversation,
  onSend,
  height = 'min(60vh, 520px)',
  emptyHint = 'Try asking "Are there any active alerts?" or "How has the pH in my main tank changed recently?"',
  placeholder = 'Ask about your tanks…',
}: {
  messages: ChatMessage[]
  sending: boolean
  error: string | null
  loadingConversation?: boolean
  onSend: (text: string) => void
  height?: string | number
  emptyHint?: string
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  function submit() {
    const content = input.trim()
    if (!content) return
    onSend(content)
    setInput('')
  }

  return (
    <>
      <div style={{ height, overflowY: 'auto', padding: '16px' }}>
        {loadingConversation ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', marginTop: 40 }}>Loading conversation…</p>
        ) : messages.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', marginTop: 40 }}>{emptyHint}</p>
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
        <p style={{ margin: '0 16px 8px', fontSize: 12, color: 'var(--red)' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '0.5px solid var(--border-sub)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder={placeholder}
          disabled={sending}
          style={{ flex: 1, boxSizing: 'border-box' }}
        />
        <button
          onClick={submit}
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
    </>
  )
}
