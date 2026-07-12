import { useState, useEffect, useRef, useCallback } from 'react'
import { chatWithAgent } from '@/services/agent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Bot, AlertCircle } from 'lucide-react'
import { type DisplayMessage } from '@/lib/skipAi'
import { ChatMessage } from '@/components/shared/chat-message'
import { ChatSuggestions } from '@/components/shared/chat-suggestions'

interface ChatInterfaceProps {
  title?: string
  subtitle?: string
}

export function ChatInterface({ title = 'Assistente IA', subtitle }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = useCallback(
    async (text?: string) => {
      const userMsg = (text ?? input).trim()
      if (!userMsg || loading) return
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
    },
    [input, loading, conversationId],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <Card className="p-6 text-center text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-3 text-primary" />
              <p className="font-medium text-foreground">Olá! Sou seu assistente nutricional.</p>
              <p className="text-sm mt-1">
                Posso estimar calorias de refeições ou analisar registros clínicos.
              </p>
              <p className="text-xs mt-3 text-amber-600 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Orientações educativas — não substituem o nutricionista.
              </p>
            </Card>
            <ChatSuggestions onSelect={(text) => handleSend(text)} disabled={loading} />
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex gap-2 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="bg-muted p-3.5 rounded-2xl rounded-tl-sm text-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                <span
                  className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse"
                  style={{ animationDelay: '0.2s' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 p-4 border-t bg-background/80 backdrop-blur-sm">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Descreva uma refeição ou faça uma pergunta..."
          disabled={loading}
        />
        <Button size="icon" onClick={() => handleSend()} disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
