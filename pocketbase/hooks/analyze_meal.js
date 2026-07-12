routerAdd(
  'POST',
  '/backend/v1/analyze-meal-sync',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const mealId = body.meal_id
      if (!mealId) {
        return e.badRequestError('meal_id is required')
      }

      const meal = $app.findRecordById('meals', mealId)
      if (!meal) {
        return e.notFoundError('meal not found')
      }

      const mealName = meal.getString('name')
      const aiInput = mealName ? `Refeição: ${mealName}` : 'Refeição sem nome'

      const photos = $app.findRecordsByFilter(
        'meal_photos',
        `meal_id = '${mealId}'`,
        '-created',
        1,
        0,
      )
      let userContent = []
      userContent.push({ type: 'text', text: aiInput })

      if (photos.length > 0) {
        const p = photos[0]
        const fileName = p.getString('image')
        let baseUrl = $secrets.get('PB_INSTANCE_URL')
        if (!baseUrl) baseUrl = 'https://nutricare-mariana-aa9e0.shrd00.internal.goskip.dev'
        if (baseUrl && fileName) {
          const fileUrl = `${baseUrl}/api/files/${p.collectionId}/${p.id}/${fileName}`
          userContent.push({ type: 'image_url', image_url: { url: fileUrl } })
        }
      }

      const aiResult = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content: `Você é um nutricionista. Analise a refeição e retorne uma estimativa nutricional no formato JSON.
Chaves obrigatórias:
{
  "ai_food_identified": "string",
  "ai_description": "string",
  "ai_confidence": 90,
  "calories": 250,
  "proteins": 10,
  "carbs": 20,
  "fats": 5,
  "fibers": 2,
  "sodium": 100,
  "ai_notes": "string"
}`,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        response_format: { type: 'json_object' },
      })

      const content = aiResult.choices[0].message.content
      const parsed = JSON.parse(content)

      meal.set('ai_food_identified', parsed.ai_food_identified || 'Não identificado')
      meal.set('ai_description', parsed.ai_description || '')
      meal.set('ai_confidence', parsed.ai_confidence || 70)
      meal.set('calories', parsed.calories || 0)
      meal.set('proteins', parsed.proteins || 0)
      meal.set('carbs', parsed.carbs || 0)
      meal.set('fats', parsed.fats || 0)
      meal.set('fibers', parsed.fibers || 0)
      meal.set('sodium', parsed.sodium || 0)
      meal.set('ai_notes', parsed.ai_notes || '')
      meal.set('analysis_status', 'awaiting_confirmation')
      meal.set('analyzed_at', new Date().toISOString())

      $app.save(meal)

      return e.json(200, { success: true, meal: meal.id })
    } catch (err) {
      $app.logger().error('analyze_meal error', 'msg', err.message)
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)
