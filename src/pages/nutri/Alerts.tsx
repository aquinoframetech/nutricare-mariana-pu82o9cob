import { useData } from '@/contexts/data-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Alerts() {
  const { alerts, patients, markAlertRead } = useData()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Central de Alertas</h1>
        <p className="text-muted-foreground">
          Monitoramento automático de desvios comportamentais.
        </p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const patient = patients.find((p) => p.id === alert.patientId)

          let Icon = Info
          let color = 'text-blue-500'
          let border = 'border-l-blue-500'

          if (alert.type === 'critical') {
            Icon = AlertTriangle
            color = 'text-rose-500'
            border = 'border-l-rose-500'
          } else if (alert.type === 'warning') {
            Icon = AlertTriangle
            color = 'text-amber-500'
            border = 'border-l-amber-500'
          } else if (alert.type === 'success') {
            Icon = CheckCircle2
            color = 'text-emerald-500'
            border = 'border-l-emerald-500'
          }

          return (
            <Card
              key={alert.id}
              className={`border-l-4 ${border} ${alert.read ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4 flex gap-4 items-start">
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{patient?.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {patient?.clinicalCondition}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.date), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{alert.message}</p>
                </div>
                {!alert.read && (
                  <Button variant="ghost" size="sm" onClick={() => markAlertRead(alert.id)}>
                    Resolver
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
