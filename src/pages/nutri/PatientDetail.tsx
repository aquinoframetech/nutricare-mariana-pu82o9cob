import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '@/contexts/data-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CalorieChart } from '@/components/charts/calorie-chart'
import { ArrowLeft, Send, Sparkles, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { patients, meals } = useData()
  const { toast } = useToast()

  const [report, setReport] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')

  const patient = patients.find((p) => p.id === id)
  const patientMeals = meals.filter((m) => m.patientId === id)

  if (!patient) return <div>Paciente não encontrado</div>

  const handleGenerateReport = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setReport(
        'Resumo IA: A paciente manteve adesão calórica em 85% dos dias. Observa-se um déficit sistemático de proteínas nas refeições noturnas. Sugestão clínica: Avaliar aceitação de suplementação proteica ou ovos no jantar para atingir a meta de 80g/dia.',
      )
      setIsGenerating(false)
    }, 2000)
  }

  const handleSendMessage = () => {
    toast({ title: 'Orientação enviada para o aplicativo do paciente.' })
    setMessage('')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <Button
        variant="ghost"
        onClick={() => navigate('/nutri/patients')}
        className="-ml-4 text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 shadow-sm">
            <AvatarImage src={patient.avatar} />
            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary">{patient.clinicalCondition}</Badge>
              <Badge variant="outline">Meta: {patient.dailyTarget} kcal</Badge>
            </div>
          </div>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isGenerating ? 'Analisando dados...' : 'Gerar Relatório IA'}
        </Button>
      </div>

      {report && (
        <Card className="bg-indigo-50 border-indigo-100 animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-800 flex items-center">
              <Sparkles className="w-4 h-4 mr-2" /> Insight Nutricional (Gerado por IA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-indigo-900 text-sm leading-relaxed">{report}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Adesão Calórica (Últimos 7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <CalorieChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enviar Orientação</CardTitle>
              <CardDescription>O paciente receberá um alerta push no aplicativo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Ex: Vi que você comeu pouca proteína ontem. Tente incluir iogurte hoje à tarde!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none"
              />
              <Button onClick={handleSendMessage} disabled={!message}>
                <Send className="w-4 h-4 mr-2" /> Enviar
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Feed de Refeições</CardTitle>
              <CardDescription>Fotos processadas pela IA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {patientMeals.map((meal) => (
                  <div key={meal.id} className="flex gap-4">
                    <img
                      src={meal.imageUrl}
                      alt="Refeição"
                      className="w-16 h-16 rounded-lg object-cover shadow-sm shrink-0"
                    />
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm">{meal.calories} kcal</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {format(new Date(meal.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex gap-1.5 text-[10px] font-medium">
                        <span className="text-rose-500">{meal.macros.protein}P</span>
                        <span className="text-amber-500">{meal.macros.carbs}C</span>
                        <span className="text-blue-500">{meal.macros.fat}G</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {meal.items.join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
                {patientMeals.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhum registro ainda.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
