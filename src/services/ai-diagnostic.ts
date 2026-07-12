import pb from '@/lib/pocketbase/client'

export interface DiagnosticTestResult {
  success: boolean
  http_status: number
  response_time_ms: number
  content_preview: string
  original_error: string
}

export interface DiagnosticReport {
  provider_used: string
  alias_used: string
  platform_credits_active: boolean
  vision_capability_verified: boolean
  test_request_sent: boolean
  text_test: DiagnosticTestResult
  vision_test: DiagnosticTestResult
  root_cause: string
  recommendations: string[]
}

export const runAiDiagnostic = (): Promise<DiagnosticReport> =>
  pb.send('/backend/v1/ai/diagnostic', { method: 'POST' })
