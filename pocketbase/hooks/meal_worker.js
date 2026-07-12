cronAdd('process_meal_queue', '*/1 * * * *', () => {
  try {
    const pending = $app.findRecordsByFilter(
      'meal_analysis_queue',
      "status = 'pending' || (status = 'retry_scheduled' && next_retry_at <= @now)",
      'created',
      10,
      0,
    )

    for (let i = 0; i < pending.length; i++) {
      const record = pending[i]
      try {
        record.set('status', 'processing')
        record.set('locked_at', new Date().toISOString())
        record.set('attempts', record.getInt('attempts') + 1)
        $app.save(record)

        const mealId = record.getString('meal_id')
        const meal = $app.findRecordById('meals', mealId)
        const mealName = meal.getString('name')
        const aiInput = mealName
          ? `Refeição: ${mealName}`
          : 'Refeição sem nome, por favor analise a imagem se disponível ou sugira algo genérico.'

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
          if (!baseUrl) {
            baseUrl = 'https://nutricare-mariana-aa9e0.shrd00.internal.goskip.dev'
          }
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
              content: `Você é um nutricionista. Analise a refeição e retorne uma estimativa nutricional detalhada no formato JSON.
Chaves obrigatórias (todas numéricas devem ser number, e textos string):
{
  "ai_food_identified": "string (nome do alimento)",
  "ai_description": "string (descrição breve)",
  "ai_confidence": 90,
  "calories": 250,
  "proteins": 10,
  "carbs": 20,
  "fats": 5,
  "fibers": 2,
  "sodium": 100,
  "ai_notes": "string (dicas ou observações)"
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

        record.set('status', 'completed')
        record.set('finished_at', new Date().toISOString())
        $app.save(record)
      } catch (err) {
        record.set('status', 'failed')
        record.set('error_sanitized', err.message)
        $app.save(record)

        try {
          const meal = $app.findRecordById('meals', record.getString('meal_id'))
          meal.set('analysis_status', 'failed')
          $app.save(meal)
        } catch (mealErr) {
          $app.logger().error('meal_worker update meal error', 'msg', mealErr.message)
        }
      }
    }
  } catch (err) {
    $app.logger().error('meal_worker cron error', 'msg', err.message)
  }
})
