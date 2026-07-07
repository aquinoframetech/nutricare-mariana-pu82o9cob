import { useData } from '@/contexts/data-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function NutriDashboard() {
  const { patients, alerts } = useData()

  const criticalAlerts = alerts.filter((a) => a.type === 'critical' && !a.read).length
  const onTrack = patients.filter((p) => p.status === 'green').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">Acompanhamento da base de pacientes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">+2 neste mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Alertas Críticos</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção imediata</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na Meta (Adesão)</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((onTrack / patients.length) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">{onTrack} pacientes em verde</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Atenção Recente</h2>
      <div className="space-y-4">
        {alerts.slice(0, 3).map((alert) => {
          const patient = patients.find((p) => p.id === alert.patientId)
          return (
            <Card key={alert.id} className="border-l-4 border-l-amber-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{patient?.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {patient?.clinicalCondition}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-muted hover:text-primary cursor-pointer" />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
