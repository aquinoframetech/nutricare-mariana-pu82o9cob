import { ChatInterface } from '@/components/shared/chat-interface'

export default function NutriChat() {
  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col max-w-3xl mx-auto">
      <ChatInterface
        title="Assistente NutriCare"
        subtitle="Estimativas nutricionais e análise clínica dos seus pacientes"
      />
    </div>
  )
}
