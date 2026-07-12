import pb from '@/lib/pocketbase/client'

export interface AiLog {
  id: string
  prompt: string
  response: string
  user_id: string
  type: string
  model_used: string
  response_time_ms: number
  estimated_cost: number
  created: string
  updated: string
  provider_status_code?: number
  original_error?: string
  request_id?: string
  expand?: { user_id?: { id: string; name: string; email: string } }
}

export const getAiLogs = async (): Promise<AiLog[]> =>
  (await pb.collection('chatgpt_analysis_logs').getFullList({
    expand: 'user_id',
    sort: '-created',
  })) as unknown as AiLog[]
