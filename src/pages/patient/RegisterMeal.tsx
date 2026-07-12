import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { submitMealAnalysis, retryMealAnalysis, updateMeal } from '@/services/meals'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Camera,
  Upload,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Meal } from '@/lib/types'

export default function RegisterMeal() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [mealId, setMealId] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<Meal | null>(null)
  const [calories, setCalories] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fat, setFat] = useState(0)
  const [fibers, setFibers] = useState(0)
  const [sodium, setSodium] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useRealtime(
    'meals',
    (e) => {
      if (e.action === 'update' && e.record.id === mealId) {
        const meal = e.record as unknown as Meal
        const status = meal.analysis_status
        if (status === 'awaiting_confirmation' && meal.ai_food_identified) {
          setAnalysisResult(meal)
          setCalories(meal.calories || 0)
          setProtein(meal.proteins || 0)
          setCarbs(meal.carbs || 0)
          setFat(meal.fats || 0)
          setFibers(meal.fibers || 0)
          setSodium(meal.sodium || 0)
          setStep(3)
        } else if (status === 'failed') {
          setStep(5)
        }
      }
    },
    !!mealId && (step === 2 || step === 5),
  )

  const handleFileSelect = (selectedFile: File | undefined) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setPhotoPreview(URL.createObjectURL(selectedFile))
  }

  const handleSubmit = async () => {
    if (!file || !user) return
    try {
      const result = await submitMealAnalysis(file, description || 'Refeição')
      setMealId(result.meal_id)
      setStep(2)
    } catch {
      toast({ title: 'Erro ao enviar refeição. Tente novamente.', variant: 'destructive' })
    }
  }

  const handleRetry = async () => {
    if (!mealId) return
    setIsRetrying(true)
    try {
      await retryMealAnalysis(mealId)
      setStep(2)
    } catch {
      toast({ title: 'Erro ao reprocessar. Tente novamente.', variant: 'destructive' })
    } finally {
      setIsRetrying(false)
    }
  }

  const handleConfirm = async () => {
    if (!mealId) return
    try {
      await updateMeal(mealId, { calories, proteins: protein, carbs, fats: fat, fibers, sodium })
      setStep(4)
      setTimeout(() => {
        toast({ title: 'Refeição registrada com sucesso!' })
        navigate('/patient')
      }, 1500)
    } catch {
      toast({ title: 'Erro ao salvar correções.', variant: 'destructive' })
    }
  }

  const confidence = analysisResult?.ai_confidence ?? 0
  const confidenceColor = confidence >= 0.7 ? 'text-green-600' : 'text-amber-600'

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Registrar Refeição</h1>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
      />
      {step === 1 && (
        <div className="animate-fade-in space-y-4">
          <p className="text-muted-foreground text-sm">
            Tire uma foto do seu prato para a IA analisar.
          </p>
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full h-48 rounded-2xl object-cover"
            />
          )}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Almoço com arroz, feijão e frango"
            />
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-primary/50 rounded-2xl h-40 flex flex-col items-center justify-center bg-primary/5 text-primary cursor-pointer active:scale-[0.98] transition-transform"
          >
            <Camera className="w-10 h-10 mb-2" />
            <span className="font-semibold text-sm">
              {photoPreview ? 'Trocar Foto' : 'Tirar Foto'}
            </span>
          </div>
          <Button
            variant="outline"
            className="w-full py-6"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-5 h-5 mr-2" /> Escolher da Galeria
          </Button>
          {file && (
            <Button size="lg" className="w-full" onClick={handleSubmit}>
              Enviar para Análise <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      )}
      {step === 2 && (
        <div className="animate-fade-in space-y-6 flex flex-col items-center pt-8">
          {photoPreview && (
            <div className="relative w-40 h-40 rounded-2xl overflow-hidden shadow-subtle opacity-80">
              <img src={photoPreview} alt="Plate" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h3 className="font-bold text-lg">Análise em andamento</h3>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Sua refeição foi enviada com sucesso. A IA está processando a imagem em segundo plano.
              Você será notificado quando os resultados estiverem prontos.
            </p>
          </div>
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processando imagem com IA...</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full animate-pulse"
                style={{ width: '60%' }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Você pode continuar usando o app. Retornaremos automaticamente quando pronto.
          </p>
        </div>
      )}
      {step === 3 && analysisResult && (
        <div className="animate-slide-up space-y-6">
          <Card className="border-none shadow-subtle">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-primary">Análise Concluída</h3>
                <span className={`text-xs font-bold ${confidenceColor}`}>
                  Confiança: {Math.round(confidence * 100)}%
                </span>
              </div>
              {confidence < 0.7 && (
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
                  Baixa confiança na detecção. Sua nutricionista revisará esta refeição.
                </p>
              )}
              {analysisResult.ai_food_identified && (
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {analysisResult.ai_food_identified.split(', ').map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {analysisResult.ai_description && (
                <p className="text-sm text-muted-foreground">{analysisResult.ai_description}</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Valores sujeitos à confirmação</h3>
              <span className="text-xs text-muted-foreground">Ajuste se necessário</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Calorias (kcal)</Label>
                <Input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Proteínas (g)</Label>
                <Input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Carbos (g)</Label>
                <Input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Gorduras (g)</Label>
                <Input type="number" value={fat} onChange={(e) => setFat(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Fibras (g)</Label>
                <Input
                  type="number"
                  value={fibers}
                  onChange={(e) => setFibers(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Sódio (mg)</Label>
                <Input
                  type="number"
                  value={sodium}
                  onChange={(e) => setSodium(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          {analysisResult.ai_notes && (
            <Card className="bg-primary/5">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{analysisResult.ai_notes}</p>
              </CardContent>
            </Card>
          )}
          <Button size="lg" className="w-full" onClick={handleConfirm}>
            Confirmar Registro <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
      {step === 4 && (
        <div className="animate-slide-up flex flex-col items-center justify-center py-20 text-center space-y-4">
          <CheckCircle2 className="w-20 h-20 text-primary animate-fade-in-up" />
          <h2 className="text-2xl font-bold">Excelente!</h2>
          <p className="text-muted-foreground">Refeição registrada com sucesso.</p>
        </div>
      )}
      {step === 5 && (
        <div className="animate-fade-in flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-20 h-20 rounded-full border-4 border-red-400 flex items-center justify-center mb-2">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Falha na análise</h2>
          <p className="text-muted-foreground text-[15px] max-w-[280px] leading-snug">
            Não foi possível processar a análise da sua refeição no momento. Você pode tentar
            novamente.
          </p>
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="mt-4 rounded-full bg-primary hover:bg-primary/90 text-white px-8 h-12 text-base font-medium"
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Reenviando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" /> Tentar Novamente
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/patient')}
            className="text-muted-foreground"
          >
            Voltar ao início
          </Button>
        </div>
      )}
    </div>
  )
}
