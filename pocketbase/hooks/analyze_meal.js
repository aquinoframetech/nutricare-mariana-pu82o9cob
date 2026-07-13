routerAdd(
  'POST',
  '/backend/v1/analyze-meal-sync',
  (e) => {
    var toBase64 = function (data) {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var result = ''
      var len = data.length
      for (var i = 0; i < len; i += 3) {
        var a = data.charCodeAt(i) & 0xff
        var b = i + 1 < len ? data.charCodeAt(i + 1) & 0xff : 0
        var c = i + 2 < len ? data.charCodeAt(i + 2) & 0xff : 0
        result += chars[a >> 2]
        result += chars[((a & 3) << 4) | (b >> 4)]
        result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : '='
        result += i + 2 < len ? chars[c & 63] : '='
      }
      return result
    }

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
        if (fileName) {
          let baseUrl = $secrets.get('PB_INSTANCE_URL')
          if (!baseUrl) baseUrl = 'https://nutricare-mariana-aa9e0.shrd00.internal.goskip.dev'
          var superuserToken = $secrets.get('PB_SUPERUSER_TOKEN') || ''
          const fileUrl = `${baseUrl}/api/files/${p.collectionId}/${p.id}/${fileName}`
          var imgRes = null
          try {
            imgRes = $http.send({
              url: fileUrl,
              method: 'GET',
              headers: superuserToken ? { Authorization: superuserToken } : {},
              timeout: 30,
            })
          } catch (fetchErr) {
            throw new Error('Image fetch transport error: ' + fetchErr.message)
          }
          if (imgRes.statusCode !== 200 || !imgRes.body || imgRes.body.length === 0) {
            throw new Error('Failed to retrieve image file: HTTP ' + imgRes.statusCode)
          }
          var ext = fileName.split('.').pop().toLowerCase()
          var mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
          var base64Data = toBase64(imgRes.body)
          var dataUrl = 'data:' + mimeType + ';base64,' + base64Data
          userContent.push({ type: 'image_url', image_url: { url: dataUrl } })
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
      var aErrMsg = err.message || 'unknown error'
      var aStatus = 500
      if (typeof SkipAiError !== 'undefined' && err instanceof SkipAiError) {
        aStatus = err.status || 502
      } else if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
        aStatus = 503
      }

      var aBody = e.requestInfo().body || {}
      var aMealId = aBody.meal_id || ''

      try {
        var mealFailSync = $app.findRecordById('meals', aMealId)
        mealFailSync.set('analysis_status', 'failed')
        mealFailSync.set('ai_notes', 'Erro na análise: ' + aErrMsg + ' (status: ' + aStatus + ')')
        $app.save(mealFailSync)
      } catch (_) {}

      try {
        var aLogCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
        var aLog = new Record(aLogCol)
        aLog.set('prompt', 'analyze_meal_sync for meal: ' + aMealId)
        aLog.set('response', aErrMsg)
        aLog.set('user_id', e.auth ? e.auth.id : '')
        aLog.set('type', 'meal_analysis_sync_error')
        aLog.set('model_used', 'fast')
        if (aMealId) aLog.set('meal_id', aMealId)
        aLog.set('provider_status_code', aStatus)
        aLog.set('original_error', aErrMsg)
        aLog.set('estimated_cost', 0)
        aLog.set('request_id', 'SYNC_' + $security.randomString(8))
        $app.saveNoValidate(aLog)
      } catch (_) {}

      $app.logger().error('analyze_meal error', 'msg', aErrMsg, 'status', aStatus)
      return e.json(aStatus >= 500 ? 502 : aStatus, {
        error: aErrMsg,
        provider_status: aStatus,
      })
    }
  },
  $apis.requireAuth(),
)
