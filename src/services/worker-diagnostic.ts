import pb from '@/lib/pocketbase/client'

export interface QueueDiagnosticItem {
  id: string
  request_id: string
  meal_id: string
  status: string
  attempts: number
  error_sanitized: string
  started_at: string
  finished_at: string
  created: string
}

export interface MealDiagnosticState {
  id: string
  name: string
  analysis_status: string
  ai_notes: string
  ai_food_identified: string
  ai_confidence: number
  calories: number
  analyzed_at: string
  client_request_id: string
  error?: string
}

export interface AnalysisLogDiagnostic {
  id: string
  type: string
  response: string
  original_error: string
  provider_status_code: number
  model_used: string
  request_id: string
  response_time_ms: number
  created: string
  error?: string
}

export interface ProfilingLogDiagnostic {
  id: string
  request_id: string
  meal_id: string
  total_time_ms: number
  model_used: string
  openai_status: number
  timeout_source: string
  image_size_kb: number
  dur_image_validation_ms: number
  dur_openai_request_ms: number
  dur_response_parsing_ms: number
  dur_database_save_ms: number
  created: string
  error?: string
}

export interface WorkerDiagnosticReport {
  worker_version_expected: string
  worker_version_found: string
  queue_items: QueueDiagnosticItem[]
  meal_states: MealDiagnosticState[]
  analysis_logs: AnalysisLogDiagnostic[]
  profiling_logs: ProfilingLogDiagnostic[]
  summary: string
}

export async function getWorkerDiagnostic(): Promise<WorkerDiagnosticReport> {
  return pb.send('/backend/v1/worker/diagnostic', { method: 'GET' })
}
