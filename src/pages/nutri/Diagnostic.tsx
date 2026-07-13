import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Stethoscope, Wifi, Eye } from 'lucide-react'
import { runAiDiagnostic, type DiagnosticReport } from '@/services/ai-diagnostic'
import { testOpenAiConnection, type OpenAiTestResult } from '@/services/openai-test'
import { runVisionTest, type VisionTestReport } from '@/services/ai-vision-test'
import { VisionTestReportView } from '@/components/nutri/vision-test-report'

export default function Diagnostic() {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReport, setAiReport] = useState<DiagnosticReport | null>(null)
  const [aiError, setAiError] = useState('')
  const [connLoading, setConnLoading] = useState(false)
  const [connResult, setConnResult] = useState<OpenAiTestResult | null>(null)
  const [connError, setConnError] = useState('')
  const [visionLoading, setVisionLoading] = useState(false)
  const [visionReport, setVisionReport] = useState<VisionTestReport | null>(null)
  const [visionError, setVisionError] = useState('')

  const handleAiDiagnostic = async () => {
    setAiLoading(true)
    setAiError('')
    setAiReport(null)
    try {
      setAiReport(await runAiDiagnostic())
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro ao executar diagnóstico')
    } finally {
      setAiLoading(false)
    }
  }

  const handleConnTest = async () => {
    setConnLoading(true)
    setConnError('')
    setConnResult(null)
    try {
      setConnResult(await testOpenAiConnection())
    } catch (err) {
      setConnError(err instanceof Error ? err.message : 'Erro ao testar conexão')
    } finally {
      setConnLoading(false)
    }
  }

  const handleVisionTest = async () => {
    setVisionLoading(true)
    setVisionError('')
    setVisionReport(null)
    try {
      setVisionReport(await runVisionTest())
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : 'Erro ao executar teste de visão')
    } finally {
      setVisionLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Diagnóstico do Sistema</h1>
        <p className="text-muted-foreground">
          Ferramentas técnicas para verificar a infraestrutura de IA.
        </p>
      </div>

      <Tabs defaultValue="vision">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vision" className="gap-1">
            <Eye className="h-4 w-4" /> Visão
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1">
            <Stethoscope className="h-4 w-4" /> IA
          </TabsTrigger>
          <TabsTrigger value="conn" className="gap-1">
            <Wifi className="h-4 w-4" /> Conexão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vision" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" /> Teste de Visão IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Teste isolado que localiza imagens reais no armazenamento, envia para o modelo de IA
                com visão e compara as descrições retornadas.
              </p>
              <Button onClick={handleVisionTest} disabled={visionLoading}>
                {visionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executando...
                  </>
                ) : (
                  'Executar Teste de Visão'
                )}
              </Button>
              {visionError && <p className="text-sm text-red-500">{visionError}</p>}
              {visionReport && <VisionTestReportView report={visionReport} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" /> Diagnóstico IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Verifica texto e visão do AI Gateway.</p>
              <Button onClick={handleAiDiagnostic} disabled={aiLoading}>
                {aiLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executando...
                  </>
                ) : (
                  'Executar Diagnóstico'
                )}
              </Button>
              {aiError && <p className="text-sm text-red-500">{aiError}</p>}
              {aiReport && (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Provider:</span>{' '}
                      {aiReport.provider_used}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Alias:</span> {aiReport.alias_used}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Créditos:</span>{' '}
                      {aiReport.platform_credits_active ? '✅' : '❌'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Visão:</span>{' '}
                      {aiReport.vision_capability_verified ? '✅' : '❌'}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Causa raiz:</p>
                    <p className="text-muted-foreground">{aiReport.root_cause}</p>
                  </div>
                  {aiReport.recommendations.length > 0 && (
                    <div>
                      <p className="font-semibold">Recomendações:</p>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {aiReport.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" /> Teste de Conexão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Testa conectividade básica com o AI Gateway.
              </p>
              <Button onClick={handleConnTest} disabled={connLoading}>
                {connLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testando...
                  </>
                ) : (
                  'Testar Conexão'
                )}
              </Button>
              {connError && <p className="text-sm text-red-500">{connError}</p>}
              {connResult && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        connResult.success ? 'font-bold text-green-600' : 'font-bold text-red-600'
                      }
                    >
                      {connResult.success ? '✅ Sucesso' : '❌ Falha'}
                    </span>
                  </div>
                  <p>{connResult.message}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Tempo:</span>{' '}
                      {connResult.response_time_ms}ms
                    </div>
                    <div>
                      <span className="text-muted-foreground">Modelo:</span>{' '}
                      {connResult.model_used || '—'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
