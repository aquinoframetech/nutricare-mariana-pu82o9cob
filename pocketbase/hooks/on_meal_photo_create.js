onRecordAfterCreateSuccess((e) => {
  const photo = e.record
  const mealId = photo.getString('meal_id')
  const filename = photo.getString('image')

  if (!mealId || !filename) return e.next()

  try {
    const meal = $app.findRecordById('meals', mealId)

    if (meal.getString('ai_food_identified') !== '') return e.next()

    var baseUrl = $secrets.get('PB_INSTANCE_URL') || ''
    var token = $secrets.get('PB_SUPERUSER_TOKEN') || ''
    var imageUrl = baseUrl + '/api/files/meal_photos/' + photo.id + '/' + filename

    var imageDataUrl = ''
    try {
      var imgRes = $http.send({
        url: imageUrl,
        method: 'GET',
        headers: { Authorization: token },
        timeout: 15,
      })
      if (imgRes.statusCode === 200 && imgRes.body) {
        var body = imgRes.body
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        var base64 = ''
        var i = 0
        while (i < body.length) {
          var a = body.charCodeAt(i++)
          var b = i < body.length ? body.charCodeAt(i++) : -1
          var c = i < body.length ? body.charCodeAt(i++) : -1
          base64 += chars[a >> 2]
          base64 += chars[((a & 3) << 4) | (b >= 0 ? b >> 4 : 0)]
          base64 += b >= 0 ? chars[((b & 15) << 2) | (c >= 0 ? c >> 6 : 0)] : '='
          base64 += c >= 0 ? chars[c & 63] : '='
        }
        imageDataUrl = 'data:image/jpeg;base64,' + base64
      }
    } catch (fetchErr) {
      $app.logger().warn('Could not fetch image for vision analysis', 'error', fetchErr.message)
    }

    var systemPrompt =
      'You are a nutrition expert. Analyze the meal and estimate nutrition. Return ONLY valid JSON: {"calories": number, "proteins": number, "carbs": number, "fats": number, "items": ["item1"], "description": "brief description in Portuguese", "ai_notes": "qualitative nutritional feedback in Portuguese", "confidence": number between 0 and 1}'

    var mealDesc = meal.getString('name') || ''
    var userContent

    if (imageDataUrl !== '') {
      userContent = [
        {
          type: 'text',
          text: 'Analyze this meal photo.' + (mealDesc ? ' Description: ' + mealDesc : ''),
        },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ]
    } else {
      userContent = 'Analyze this meal: ' + (mealDesc || 'a meal')
    }

    var reply = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })

    var content = reply.choices[0].message.content

    var userId = ''
    try {
      var patient = $app.findRecordById('patients', meal.getString('patient_id'))
      userId = patient.getString('user_id')
    } catch (_) {}

    try {
      var logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      var log = new Record(logCol)
      log.set('prompt', 'Vision analysis for meal: ' + mealDesc)
      log.set('response', content)
      if (userId !== '') log.set('user_id', userId)
      log.set('type', 'vision_analysis')
      $app.saveNoValidate(log)
    } catch (_) {}

    var parsed
    try {
      var jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch (_) {
      return e.next()
    }

    meal.set('ai_food_identified', (parsed.items || []).join(', '))
    meal.set('ai_description', parsed.description || '')
    meal.set('calories', parsed.calories || 0)
    meal.set('proteins', parsed.proteins || 0)
    meal.set('carbs', parsed.carbs || 0)
    meal.set('fats', parsed.fats || 0)
    meal.set('ai_confidence', parsed.confidence || 0.5)
    if (parsed.ai_notes) meal.set('ai_notes', parsed.ai_notes)
    $app.save(meal)
  } catch (err) {
    $app.logger().error('Vision analysis failed', 'error', err.message)
  }

  return e.next()
}, 'meal_photos')
