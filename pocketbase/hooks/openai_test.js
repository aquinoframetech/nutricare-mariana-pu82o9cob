routerAdd(
  'POST',
  '/backend/v1/openai/test',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var role = ''
    try {
      role = e.auth.getString('role') || ''
    } catch (_) {}

    if (role !== 'nutritionist') return e.forbiddenError('only nutritionists can run this test')

    var startTime = new Date().getTime()

    try {
      var logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      var log = new Record(logCol)
      log.set('prompt', 'OpenAI connectivity test — ping message')
      log.set('user_id', userId)
      log.set('type', 'system_test')
      log.set('model_used', 'fast')
      $app.saveNoValidate(log)

      var reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content: 'You are a connectivity test endpoint. Reply with exactly: CONNECTION_OK',
          },
          { role: 'user', content: 'ping' },
        ],
      })

      var content = reply.choices[0].message.content
      var elapsed = new Date().getTime() - startTime

      var estimatedCost = 0
      if (reply.usage) {
        var promptTokens = reply.usage.prompt_tokens || 0
        var completionTokens = reply.usage.completion_tokens || 0
        estimatedCost = (promptTokens * 0.15 + completionTokens * 0.6) / 1000000
      }

      log.set('response', content)
      log.set('response_time_ms', elapsed)
      log.set('estimated_cost', estimatedCost)
      $app.saveNoValidate(log)

      var success = content.indexOf('CONNECTION_OK') !== -1

      return e.json(200, {
        success: success,
        message: success
          ? 'Conexão com IA estabelecida com sucesso.'
          : 'Conexão respondida, mas resposta inesperada.',
        response_time_ms: elapsed,
        model_used: 'fast',
        tokens: reply.usage
          ? {
              prompt: reply.usage.prompt_tokens || 0,
              completion: reply.usage.completion_tokens || 0,
            }
          : null,
      })
    } catch (err) {
      var elapsed2 = new Date().getTime() - startTime

      try {
        var logCol2 = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
        var log2 = new Record(logCol2)
        log2.set('prompt', 'OpenAI connectivity test — ping message')
        log2.set('response', 'ERROR: ' + (err.message || 'unknown'))
        log2.set('user_id', userId)
        log2.set('type', 'system_test')
        log2.set('model_used', 'fast')
        log2.set('response_time_ms', elapsed2)
        log2.set('estimated_cost', 0)
        $app.saveNoValidate(log2)
      } catch (_) {}

      if (err instanceof SkipAiConfigError) {
        return e.json(503, {
          success: false,
          message: 'IA não configurada no servidor. Contate o administrador.',
          response_time_ms: elapsed2,
        })
      }
      if (err instanceof SkipAiError) {
        var status = err.status || 502
        return e.json(status >= 500 ? 502 : status, {
          success: false,
          message:
            status >= 500
              ? 'Serviço de IA temporariamente indisponível.'
              : 'Falha na comunicação com a IA.',
          response_time_ms: elapsed2,
        })
      }

      $app.logger().error('OpenAI test endpoint failed', 'error', err.message, 'userId', userId)

      return e.json(500, {
        success: false,
        message: 'Erro interno ao testar conexão com IA.',
        response_time_ms: elapsed2,
      })
    }
  },
  $apis.requireAuth(),
)
