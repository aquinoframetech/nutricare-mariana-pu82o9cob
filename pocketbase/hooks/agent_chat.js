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

      var detailKeywords = [
        'detalhe',
        'detalhes',
        'detalhado',
        'detalhada',
        'explique',
        'explicar',
        'explicação',
        'mostre os macronutrientes',
        'macronutrientes',
        'quero a tabela',
        'tabela',
        'como chegou nesse cálculo',
        'como calculou',
        'como chegou',
        'complete',
        'completo',
        'completa',
        'quebra',
        'quebrar',
        'detalhar',
        'mostre tudo',
        'lista completa',
      ]
      var isDetailed = false
      var lowerMessage = body.message.toLowerCase()
      for (var i = 0; i < detailKeywords.length; i++) {
        if (lowerMessage.indexOf(detailKeywords[i]) !== -1) {
          isDetailed = true
          break
        }
      }

      var result
      var totalCost = 0
      var responseMode = mode

      if (mode === 'general_nutrition_estimate') {
        var systemPrompt
        if (isDetailed) {
          responseMode = 'general_nutrition_estimate_detailed'
          systemPrompt =
            'Você é uma nutricionista conversando com um paciente que pediu uma análise detalhada. Forneça uma resposta mais completa, mantendo o tom acolhedor e acessível.\n\nREGRAS OBRIGATÓRIAS:\n1. Pode usar tabelas Markdown e listas detalhadas.\n2. Forneça o detalhamento por item incluindo Calorias, Proteínas, Carboidratos, Gorduras, Fibras e Sódio.\n3. Estruture sua resposta de forma clara e visual.\n4. Use linguagem de estimativa para demonstrar que são valores aproximados ("estimado", "variando entre").\n5. NUNCA cite bases de dados internas (TACO, TBCA, USDA) no texto visível ao usuário.\n6. Responda SEMPRE em português brasileiro (pt-BR).\n7. NUNCA forneça conselho diagnóstico ou médico.\n8. Mantenha um tom profissional, humano e conversacional.'
        } else {
          responseMode = 'general_nutrition_estimate_summarized'
          systemPrompt =
            'Você é uma nutricionista conversando informalmente com um paciente em um chat. Responda de forma breve, objetiva e amigável.\n\nREGRAS OBRIGATÓRIAS:\n1. Responda APENAS o que foi perguntado. Se perguntaram sobre calorias, NÃO mencione proteínas, carboidratos ou gorduras a menos que questionada.\n2. Mantenha respostas em 2 a 5 frases, aproximadamente 100 palavras.\n3. Use linguagem simples, natural e conversacional, como uma nutricionista humana falando com um paciente. Evite jargões técnicos sempre que possível.\n4. NUNCA use Markdown tables.\n5. NUNCA liste macronutrientes detalhados (Proteínas, Carboidratos, Gorduras, Fibras, Sódio) em bullet points a menos que explicitamente solicitado com "detalhe", "explique", "tabela", "macronutrientes" ou "como calculou".\n6. NUNCA cite fontes de dados ou bases internas (TACO, TBCA, USDA). Use-as apenas internamente para cálculos.\n7. Forneça estimativas de FAIXAS de valores (ex: "aproximadamente 850 kcal, variando entre 750 e 950 kcal") em vez de valores únicos estritos.\n8. NUNCA adicione longas listas de disclaimers clínicos. Uma breve nota educativa no meio do texto é suficiente.\n9. Responda SEMPRE em português brasileiro (pt-BR) e seja acolhedora.\n10. NUNCA forneça conselho diagnóstico ou médico.\n11. Se não for possível identificar o alimento, informe de forma simples e humana.'
        }

        var generalReply = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: systemPrompt },
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
        log.set('type', 'agent_chat_' + responseMode)
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
        mode: responseMode,
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
