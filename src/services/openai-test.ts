import pb from '@/lib/pocketbase/client'

export interface OpenAiTestResult {
  success: boolean
  message: string
  response_time_ms: number
  model_used?: string
  tokens?: { prompt: number; completion: number } | null
}

export const testOpenAiConnection = (): Promise<OpenAiTestResult> =>
  pb.send('/backend/v1/openai/test', {
    method: 'POST',
  })
