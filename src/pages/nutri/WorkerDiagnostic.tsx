import { WorkerDiagnosticReport } from '@/components/nutri/worker-diagnostic-report'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function WorkerDiagnosticPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Worker Diagnostic</h1>
        <p className="text-muted-foreground">
          Verify worker versioning and inspect meal processing pipeline failures.
        </p>
      </div>
      <WorkerDiagnosticReport />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Expected Worker Version</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-muted px-2 py-1 text-sm">vision-fix-2026-07-13-v2</code>
          <p className="mt-2 text-xs text-muted-foreground">
            If the MEAL_WORKER_VERSION log appears with this version, the deployment is active. If
            it does not appear, the hook may not have reloaded properly.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
