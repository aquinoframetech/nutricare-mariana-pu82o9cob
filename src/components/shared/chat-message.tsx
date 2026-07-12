import { Bot, User, AlertCircle, CheckCircle2, Utensils, Stethoscope } from 'lucide-react'
import { type DisplayMessage } from '@/lib/skipAi'

interface ChatMessageProps {
  message: DisplayMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  const renderContent = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, idx) => {
      const trimmed = line.trim()
      if (!trimmed) return <div key={idx} className="h-2" />

      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return (
          <p key={idx} className="font-semibold mt-2 first:mt-0">
            {trimmed.slice(2, -2)}
          </p>
        )
      }

      if (/^[-•]\s/.test(trimmed)) {
        const text = trimmed.replace(/^[-•]\s/, '')
        const parts = text.split(/(\*\*[^*]+\*\*)/g)
        return (
          <div key={idx} className="flex gap-1.5 ml-2">
            <span className="text-primary shrink-0">•</span>
            <span>
              {parts.map((part, i) =>
                part.startsWith('**') && part.endsWith('**') ? (
                  <strong key={i}>{part.slice(2, -2)}</strong>
                ) : (
                  part
                ),
              )}
            </span>
          </div>
        )
      }

      const boldParts = trimmed.split(/(\*\*[^*]+\*\*)/g)
      const hasBold = boldParts.some((p) => p.startsWith('**'))
      if (hasBold) {
        return (
          <p key={idx} className="mt-1">
            {boldParts.map((part, i) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={i}>{part.slice(2, -2)}</strong>
              ) : (
                part
              ),
            )}
          </p>
        )
      }

      return (
        <p key={idx} className="mt-1 first:mt-0">
          {trimmed}
        </p>
      )
    })
  }

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
          isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'
        }`}
      >
        {renderContent(message.content)}
        {!isUser && message.content.toLowerCase().includes('estimad') && (
          <div className="mt-3 pt-2 border-t border-border/50 flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              Orientações educativas — não substituem o nutricionista. Preparo, porções e
              ingredientes podem alterar os valores.
            </span>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  )
}
