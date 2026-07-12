import { Utensils, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatSuggestionsProps {
  onSelect: (text: string) => void
  disabled?: boolean
}

export function ChatSuggestions({ onSelect, disabled }: ChatSuggestionsProps) {
  const suggestions = [
    {
      icon: Utensils,
      label: 'Estimar refeição',
      text: 'Um prato com arroz, feijão, salada de alface, 150g de bife frito, tudo pesando 650g, quantas calorias tem?',
    },
    {
      icon: Stethoscope,
      label: 'Análise clínica',
      text: 'Como está a aderência calórica dos meus pacientes nos últimos 7 dias?',
    },
  ]

  return (
    <div className="space-y-2">
      {suggestions.map((s) => (
        <button
          key={s.label}
          onClick={() => onSelect(s.text)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl border border-border/60',
            'hover:border-primary/40 hover:bg-primary/5 transition-all duration-200',
            'text-left text-sm disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <s.icon className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="font-medium">{s.label}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{s.text}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
