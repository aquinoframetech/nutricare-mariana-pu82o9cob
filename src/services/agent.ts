import pb from '@/lib/pocketbase/client'

export const chatWithAgent = (message: string, conversationId: string | null) =>
  pb.send('/backend/v1/agent-chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId }),
    headers: { 'Content-Type': 'application/json' },
  })

export const getAgentConversations = () => pb.send('/backend/v1/agent-chats', { method: 'GET' })

export const getAgentMessages = (conversationId: string) =>
  pb.send(`/backend/v1/agent-chats/${conversationId}/messages`, { method: 'GET' })
