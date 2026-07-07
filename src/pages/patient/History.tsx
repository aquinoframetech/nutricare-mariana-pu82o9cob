import { useAuth } from '@/contexts/auth-context'
import { useData } from '@/contexts/data-context'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function History() {
  const { user } = useAuth()
  const { meals } = useData()

  const myMeals = meals
    .filter((m) => m.patientId === user?.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Histórico</h1>

      <div className="space-y-4">
        {myMeals.map((meal) => (
          <Card key={meal.id} className="border-none shadow-subtle overflow-hidden">
            <div className="h-32 w-full relative">
              <img src={meal.imageUrl} alt="Refeição" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <span className="font-semibold text-lg">{meal.calories} kcal</span>
                <p className="text-xs opacity-90">
                  {format(new Date(meal.timestamp), "d 'de' MMMM, HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-muted-foreground">Macros</span>
                <div className="flex gap-3 font-medium">
                  <span className="text-rose-500">{meal.macros.protein}g P</span>
                  <span className="text-amber-500">{meal.macros.carbs}g C</span>
                  <span className="text-blue-500">{meal.macros.fat}g G</span>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                {meal.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
        {myMeals.length === 0 && (
          <p className="text-center text-muted-foreground py-10">
            Nenhuma refeição registrada ainda.
          </p>
        )}
      </div>
    </div>
  )
}
