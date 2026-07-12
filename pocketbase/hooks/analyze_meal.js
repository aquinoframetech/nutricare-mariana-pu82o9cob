routerAdd(
  'POST',
  '/backend/v1/analyze-meal',
  (e) => {
    const tsRequestReceived = new Date()
    const reqId = $security.randomString(32)
    e.response.header().set('X-Request-Id', reqId)

    const body = e.requestInfo().body || {}
    const description = (body.description || '').trim()
    const mealId = body.meal_id || ''

    let dur_image_validation_ms = 0
    let dur_image_processing_ms = 0
    let dur_openai_request_ms = 0
    let dur_openai_response_ms = 0
    let dur_response_parsing_ms = 0
    let dur_nutrition_processing_ms = 0
    let dur_database_save_ms = 0
    let dur_response_sent_ms = 0

    let image_size_kb = 0
    let image_dimensions = ''
    let openai_status = 200
    let timeout_source = ''
    let isSuccess = false
    let parsed = null

    const saveProfileLog = () => {
      try {
        const profCol = $app.findCollectionByNameOrId('analysis_profiling_logs')
        const profLog = new Record(profCol)
        profLog.set('request_id', reqId)
        if (e.auth) profLog.set('user_id', e.auth.id)
        if (mealId) profLog.set('meal_id', mealId)
        profLog.set('ts_request_received', tsRequestReceived)
        profLog.set('total_time_ms', new Date().getTime() - tsRequestReceived.getTime())
        profLog.set('model_used', 'fast')
        profLog.set('image_size_kb', image_size_kb)
        profLog.set('image_dimensions', image_dimensions)
        profLog.set('openai_status', openai_status)
        profLog.set('timeout_source', timeout_source)
        profLog.set('dur_image_validation_ms', dur_image_validation_ms)
        profLog.set('dur_image_processing_ms', dur_image_processing_ms)
        profLog.set('dur_openai_request_ms', dur_openai_request_ms)
        profLog.set('dur_openai_response_ms', dur_openai_response_ms)
        profLog.set('dur_response_parsing_ms', dur_response_parsing_ms)
        profLog.set('dur_nutrition_processing_ms', dur_nutrition_processing_ms)
        profLog.set('dur_database_save_ms', dur_database_save_ms)
        profLog.set('dur_response_sent_ms', dur_response_sent_ms)
        $app.saveNoValidate(profLog)
      } catch (err) {
        console.log('Error saving profiling log:', err.message)
      }
    }

    if (!description) {
      timeout_source = 'frontend'
      saveProfileLog()
      return e.badRequestError('description is required')
    }

    try {
      // image validation
      const tImageVal = Date.now()
      dur_image_validation_ms = Date.now() - tImageVal

      // image processing
      const tImageProc = Date.now()
      dur_image_processing_ms = Date.now() - tImageProc

      // Database save for chatgpt_analysis_logs
      const tDbStart1 = Date.now()
      const logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      const log = new Record(logCol)
      log.set('prompt', 'REDACTED_FOR_PRIVACY')
      log.set('user_id', e.auth ? e.auth.id : '')
      if (mealId) log.set('meal_id', mealId)
      log.set('type', 'vision_analysis')
      log.set('model_used', 'fast')
      $app.saveNoValidate(log)
      dur_database_save_ms += Date.now() - tDbStart1

      const tOpenaiStart = Date.now()
      let reply
      try {
        reply = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'You are a nutrition expert. Analyze the meal and estimate nutrition including fibers and sodium. Return ONLY valid JSON: {"calories": number, "proteins": number, "carbs": number, "fats": number, "fibers": number, "sodium": number, "items": ["item1"], "description": "brief description in Portuguese", "ai_notes": "qualitative nutritional feedback in Portuguese about meal quality and suggestions"}',
            },
            { role: 'user', content: description },
          ],
        })
        dur_openai_request_ms = Date.now() - tOpenaiStart
        dur_openai_response_ms = Date.now() - tOpenaiStart
      } catch (err) {
        dur_openai_request_ms = Date.now() - tOpenaiStart
        openai_status = err.status || 500
        if (openai_status === 504 || openai_status === 408) {
          timeout_source = 'openai'
        } else {
          timeout_source = 'backend'
        }
        throw err
      }

      const content = reply.choices[0].message.content
      let estimatedCost = 0
      if (reply.usage) {
        let promptTokens = reply.usage.prompt_tokens || 0
        let completionTokens = reply.usage.completion_tokens || 0
        estimatedCost = (promptTokens * 0.15 + completionTokens * 0.6) / 1000000
      }

      const tDbStart2 = Date.now()
      log.set('response', 'REDACTED_FOR_PRIVACY')
      log.set('response_time_ms', Date.now() - tOpenaiStart)
      log.set('estimated_cost', estimatedCost)
      $app.saveNoValidate(log)
      dur_database_save_ms += Date.now() - tDbStart2

      const tParseStart = Date.now()
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
        dur_response_parsing_ms = Date.now() - tParseStart
      } catch (_) {
        dur_response_parsing_ms = Date.now() - tParseStart
        parsed = {
          calories: 0,
          proteins: 0,
          carbs: 0,
          fats: 0,
          fibers: 0,
          sodium: 0,
          items: [],
          description: 'Não foi possível analisar a refeição.',
        }
      }

      const tNutri = Date.now()
      dur_nutrition_processing_ms = Date.now() - tNutri

      isSuccess = true
    } catch (err) {
      saveProfileLog()
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'AI temporariamente indisponível' })
      if (err instanceof SkipAiError)
        return e.json(502, { error: 'AI temporariamente indisponível' })
      throw err
    }

    if (isSuccess) {
      const tSend = Date.now()
      dur_response_sent_ms = Date.now() - tSend
      saveProfileLog()
      return e.json(200, parsed)
    }
  },
  $apis.requireAuth(),
)
