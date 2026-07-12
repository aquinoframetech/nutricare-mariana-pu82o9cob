import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getMealsWithPhotos, MealWithPhoto } from '@/services/meals'
import { useRealtime } from '@/hooks/use-realtime'
import { Loader2, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

export default function History() {
  const { user } = useAuth()
  const [meals, setMeals] = useState<MealWithPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const patient = await pb.collection('patients').getFirstListItem(`user_id="${user.id}"`)
      const fetchedMeals = await getMealsWithPhotos(patient.id)
      setMeals(fetchedMeals)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('meals', () => {
    loadData()
  })

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return (
          <div className="flex items-center text-amber-300 text-xs font-medium">
            <Clock className="w-3 h-3 mr-1" /> Em processamento
          </div>
        )
      case 'awaiting_confirmation':
        return (
          <div className="flex items-center text-blue-300 text-xs font-medium animate-pulse">
            <AlertCircle className="w-3 h-3 mr-1" /> Confirmar
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center text-red-300 text-xs font-medium">
            <AlertCircle className="w-3 h-3 mr-1" /> Falhou
          </div>
        )
      case 'confirmed':
      case 'professionally_corrected':
        return (
          <div className="flex items-center text-green-300 text-xs font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Registrada
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold">Histórico</h1>

      <div className="space-y-4">
        {meals.map((meal) => (
          <Card
            key={meal.id}
            className={`border-none shadow-subtle overflow-hidden cursor-pointer transition-transform active:scale-[0.98] ${meal.analysis_status === 'awaiting_confirmation' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            onClick={() => {
              if (
                meal.analysis_status === 'awaiting_confirmation' ||
                meal.analysis_status === 'pending' ||
                meal.analysis_status === 'processing' ||
                meal.analysis_status === 'failed'
              ) {
                navigate('/patient/register', { state: { mealId: meal.id } })
              }
            }}
          >
            <div className="h-36 w-full relative bg-muted">
              {meal.photoUrl ? (
                <img
                  src={meal.photoUrl}
                  alt={meal.name || 'Refeição'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sem foto
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end text-white">
                <div>
                  <span className="font-semibold text-xl">{meal.calories || 0} kcal</span>
                  <p className="text-xs text-white/90">
                    {format(new Date(meal.timestamp || meal.created), "d 'de' MMMM, HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10">
                  {getStatusDisplay(meal.analysis_status)}
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-muted-foreground font-medium">Macros</span>
                <div className="flex gap-3 text-sm font-semibold">
                  <span className="text-rose-500">{meal.proteins || 0}g P</span>
                  <span className="text-amber-500">{meal.carbs || 0}g C</span>
                  <span className="text-blue-500">{meal.fats || 0}g G</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg">
                <p className="text-sm font-medium line-clamp-1 flex-1 pr-4">
                  {meal.ai_food_identified || meal.name || 'Refeição'}
                </p>
                {(meal.analysis_status === 'awaiting_confirmation' ||
                  meal.analysis_status === 'failed' ||
                  meal.analysis_status === 'pending' ||
                  meal.analysis_status === 'processing') && (
                  <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {meals.length === 0 && (
          <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
            <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma refeição registrada</p>
            <p className="text-xs text-muted-foreground mt-1">Suas refeições aparecerão aqui.</p>
          </div>
        )}
      </div>
    </div>
  )
}
