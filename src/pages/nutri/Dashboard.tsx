import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getAllPatients } from '@/services/patients'
import { getAllAlerts, markAlertRead } from '@/services/alerts'
import { testOpenAiConnection, type OpenAiTestResult } from '@/services/openai-test'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, AlertCircle, TrendingUp, CheckCircle, Zap, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Patient, Alert } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

export default function NutriDashboard() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [testingAi, setTestingAi] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<OpenAiTestResult | null>(null)

  const loadData = async () => {
    try {
      const [p, a] = await Promise.all([getAllPatients(), getAllAlerts()])
      setPatients(p)
      setAlerts(a)
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('alerts', () => loadData())
  useRealtime('patients', () => loadData())

  const criticalAlerts = alerts.filter((a) => a.type === 'critical' && !a.is_read).length
  const onTrack = patients.length - alerts.filter((a) => a.type === 'critical' && !a.is_read).length

  const handleTestConnection = async () => {
    setTestingAi(true)
    setAiTestResult(null)
    try {
      const result = await testOpenAiConnection()
      setAiTestResult(result)
      if (result.success) {
        toast.success('Conexão com OpenAI estabelecida com sucesso!', {
          description: `Tempo de resposta: ${result.response_time_ms}ms`,
        })
      } else {
        toast.error('Falha na conexão com OpenAI', {
          description: result.message,
        })
      }
    } catch (err: any) {
      const msg = err?.response?.message || err?.message || 'Erro ao testar conexão'
      setAiTestResult({ success: false, message: msg, response_time_ms: 0 })
      toast.error('Falha na conexão com OpenAI', { description: msg })
    } finally {
      setTestingAi(false)
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">Olá, {user?.name?.split(' ')[0]}</p>
      </div>
      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Diagnóstico de Conexão OpenAI</CardTitle>
          <Zap className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Verifique a conectividade do backend com o serviço OpenAI.
          </p>
          <Button
            onClick={handleTestConnection}
            disabled={testingAi}
            variant="outline"
            className="w-full"
          >
            {testingAi ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Testar Conexão com OpenAI
              </>
            )}
          </Button>
          {aiTestResult && (
            <div
              className={`rounded-md p-2 text-xs ${
                aiTestResult.success
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              <p className="font-medium">{aiTestResult.success ? '✓ Conectado' : '✗ Falha'}</p>
              <p>{aiTestResult.message}</p>
              {aiTestResult.response_time_ms > 0 && (
                <p className="mt-1 opacity-80">Resposta: {aiTestResult.response_time_ms}ms</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Alertas Críticos</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na Meta</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients.length > 0 ? Math.round((onTrack / patients.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{onTrack} pacientes</p>
          </CardContent>
        </Card>
      </div>
      <h2 className="text-xl font-bold mt-8 mb-4">Atenção Recente</h2>
      <div className="space-y-3">
        {alerts.slice(0, 5).map((alert) => {
          const patient = patients.find((p) => p.id === alert.patient_id)
          return (
            <Card
              key={alert.id}
              className={`border-l-4 ${alert.type === 'critical' ? 'border-l-rose-500' : alert.type === 'warning' ? 'border-l-amber-500' : 'border-l-emerald-500'} ${alert.is_read ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {patient?.expand?.user_id?.name || 'Paciente'}
                    </span>
                    {patient && (
                      <Badge variant="outline" className="text-xs">
                        {patient.condition || 'Sem condição'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.created), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                {!alert.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await markAlertRead(alert.id)
                      loadData()
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
        {alerts.length === 0 && <p className="text-muted-foreground text-sm">Nenhum alerta.</p>}
      </div>
    </div>
  )
}
