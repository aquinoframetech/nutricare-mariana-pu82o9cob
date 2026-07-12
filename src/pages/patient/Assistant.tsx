import { ChatInterface } from '@/components/shared/chat-interface'

export default function Assistant() {
  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col max-w-2xl mx-auto">
      <ChatInterface
        title="Assistente Nutricional IA"
        subtitle="Estime calorias de refeições ou tire dúvidas sobre nutrição"
      />
    </div>
  )
}
