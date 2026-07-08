import { useState, useEffect, useRef, useCallback } from 'react'
import { chatWithAgent } from '@/services/agent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Bot, User } from 'lucide-react'
import { type DisplayMessage } from '@/lib/skipAi'

export default function Assistant() {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [
      ...prev,
      { id: `u${Date.now()}`, role: 'user', content: userMsg, created: new Date().toISOString() },
    ])
    setLoading(true)
    try {
      const result = await chatWithAgent(userMsg, conversationId)
      setConversationId(result.conversation_id)
      setMessages((prev) => [
        ...prev,
        {
          id: result.message_id,
          role: 'assistant',
          content: result.content,
          created: new Date().toISOString(),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro. Tente novamente.',
          created: new Date().toISOString(),
        },
      ])
    }
    setLoading(false)
  }, [input, loading, conversationId])

  return (
    <div className="p-4 max-w-md mx-auto h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Assistente IA</h1>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-3 text-primary" />
            <p>Olá! Sou seu assistente nutricional. Como posso ajudar?</p>
          </Card>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="bg-muted p-3 rounded-2xl text-sm animate-pulse">Digitando...</div>
          </div>
        )}
      </div>
      <div className="flex gap-2 pb-20">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pergunte sobre nutrição..."
          disabled={loading}
        />
        <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
