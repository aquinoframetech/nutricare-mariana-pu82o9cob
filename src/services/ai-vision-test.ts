import pb from '@/lib/pocketbase/client'

export interface VisionTestImageResult {
  photo_id: string
  meal_id: string
  file_name: string
  mime_type: string
  size_bytes: number
  size_kb: number
  read_success: boolean
  read_error: string
  ai_status: number
  ai_response_time_ms: number
  ai_raw_response: string
  ai_error: string
}

export interface VisionTestReport {
  test_id: string
  timestamp: string
  model_alias: string
  prompt_used: string
  images_tested: VisionTestImageResult[]
  comparison: {
    responses_identical: boolean
    both_have_content: boolean
    both_descriptive: boolean
  }
  capability_status: string
  summary: string
  error?: string
}

export const runVisionTest = (): Promise<VisionTestReport> =>
  pb.send('/backend/v1/ai-vision-test', { method: 'POST' })
