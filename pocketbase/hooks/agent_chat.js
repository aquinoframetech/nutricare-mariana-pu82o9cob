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

      var mode = 'general_nutrition_estimate'
      try {
        var classReply = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'You are an intent classifier for a nutrition app. Classify the user message into exactly one mode. Return ONLY the mode name, nothing else. Rules: "general_nutrition_estimate" = message describes food, meals, quantities, or asks for calorie/macro estimates WITHOUT referencing a specific patient, patient ID, meal record, evolution, goal adherence, or clinical history. "clinical_record_analysis" = message references "patient", "my meals", "evolution", "goal", "adherence", "history", "progress", a specific patient name/ID, or asks to analyze registered data.',
            },
            { role: 'user', content: body.message },
          ],
        })
        var classified = classReply.choices[0].message.content.trim()
        if (classified === 'clinical_record_analysis') mode = 'clinical_record_analysis'
      } catch (_) {}

      var result
      var totalCost = 0

      if (mode === 'general_nutrition_estimate') {
        var generalReply = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'Você é um assistente de nutrição. Forneça estimativas nutricionais gerais.\n\nREGRAS:\n1. SEMPRE forneça FAIXAS de valores, nunca valores únicos. Ex: "750 a 950 kcal".\n2. Use linguagem de estimativa: "estimado", "aproximadamente", "provavelmente", "em média".\n3. Estruture sua resposta:\n   a) **Faixa Estimada Total**\n   b) **Detalhamento por Item** (cada alimento com faixa de calorias e macros)\n   c) **Total Estimado** (recapitule calorias e macros)\n   d) **Avisos e Variáveis** (método de preparo, óleo, variações de porção, diferenças entre marcas)\n4. NUNCA forneça conselho diagnóstico ou médico.\n5. Responda SEMPRE em português brasileiro (pt-BR).\n6. Orientações educativas NÃO substituem consulta com nutricionista.\n7. Priorize as bases TACO (Brasil), TBCA e USDA.\n8. Para pratos compostos, identifique ingredientes e marque ingredientes ocultos.\n9. Não alucine — se não for possível identificar, informe claramente.',
            },
            { role: 'user', content: body.message },
          ],
        })
        result = {
          content: generalReply.choices[0].message.content,
          conversation_id: '',
          message_id: 'gen_' + $security.randomString(12),
          citations: null,
        }
        if (generalReply.usage) {
          totalCost =
            (generalReply.usage.prompt_tokens * 0.15 + generalReply.usage.completion_tokens * 0.6) /
            1000000
        }
      } else {
        result = $ai.agent('nutri-assistant').chat({
          user_id: userId,
          conversation_id: body.conversation_id || null,
          message: body.message,
        })
        if (result.iterations) totalCost = result.iterations * 0.001
      }

      var elapsed = new Date().getTime() - startTime

      try {
        const logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
        const log = new Record(logCol)
        log.set('prompt', body.message)
        log.set('response', result.content || '')
        log.set('user_id', userId)
        log.set('type', 'agent_chat_' + mode)
        log.set('model_used', 'fast')
        log.set('response_time_ms', elapsed)
        log.set('estimated_cost', totalCost)
        $app.saveNoValidate(log)
      } catch (_) {}

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
        mode: mode,
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
