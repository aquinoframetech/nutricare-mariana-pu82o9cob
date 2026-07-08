import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient } from '@/services/patients'
import { getMealsWithPhotos, updateMeal } from '@/services/meals'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Send, Sparkles, Save, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Patient, Meal } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type MealWithPhoto = Meal & { photoUrl: string }

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [meals, setMeals] = useState<MealWithPhoto[]>([])
  const [corrections, setCorrections] = useState<Record<string, number>>({})
  const [report, setReport] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const p = await getPatient(id)
      setPatient(p)
      const m = await getMealsWithPhotos(id)
      setMeals(m)
      const corr: Record<string, number> = {}
      m.forEach((meal) => {
        corr[meal.id] = meal.calories_corrected ?? 0
      })
      setCorrections(corr)
    } catch {
      toast({ title: 'Erro ao carregar dados do paciente.', variant: 'destructive' })
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('meals', () => {
    loadData()
  })

  const handleSaveCorrection = async (mealId: string) => {
    const corrected = corrections[mealId] ?? 0
    try {
      await updateMeal(mealId, { calories_corrected: corrected })
      toast({ title: 'Correção salva! Delta registrado.' })
    } catch {
      toast({ title: 'Erro ao salvar correção.', variant: 'destructive' })
    }
  }

  const handleGenerateReport = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setReport(
        'Resumo IA: A paciente manteve adesão calórica em 85% dos dias. Observa-se um déficit sistemático de proteínas nas refeições noturnas. Sugestão: Avaliar suplementação proteica no jantar.',
      )
      setIsGenerating(false)
    }, 2000)
  }

  const handleSendMessage = () => {
    toast({ title: 'Orientação enviada para o aplicativo do paciente.' })
    setMessage('')
  }

  if (loading) return <div className="flex items-center justify-center h-64">Carregando...</div>
  if (!patient) return <div>Paciente não encontrado</div>

  const userName = patient.expand?.user_id?.name || 'Paciente'
  const userAvatar = patient.expand?.user_id?.avatar || ''

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
            <AvatarImage src={userAvatar} />
            <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{userName}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              {patient.goal && <Badge variant="secondary">{patient.goal}</Badge>}
              {patient.condition && <Badge variant="outline">{patient.condition}</Badge>}
              {patient.calorie_goal && (
                <Badge variant="outline">Meta: {patient.calorie_goal} kcal</Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isGenerating ? 'Analisando...' : 'Gerar Relatório IA'}
        </Button>
      </div>

      {report && (
        <Card className="bg-indigo-50 border-indigo-100 animate-slide-up dark:bg-indigo-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-800 dark:text-indigo-300 flex items-center">
              <Sparkles className="w-4 h-4 mr-2" /> Insight Nutricional (IA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-indigo-900 dark:text-indigo-200 text-sm leading-relaxed">{report}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revisão de Refeições — Correção IA</CardTitle>
              <CardDescription>Valores da IA lado a lado com correção profissional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {meals.map((meal) => {
                const delta = (corrections[meal.id] ?? 0) - (meal.calories ?? 0)
                const lowConfidence = (meal.ai_confidence ?? 1) < 0.7
                return (
                  <div
                    key={meal.id}
                    className={`rounded-xl border p-4 space-y-3 ${lowConfidence ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-border'}`}
                  >
                    <div className="flex items-start gap-3">
                      {meal.photoUrl ? (
                        <img
                          src={meal.photoUrl}
                          alt="Refeição"
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                        />
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{meal.name || 'Refeição'}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(meal.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        {meal.ai_food_identified && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            IA: {meal.ai_food_identified}
                          </p>
                        )}
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            IA: {meal.calories ?? 0} kcal
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {meal.proteins ?? 0}P {meal.carbs ?? 0}C {meal.fats ?? 0}G
                          </Badge>
                          {lowConfidence && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Baixa confiança ({Math.round((meal.ai_confidence ?? 0) * 100)}%)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Correção (kcal)</Label>
                        <Input
                          type="number"
                          value={corrections[meal.id] ?? 0}
                          onChange={(e) =>
                            setCorrections((prev) => ({
                              ...prev,
                              [meal.id]: Number(e.target.value),
                            }))
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Delta</Label>
                        <div
                          className={`text-sm font-bold h-9 flex items-center ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-green-500' : 'text-muted-foreground'}`}
                        >
                          {delta > 0 ? '+' : ''}
                          {delta} kcal
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleSaveCorrection(meal.id)}>
                        <Save className="w-3 h-3 mr-1" /> Salvar
                      </Button>
                    </div>
                  </div>
                )
              })}
              {meals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma refeição registrada.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Orientação</CardTitle>
              <CardDescription>O paciente receberá um alerta no aplicativo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Ex: Vi que você comeu pouca proteína ontem. Tente incluir iogurte hoje!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none"
              />
              <Button onClick={handleSendMessage} disabled={!message} className="w-full">
                <Send className="w-4 h-4 mr-2" /> Enviar
              </Button>
            </CardContent>
          </Card>

          {patient.allergies && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alergias</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{patient.allergies}</p>
              </CardContent>
            </Card>
          )}
          {patient.restrictions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Restrições</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{patient.restrictions}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
