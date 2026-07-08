routerAdd(
  'POST',
  '/backend/v1/agent-chat',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('auth required')
      if (!body.message || !body.message.trim()) return e.badRequestError('message is required')

      var startTime = new Date().getTime()

      const result = $ai.agent('nutri-assistant').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: body.message,
      })

      var elapsed = new Date().getTime() - startTime
      var estimatedCost = 0
      if (result.iterations) {
        estimatedCost = result.iterations * 0.001
      }

      try {
        const logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
        const log = new Record(logCol)
        log.set('prompt', body.message)
        log.set('response', result.content || '')
        log.set('user_id', userId)
        log.set('type', 'agent_chat')
        log.set('model_used', 'fast')
        log.set('response_time_ms', elapsed)
        log.set('estimated_cost', estimatedCost)
        $app.saveNoValidate(log)
      } catch (_) {}

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'AI temporariamente indisponível' })
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na requisição do agente' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'AI temporariamente indisponível' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
