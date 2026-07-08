import { ChatInterface } from '@/components/shared/chat-interface'

export default function Assistant() {
  return (
    <div className="h-screen flex flex-col max-w-md mx-auto">
      <ChatInterface
        title="Assistente IA"
        subtitle="Dicas nutricionais educativas — não substitui o nutricionista"
      />
    </div>
  )
}
