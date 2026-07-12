import pb from '@/lib/pocketbase/client'

export interface AgentChatResponse {
  conversation_id: string
  content: string
  citations?: Array<{ n: number; excerpt: string; source_id: string; distance: number }>
  message_id: string
  mode?: 'general_nutrition_estimate' | 'clinical_record_analysis'
}

export const chatWithAgent = (
  message: string,
  conversationId: string | null,
): Promise<AgentChatResponse> =>
  pb.send('/backend/v1/agent-chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId }),
    headers: { 'Content-Type': 'application/json' },
  })

export const getAgentConversations = () => pb.send('/backend/v1/agent-chats', { method: 'GET' })

export const getAgentMessages = (conversationId: string) =>
  pb.send(`/backend/v1/agent-chats/${conversationId}/messages`, { method: 'GET' })
