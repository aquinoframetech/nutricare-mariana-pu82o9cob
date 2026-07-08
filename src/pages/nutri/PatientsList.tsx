import { useState, useEffect } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getAllPatients } from '@/services/patients'
import { getAllMeals } from '@/services/meals'
import { getAllAlerts } from '@/services/alerts'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ChevronRight, AlertCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Patient, Meal, Alert } from '@/lib/types'

export default function PatientsList() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [p, m, a] = await Promise.all([getAllPatients(search), getAllMeals(), getAllAlerts()])
      setPatients(p)
      setMeals(m)
      setAlerts(a)
    } catch (e) {
      console.error('Load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300)
    return () => clearTimeout(timer)
  }, [search])

  useRealtime('meals', () => loadData())
  useRealtime('alerts', () => loadData())

  const getDaysWithoutLogs = (patientId: string) => {
    const patientMeals = meals.filter((m) => m.patient_id === patientId)
    if (patientMeals.length === 0) return null
    const lastMeal = patientMeals.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0]
    return Math.floor((Date.now() - new Date(lastMeal.timestamp).getTime()) / 86400000)
  }

  const getActiveAlerts = (patientId: string) =>
    alerts.filter((a) => a.patient_id === patientId && !a.is_read).length

  const getStatusColor = (patientId: string) => {
    const active = getActiveAlerts(patientId)
    const days = getDaysWithoutLogs(patientId)
    if (active > 0) return 'bg-rose-500'
    if (days === null || days > 3) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Pacientes</h1>
          <p className="text-muted-foreground">Gerencie seus pacientes</p>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente..."
          className="pl-9 bg-background"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => {
          const days = getDaysWithoutLogs(patient.id)
          const activeAlerts = getActiveAlerts(patient.id)
          return (
            <Card
              key={patient.id}
              className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              onClick={() => navigate(`/nutri/patients/${patient.id}`)}
            >
              <div className={`h-2 w-full ${getStatusColor(patient.id)}`} />
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border">
                    <AvatarFallback>
                      {patient.expand?.user_id?.name?.charAt(0) || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg leading-none mb-1">
                      {patient.expand?.user_id?.name || 'Paciente'}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {patient.condition && (
                        <Badge variant="secondary" className="font-normal text-xs">
                          {patient.condition}
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-normal text-xs">
                        {patient.calorie_goal || 0} kcal
                      </Badge>
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {days === null ? 'Sem registros' : `${days}d sem log`}
                      </span>
                      {activeAlerts > 0 && (
                        <span className="flex items-center gap-1 text-rose-500">
                          <AlertCircle className="w-3 h-3" />
                          {activeAlerts} alerta(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          )
        })}
        {patients.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-10">
            Nenhum paciente encontrado.
          </p>
        )}
      </div>
    </div>
  )
}
