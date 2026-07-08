routerAdd(
  'POST',
  '/backend/v1/analyze-meal',
  (e) => {
    const body = e.requestInfo().body || {}
    const description = (body.description || '').trim()
    if (!description) return e.badRequestError('description is required')

    try {
      const logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      const log = new Record(logCol)
      log.set('prompt', description)
      log.set('user_id', e.auth?.id || '')
      log.set('type', 'vision_analysis')
      $app.saveNoValidate(log)

      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'You are a nutrition expert. Analyze the meal and estimate nutrition. Return ONLY valid JSON: {"calories": number, "proteins": number, "carbs": number, "fats": number, "items": ["item1"], "description": "brief description in Portuguese", "ai_notes": "qualitative nutritional feedback in Portuguese about meal quality and suggestions"}',
          },
          { role: 'user', content: description },
        ],
      })

      const content = reply.choices[0].message.content
      log.set('response', content)
      $app.saveNoValidate(log)

      let parsed
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
      } catch (_) {
        return e.json(200, {
          calories: 0,
          proteins: 0,
          carbs: 0,
          fats: 0,
          items: [],
          description: 'Não foi possível analisar a refeição.',
        })
      }

      return e.json(200, parsed)
    } catch (err) {
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'AI temporariamente indisponível' })
      if (err instanceof SkipAiError)
        return e.json(502, { error: 'AI temporariamente indisponível' })
      throw err
    }
  },
  $apis.requireAuth(),
)
