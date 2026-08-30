import { useState, useCallback, useEffect } from 'react'
import { api, ChatMessage } from '../api/client'

export function useAssistantConversation(initialConversationId?: string | null) {
  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectConversation = useCallback(async (id: string) => {
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
  }, [])

  useEffect(() => {
    if (initialConversationId) selectConversation(initialConversationId)
    // Only ever run for the id this hook instance was created with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startNewChat() {
    setActiveId(null)
    setMessages([])
    setError(null)
  }

  async function send(content: string) {
    if (!content.trim() || sending) return
    setMessages(m => [...m, { role: 'user', content }])
    setSending(true)
    setError(null)
    try {
      const result = await api.agent.chat(content, activeId)
      setMessages(m => [...m, { role: 'assistant', content: result.reply }])
      setActiveId(result.conversation_id)
      return result.conversation_id
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong talking to the assistant')
    } finally {
      setSending(false)
    }
  }

  return { activeId, messages, loadingConversation, sending, error, startNewChat, selectConversation, send }
}
