import { useAuth } from '@/contexts/auth-context'
import { useData } from '@/contexts/data-context'
import { CircularProgress } from '@/components/ui/circular-progress'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { PatientProfile } from '@/lib/types'
import { Clock, Info } from 'lucide-react'

export default function PatientDashboard() {
  const { user } = useAuth()
  const { patients, alerts } = useData()
  const profile = patients.find((p) => p.id === user?.id) as PatientProfile
  const recentAlerts = alerts.filter((a) => a.patientId === user?.id).slice(0, 2)

  if (!profile) return null

  const pPercent = (profile.consumedMacros.protein / profile.macros.protein) * 100
  const cPercent = (profile.consumedMacros.carbs / profile.macros.carbs) * 100
  const fPercent = (profile.consumedMacros.fat / profile.macros.fat) * 100

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <header className="py-2">
        <h1 className="text-2xl font-bold">Olá, {profile.name.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground text-sm">{profile.clinicalCondition}</p>
      </header>

      {recentAlerts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x -mx-4 px-4 scrollbar-hide">
          {recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className="min-w-[280px] bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex gap-3 items-start snap-center shrink-0"
            >
              <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <p className="text-sm font-medium leading-tight">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      <Card className="border-none shadow-subtle bg-white">
        <CardContent className="p-6 flex flex-col items-center">
          <CircularProgress
            value={profile.consumedToday}
            max={profile.dailyTarget}
            label="Kcal Consumidas"
          />
          <div className="grid grid-cols-3 gap-6 w-full mt-8">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-rose-500">Prot</span>
                <span>{profile.consumedMacros.protein}g</span>
              </div>
              <Progress value={pPercent} className="h-2 bg-rose-100 [&>div]:bg-rose-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-amber-500">Carb</span>
                <span>{profile.consumedMacros.carbs}g</span>
              </div>
              <Progress value={cPercent} className="h-2 bg-amber-100 [&>div]:bg-amber-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-blue-500">Gord</span>
                <span>{profile.consumedMacros.fat}g</span>
              </div>
              <Progress value={fPercent} className="h-2 bg-blue-100 [&>div]:bg-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-subtle bg-primary/5">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Próxima Refeição</h3>
            <p className="text-sm text-muted-foreground">Lanche da Tarde às 15:30</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
