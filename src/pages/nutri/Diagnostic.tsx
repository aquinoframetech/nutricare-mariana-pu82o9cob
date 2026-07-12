import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Stethoscope } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { runAiDiagnostic, type DiagnosticReport } from '@/services/ai-diagnostic'
import { toast } from 'sonner'

export default function Diagnostic() {
  const [report, setReport] = useState<DiagnosticReport | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    try {
      const result = await runAiDiagnostic()
      setReport(result)
      toast.success('Diagnóstico concluído')
    } catch (err) {
      toast.error('Falha ao executar diagnóstico: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Diagnóstico de IA</h1>
            <p className="text-sm text-muted-foreground">
              Auditoria da integração de análise de imagens
            </p>
          </div>
        </div>
        <Button onClick={handleRun} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? 'Executando...' : 'Executar Diagnóstico'}
        </Button>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col items-center p-4">
                <StatusIcon ok={report.platform_credits_active} />
                <p className="mt-2 text-xs text-muted-foreground">Créditos Ativos</p>
                <Badge variant={report.platform_credits_active ? 'default' : 'destructive'}>
                  {report.platform_credits_active ? 'Sim' : 'Não'}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4">
                <StatusIcon ok={report.vision_capability_verified} />
                <p className="mt-2 text-xs text-muted-foreground">Visão Verificada</p>
                <Badge variant={report.vision_capability_verified ? 'default' : 'destructive'}>
                  {report.vision_capability_verified ? 'Sim' : 'Não'}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4">
                <p className="text-xs text-muted-foreground">Provider</p>
                <p className="text-sm font-semibold text-center">{report.provider_used}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4">
                <p className="text-xs text-muted-foreground">Alias</p>
                <Badge variant="secondary">{report.alias_used}</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StatusIcon ok={report.text_test.success} />
                  Teste de Texto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HTTP Status:</span>
                  <Badge variant={report.text_test.http_status === 200 ? 'default' : 'destructive'}>
                    {report.text_test.http_status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tempo:</span>
                  <span>{report.text_test.response_time_ms}ms</span>
                </div>
                {report.text_test.content_preview && (
                  <div>
                    <span className="text-muted-foreground">Resposta:</span>
                    <p className="mt-1 rounded bg-muted p-2 text-xs">
                      {report.text_test.content_preview}
                    </p>
                  </div>
                )}
                {report.text_test.original_error && (
                  <div>
                    <span className="text-muted-foreground">Erro:</span>
                    <p className="mt-1 rounded bg-destructive/10 p-2 text-xs text-destructive">
                      {report.text_test.original_error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StatusIcon ok={report.vision_test.success} />
                  Teste de Visão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HTTP Status:</span>
                  <Badge
                    variant={report.vision_test.http_status === 200 ? 'default' : 'destructive'}
                  >
                    {report.vision_test.http_status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tempo:</span>
                  <span>{report.vision_test.response_time_ms}ms</span>
                </div>
                {report.vision_test.content_preview && (
                  <div>
                    <span className="text-muted-foreground">Resposta:</span>
                    <p className="mt-1 rounded bg-muted p-2 text-xs">
                      {report.vision_test.content_preview}
                    </p>
                  </div>
                )}
                {report.vision_test.original_error && (
                  <div>
                    <span className="text-muted-foreground">Erro:</span>
                    <p className="mt-1 rounded bg-destructive/10 p-2 text-xs text-destructive">
                      {report.vision_test.original_error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Análise de Causa Raiz
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{report.root_cause}</p>
              {report.recommendations.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Recomendações:</p>
                  <ul className="space-y-1">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!report && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Stethoscope className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Clique em "Executar Diagnóstico" para verificar a integração de IA, incluindo testes
              de texto e visão.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
