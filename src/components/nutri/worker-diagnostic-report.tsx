import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Activity, Bug, Database, Server, Zap } from 'lucide-react'
import { getWorkerDiagnostic, type WorkerDiagnosticReport } from '@/services/worker-diagnostic'

export function WorkerDiagnosticReport() {
  const [report, setReport] = useState<WorkerDiagnosticReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostic = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getWorkerDiagnostic()
      setReport(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch diagnostic report')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bug className="h-5 w-5" />
              Worker Diagnostic Report
            </CardTitle>
            <CardDescription>
              Verify worker versioning and inspect meal processing failures
            </CardDescription>
          </div>
          <Button onClick={runDiagnostic} disabled={loading} size="sm">
            {loading ? 'Running...' : 'Run Diagnostic'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {!loading && report && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="gap-1">
                <Server className="h-3 w-3" />
                Expected: {report.worker_version_expected}
              </Badge>
              <Badge
                variant={report.worker_version_found === 'present' ? 'default' : 'secondary'}
                className="gap-1"
              >
                <Activity className="h-3 w-3" />
                Found: {report.worker_version_found || 'unknown'}
              </Badge>
            </div>

            {report.queue_items.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Database className="h-4 w-4" />
                  Queue Items ({report.queue_items.length})
                </h4>
                <div className="space-y-2">
                  {report.queue_items.map((item) => (
                    <div key={item.id} className="rounded-md border p-3 text-xs">
                      <div className="mb-1 flex items-center justify-between">
                        <Badge variant="secondary">{item.status}</Badge>
                        <span className="text-muted-foreground">attempts: {item.attempts}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <span>
                          <strong>meal_id:</strong> {item.meal_id}
                        </span>
                        <span>
                          <strong>request_id:</strong> {item.request_id}
                        </span>
                      </div>
                      {item.error_sanitized && (
                        <p className="mt-1 text-red-500">
                          <strong>error_sanitized:</strong> {item.error_sanitized}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.meal_states.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4" />
                  Meal States
                </h4>
                <div className="space-y-2">
                  {report.meal_states.map((meal, idx) => (
                    <div key={idx} className="rounded-md border p-3 text-xs">
                      {meal.error ? (
                        <p className="text-red-500">{meal.error}</p>
                      ) : (
                        <>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium">{meal.name}</span>
                            <Badge variant="outline">{meal.analysis_status}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <span>
                              <strong>id:</strong> {meal.id}
                            </span>
                            <span>
                              <strong>calories:</strong> {meal.calories}
                            </span>
                            <span>
                              <strong>ai_confidence:</strong> {meal.ai_confidence}
                            </span>
                            <span>
                              <strong>analyzed_at:</strong> {meal.analyzed_at || 'N/A'}
                            </span>
                          </div>
                          {meal.ai_notes && (
                            <p className="mt-1 text-orange-500">
                              <strong>ai_notes:</strong> {meal.ai_notes}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.analysis_logs.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Bug className="h-4 w-4" />
                  Analysis Logs ({report.analysis_logs.length})
                </h4>
                <div className="space-y-2">
                  {report.analysis_logs.map((log) => (
                    <div key={log.id || log.error} className="rounded-md border p-3 text-xs">
                      {log.error ? (
                        <p className="text-red-500">{log.error}</p>
                      ) : (
                        <>
                          <div className="mb-1 flex items-center justify-between">
                            <Badge variant="secondary">{log.type}</Badge>
                            <span className="text-muted-foreground">
                              status: {log.provider_status_code}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <span>
                              <strong>request_id:</strong> {log.request_id}
                            </span>
                            <span>
                              <strong>model:</strong> {log.model_used}
                            </span>
                            <span>
                              <strong>response_time_ms:</strong> {log.response_time_ms}
                            </span>
                            <span>
                              <strong>created:</strong> {log.created}
                            </span>
                          </div>
                          {log.original_error && (
                            <p className="mt-1 text-red-500">
                              <strong>original_error:</strong> {log.original_error}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.profiling_logs.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4" />
                  Profiling Logs ({report.profiling_logs.length})
                </h4>
                <div className="space-y-2">
                  {report.profiling_logs.map((log) => (
                    <div key={log.id || log.error} className="rounded-md border p-3 text-xs">
                      {log.error ? (
                        <p className="text-red-500">{log.error}</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-1">
                          <span>
                            <strong>request_id:</strong> {log.request_id}
                          </span>
                          <span>
                            <strong>openai_status:</strong> {log.openai_status}
                          </span>
                          <span>
                            <strong>total_time_ms:</strong> {log.total_time_ms}
                          </span>
                          <span>
                            <strong>timeout_source:</strong> {log.timeout_source || 'N/A'}
                          </span>
                          <span>
                            <strong>img_validation_ms:</strong> {log.dur_image_validation_ms}
                          </span>
                          <span>
                            <strong>ai_request_ms:</strong> {log.dur_openai_request_ms}
                          </span>
                          <span>
                            <strong>parsing_ms:</strong> {log.dur_response_parsing_ms}
                          </span>
                          <span>
                            <strong>db_save_ms:</strong> {log.dur_database_save_ms}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">{report.summary}</p>
          </div>
        )}

        {!loading && !report && !error && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Click "Run Diagnostic" to fetch the worker diagnostic report.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
