import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import {
  submitMealAnalysis,
  retryMealAnalysis,
  updateMeal,
  getMeal,
  confirmMeal,
  categorizeMealError,
} from '@/services/meals'
import pb from '@/lib/pocketbase/client'
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
  WifiOff,
  ShieldAlert,
  ImageOff,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Meal } from '@/lib/types'

import { useLocation } from 'react-router-dom'
import { getMealPhotos, getMealPhotoUrl } from '@/services/meals'

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // Aligned with meal_photos collection maxSize (5242880 bytes)

function validateFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WebP).'
  }
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    return 'Formato não suportado. Use JPG, PNG ou WebP.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Imagem muito grande. O tamanho máximo é 5MB.'
  }
  if (file.size < 1024) {
    return 'Imagem muito pequena. O arquivo pode estar corrompido.'
  }
  return null
}

function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxWidth) / height)
            height = maxWidth
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context is null'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const extension = file.name.split('.').pop()?.toLowerCase()
              const isPng = extension === 'png'
              const mimeType = isPng ? 'image/png' : 'image/jpeg'
              resolve(new File([blob], file.name, { type: mimeType }))
            } else {
              reject(new Error('Canvas to Blob failed'))
            }
          },
          'image/jpeg',
          quality,
        )
      }
      img.onerror = (error) => reject(error)
    }
    reader.onerror = (error) => reject(error)
  })
}

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [clientRequestId, setClientRequestId] = useState('')
  const [errorMessage, setErrorMessage] = useState<{
    title: string
    description?: string
    icon: 'network' | 'auth' | 'file' | 'server'
  } | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (location.state?.mealId && !mealId) {
      const mId = location.state.mealId
      setMealId(mId)

      getMeal(mId)
        .then(async (meal) => {
          try {
            const photos = await getMealPhotos(mId)
            if (photos.length > 0) {
              setPhotoPreview(getMealPhotoUrl(photos[0], photos[0].image))
            }
          } catch {
            /* intentionally ignored */
          }

          if (meal.analysis_status === 'awaiting_confirmation') {
            applyMealResult(meal)
            setStep(3)
          } else if (meal.analysis_status === 'failed') {
            setStep(5)
          } else if (meal.analysis_status === 'pending' || meal.analysis_status === 'processing') {
            setStep(2)
          } else if (
            meal.analysis_status === 'confirmed' ||
            meal.analysis_status === 'professionally_corrected'
          ) {
            navigate('/patient/history')
          }
        })
        .catch((err) => {
          console.error('Failed to fetch initial meal:', err)
        })
    }
  }, [location.state, mealId, navigate])

  useRealtime(
    'meals',
    (e) => {
      if (e.action === 'update' && e.record.id === mealId) {
        const meal = e.record as unknown as Meal
        const status = meal.analysis_status
        if (status === 'awaiting_confirmation') {
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
    !!mealId && (step === 2 || step === 5 || step === 6),
  )

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => {
        setStep(6)
      }, 40000)
      return () => clearTimeout(timer)
    }
  }, [step])

  useEffect(() => {
    if (isSubmitting || step === 2 || step === 3) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = ''
      }
      window.addEventListener('beforeunload', handler)
      return () => window.removeEventListener('beforeunload', handler)
    }
  }, [isSubmitting, step])

  const clearError = useCallback(() => {
    if (errorMessage) setErrorMessage(null)
  }, [errorMessage])

  const handleFileSelect = async (selectedFile: File | undefined) => {
    if (!selectedFile) return
    clearError()
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setErrorMessage({ title: validationError, icon: 'file' })
      return
    }

    setIsCompressing(true)
    try {
      const compressedFile = await compressImage(selectedFile)
      setFile(compressedFile)
      setPhotoPreview(URL.createObjectURL(compressedFile))
      setClientRequestId(crypto.randomUUID())
    } catch (error) {
      console.error('Compression error:', error)
      setFile(selectedFile)
      setPhotoPreview(URL.createObjectURL(selectedFile))
      setClientRequestId(crypto.randomUUID())
    } finally {
      setIsCompressing(false)
    }
  }

  const applyMealResult = (meal: Meal) => {
    setAnalysisResult(meal)
    setCalories(meal.calories || 0)
    setProtein(meal.proteins || 0)
    setCarbs(meal.carbs || 0)
    setFat(meal.fats || 0)
    setFibers(meal.fibers || 0)
    setSodium(meal.sodium || 0)
  }

  const handleSubmit = async () => {
    if (!file || !user || isSubmitting) return

    clearError()

    if (pb.authStore.isValid) {
      try {
        await pb.collection('users').authRefresh()
      } catch {
        // Token refresh failed — attempt upload anyway; backend will reject if truly invalid
      }
    } else {
      setErrorMessage({ title: 'Sessão expirada. Faça login novamente.', icon: 'auth' })
      toast({ title: 'Sessão expirada. Redirecionando para login...', variant: 'destructive' })
      setTimeout(() => navigate('/'), 2000)
      return
    }

    let patientId = ''
    try {
      const patient = await pb.collection('patients').getFirstListItem(`user_id="${user.id}"`)
      patientId = patient.id
    } catch {
      setErrorMessage({ title: 'Perfil de paciente não encontrado.', icon: 'auth' })
      return
    }

    const crid = clientRequestId || crypto.randomUUID()
    if (!clientRequestId) setClientRequestId(crid)
    setIsSubmitting(true)
    try {
      const result = await submitMealAnalysis(file, description || 'Refeição', crid, patientId)
      if (result.meal_id) {
        setMealId(result.meal_id)
        toast({ title: 'Refeição enviada com sucesso!' })
        if (result.status === 'awaiting_confirmation') {
          try {
            const meal = await getMeal(result.meal_id)
            applyMealResult(meal)
            setStep(3)
          } catch {
            setStep(2)
          }
        } else if (result.status === 'failed') {
          setStep(5)
        } else {
          setStep(2)
        }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err: any) {
      console.error('[NutriCare Meal Submit Error]', {
        status: err?.status ?? 'N/A',
        message: err?.message ?? 'N/A',
        response: err?.response ?? 'N/A',
        data: err?.response?.data ?? 'N/A',
      })
      const categorized = categorizeMealError(err)
      const icon: 'network' | 'auth' | 'file' | 'server' = categorized.title.includes('Conexão')
        ? 'network'
        : categorized.title.includes('Sessão')
          ? 'auth'
          : categorized.title.includes('Imagem') || categorized.title.includes('arquivo')
            ? 'file'
            : 'server'
      setErrorMessage({ title: categorized.title, description: categorized.description, icon })
      toast({
        title: categorized.title,
        variant: 'destructive',
        description: categorized.description,
      })
      // Preserve file, photoPreview, and description so the user can retry without re-selecting
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = async () => {
    if (!mealId) return
    setIsRetrying(true)
    try {
      await retryMealAnalysis(mealId)
      setStep(2)
    } catch (err: any) {
      console.error('[NutriCare Meal Retry Error]', {
        status: err?.status ?? 'N/A',
        message: err?.message ?? 'N/A',
        response: err?.response ?? 'N/A',
        data: err?.response?.data ?? 'N/A',
        mealId,
      })
      const categorized = categorizeMealError(err)
      toast({
        title: categorized.title,
        variant: 'destructive',
        description: categorized.description,
      })
    } finally {
      setIsRetrying(false)
    }
  }

  const handleConfirm = async () => {
    if (!mealId || isConfirming) return
    setIsConfirming(true)
    try {
      await confirmMeal(mealId, { calories, proteins: protein, carbs, fats: fat, fibers, sodium })
      setStep(4)
      setTimeout(() => {
        toast({ title: 'Refeição registrada com sucesso!' })
        navigate('/patient')
      }, 1500)
    } catch (err) {
      const categorized = categorizeMealError(err)
      toast({
        title: categorized.title,
        variant: 'destructive',
        description: categorized.description,
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const confidence = analysisResult?.ai_confidence ?? 0
  const confidenceColor = confidence >= 0.7 ? 'text-green-600' : 'text-amber-600'

  const ErrorIcon = ({ type }: { type: 'network' | 'auth' | 'file' | 'server' }) => {
    if (type === 'network') return <WifiOff className="w-5 h-5 text-red-500" />
    if (type === 'auth') return <ShieldAlert className="w-5 h-5 text-amber-500" />
    if (type === 'file') return <ImageOff className="w-5 h-5 text-red-500" />
    return <AlertCircle className="w-5 h-5 text-red-500" />
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Registrar Refeição</h1>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
      />
      {step === 1 && (
        <div className="animate-fade-in space-y-4">
          <p className="text-muted-foreground text-sm">
            Tire uma foto do seu prato para a IA analisar.
          </p>
          {errorMessage && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <ErrorIcon type={errorMessage.icon} />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {errorMessage.title}
                </p>
                {errorMessage.description && (
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                    {errorMessage.description}
                  </p>
                )}
              </div>
            </div>
          )}
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
              onChange={(e) => {
                setDescription(e.target.value)
                clearError()
              }}
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
            <Button
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting || isCompressing}
            >
              {isSubmitting || isCompressing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />{' '}
                  {isCompressing ? 'Processando...' : 'Enviando...'}
                </>
              ) : (
                <>
                  {errorMessage ? 'Tentar Novamente' : 'Enviar para Análise'}{' '}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
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
            <h3 className="font-bold text-lg">Processando análise...</h3>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Sua refeição foi enviada com sucesso. A IA está analisando a imagem. Você pode
              aguardar ou acessar o histórico depois.
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
          <div className="pt-4 flex w-full">
            <Button
              variant="ghost"
              onClick={() => navigate('/patient/history')}
              className="text-muted-foreground w-full rounded-full"
            >
              Ver no Histórico
            </Button>
          </div>
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
          <Button size="lg" className="w-full" onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                Confirmar Registro <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
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
            className="text-muted-foreground w-full rounded-full"
          >
            Voltar ao início
          </Button>
        </div>
      )}
      {step === 6 && (
        <div className="animate-fade-in flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-20 h-20 rounded-full border-4 border-amber-400 flex items-center justify-center mb-2">
            <span className="text-amber-500 text-4xl font-bold">!</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Tempo esgotado</h2>
          <p className="text-muted-foreground text-[15px] max-w-[280px] leading-snug">
            A análise demorou mais que o esperado.
            <br />
            Tente novamente.
          </p>
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="mt-4 rounded-full bg-primary hover:bg-primary/90 text-white px-8 h-12 text-base font-medium w-full"
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
            className="text-muted-foreground w-full rounded-full"
          >
            Voltar ao início
          </Button>
        </div>
      )}
    </div>
  )
}
