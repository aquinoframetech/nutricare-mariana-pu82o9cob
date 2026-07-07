import { AlertCircle } from 'lucide-react'

export function Disclaimer() {
  return (
    <div className="flex items-start gap-2 p-4 mt-8 bg-muted/50 rounded-xl text-muted-foreground">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed">
        <strong>Atenção:</strong> Este aplicativo é uma ferramenta de apoio tecnológico nutricional
        e não substitui o acompanhamento profissional presencial ou decisões médicas.
      </p>
    </div>
  )
}
