import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, AlertTriangle, ImageIcon } from 'lucide-react'
import type {
  VisionTestReport as VisionTestReportData,
  VisionTestImageResult,
} from '@/services/ai-vision-test'
import { cn } from '@/lib/utils'

function ImageResultCard({ result, index }: { result: VisionTestImageResult; index: number }) {
  const aiOk = result.ai_status === 200 && result.ai_raw_response.length > 0
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ImageIcon className="h-4 w-4" />
          Imagem {index + 1}
          {aiOk ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-1">
          <span className="text-muted-foreground">Photo ID:</span>
          <span className="font-mono truncate">{result.photo_id}</span>
          <span className="text-muted-foreground">Meal ID:</span>
          <span className="font-mono truncate">{result.meal_id}</span>
          <span className="text-muted-foreground">Arquivo:</span>
          <span className="font-mono truncate">{result.file_name}</span>
          <span className="text-muted-foreground">MIME:</span>
          <span>{result.mime_type || '—'}</span>
          <span className="text-muted-foreground">Tamanho:</span>
          <span>
            {result.size_kb > 0 ? `${result.size_kb} KB (${result.size_bytes} bytes)` : '—'}
          </span>
          <span className="text-muted-foreground">HTTP Status:</span>
          <span className={cn('font-bold', aiOk ? 'text-green-600' : 'text-red-600')}>
            {result.ai_status || '—'}
          </span>
          <span className="text-muted-foreground">Tempo:</span>
          <span>{result.ai_response_time_ms > 0 ? `${result.ai_response_time_ms} ms` : '—'}</span>
        </div>
        {result.read_error && (
          <div className="rounded bg-red-50 p-2 text-red-700">{result.read_error}</div>
        )}
        {result.ai_error && (
          <div className="rounded bg-red-50 p-2 text-red-700">{result.ai_error}</div>
        )}
        {result.ai_raw_response && (
          <div>
            <span className="text-muted-foreground">Resposta bruta da IA:</span>
            <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap break-words">
              {result.ai_raw_response}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function VisionTestReportView({ report }: { report: VisionTestReportData }) {
  const isComprovada = report.capability_status === 'CAPACIDADE COMPROVADA'
  const isParcial = report.capability_status === 'CAPACIDADE PARCIALMENTE COMPROVADA'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {isComprovada ? (
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        ) : isParcial ? (
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
        ) : (
          <XCircle className="h-8 w-8 text-red-500" />
        )}
        <div>
          <p className="text-lg font-bold">{report.capability_status}</p>
          <p className="text-sm text-muted-foreground">{report.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <span className="text-muted-foreground">Test ID:</span>
          <p className="font-mono">{report.test_id}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Modelo:</span>
          <p className="font-mono">{report.model_alias}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Timestamp:</span>
          <p className="font-mono truncate">{report.timestamp}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Imagens:</span>
          <p>{report.images_tested.length}</p>
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <p className="mb-1 text-xs text-muted-foreground">Prompt utilizado:</p>
        <p className="text-sm italic">&ldquo;{report.prompt_used}&rdquo;</p>
      </div>

      {report.images_tested.map((img, i) => (
        <ImageResultCard key={img.photo_id || i} result={img} index={i} />
      ))}

      {report.images_tested.length >= 2 && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded border p-2">
            <span className="text-muted-foreground">Respostas idênticas:</span>
            <p className="font-bold">{report.comparison.responses_identical ? 'SIM' : 'NÃO'}</p>
          </div>
          <div className="rounded border p-2">
            <span className="text-muted-foreground">Ambas com conteúdo:</span>
            <p className="font-bold">{report.comparison.both_have_content ? 'SIM' : 'NÃO'}</p>
          </div>
          <div className="rounded border p-2">
            <span className="text-muted-foreground">Ambas descritivas:</span>
            <p className="font-bold">{report.comparison.both_descriptive ? 'SIM' : 'NÃO'}</p>
          </div>
        </div>
      )}

      {report.error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          <span className="font-bold">Erro: </span>
          {report.error}
        </div>
      )}
    </div>
  )
}
