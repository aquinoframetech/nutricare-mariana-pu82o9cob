onRecordAfterCreateSuccess((e) => {
  const photo = e.record
  const mealId = photo.getString('meal_id')
  const filename = photo.getString('image')
  if (!mealId || !filename) return e.next()

  try {
    const meal = $app.findRecordById('meals', mealId)
    var currentStatus = meal.getString('analysis_status')
    if (
      currentStatus === 'awaiting_confirmation' ||
      currentStatus === 'confirmed' ||
      currentStatus === 'professionally_corrected'
    )
      return e.next()

    var startTime = new Date().getTime()
    var patientId = meal.getString('patient_id')

    var patientContext = ''
    try {
      var patient = $app.findRecordById('patients', patientId)
      patientContext = 'Perfil: '
      if (patient.getInt('age')) patientContext += 'idade ' + patient.getInt('age') + ', '
      if (patient.getString('gender')) patientContext += patient.getString('gender') + ', '
      if (patient.getInt('weight')) patientContext += patient.getInt('weight') + 'kg, '
      if (patient.getInt('height')) patientContext += patient.getInt('height') + 'cm, '
      if (patient.getString('goal')) patientContext += 'meta: ' + patient.getString('goal') + ', '
      if (patient.getInt('calorie_goal'))
        patientContext += 'meta calórica: ' + patient.getInt('calorie_goal') + 'kcal/dia, '
      if (patient.getString('restrictions'))
        patientContext += 'restrições: ' + patient.getString('restrictions') + ', '
      if (patient.getString('allergies'))
        patientContext += 'alergias: ' + patient.getString('allergies') + ', '
      if (patient.getString('condition'))
        patientContext += 'condição: ' + patient.getString('condition')
    } catch (_) {}

    var baseUrl = $secrets.get('PB_INSTANCE_URL') || ''
    var token = $secrets.get('PB_SUPERUSER_TOKEN') || ''
    var imageUrl = baseUrl + '/api/files/meal_photos/' + photo.id + '/' + filename
    var imageDataUrl = ''
    var imageSizeKb = 0

    try {
      var imgRes = $http.send({
        url: imageUrl,
        method: 'GET',
        headers: { Authorization: token },
        timeout: 15,
      })
      if (imgRes.statusCode === 200 && imgRes.body) {
        var body = imgRes.body
        imageSizeKb = Math.round(body.length / 1024)
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
      'Você é um nutricionista especialista em análise visual de alimentos. Analise a foto da refeição e retorne APENAS JSON válido com esta estrutura: {"alimentos_identificados":[{"nome":"string","quantidade_visual_estimada":"string","peso_estimado_em_gramas":number,"modo_de_preparo_provavel":"string","ingredientes_ocultos_possiveis":["string"],"base_nutricional":"TACO|TBCA|USDA","alimento_referencia":"string","confianca_por_alimento":number}],"calorias_estimadas":number,"proteinas_estimadas":number,"carboidratos_estimados":number,"gorduras_estimadas":number,"fibras_estimadas":number,"sodio_estimado":number,"confianca_geral":number,"observacoes":"string em português","perguntas_de_confirmacao":["string em português"]}'
    systemPrompt +=
      ' Regras: Priorize as bases TACO (Brasil), TBCA e USDA. Para pratos compostos (feijoada, lasanha, sopas, tortas, sanduíches, vitaminas), identifique ingredientes e marque ingredientes ocultos (molhos, óleos, açúcar, manteiga). Se a imagem estiver escura, borrada ou não for possível identificar com segurança, retorne confianca_geral < 0.5 e inclua "Não foi possível identificar esta parte da refeição com segurança" nas observacoes. Todos os valores são ESTIMATIVAS nutricionais, não medições precisas. Não alucine.'

    var mealDesc = meal.getString('name') || ''
    var userContent
    if (imageDataUrl !== '') {
      userContent = [
        {
          type: 'text',
          text:
            'Analise esta refeição.' +
            (mealDesc ? ' Descrição: ' + mealDesc : '') +
            (patientContext ? '. ' + patientContext : ''),
        },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ]
    } else {
      userContent =
        'Analise esta refeição: ' +
        (mealDesc || 'uma refeição') +
        (patientContext ? '. ' + patientContext : '')
    }

    var reply = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })
    var content = reply.choices[0].message.content
    var elapsed = new Date().getTime() - startTime

    var estimatedCost = 0,
      tokensInput = 0,
      tokensOutput = 0
    if (reply.usage) {
      tokensInput = reply.usage.prompt_tokens || 0
      tokensOutput = reply.usage.completion_tokens || 0
      estimatedCost = (tokensInput * 0.15 + tokensOutput * 0.6) / 1000000
    }

    var parsed
    try {
      var jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch (_) {
      meal.set('analysis_status', 'failed')
      $app.save(meal)
      return e.next()
    }

    var foodNames = []
    if (parsed.alimentos_identificados) {
      for (var j = 0; j < parsed.alimentos_identificados.length; j++)
        foodNames.push(parsed.alimentos_identificados[j].nome)
    }
    meal.set('ai_food_identified', foodNames.join(', '))
    meal.set('ai_description', parsed.observacoes || '')
    meal.set('calories', parsed.calorias_estimadas || 0)
    meal.set('proteins', parsed.proteinas_estimadas || 0)
    meal.set('carbs', parsed.carboidratos_estimados || 0)
    meal.set('fats', parsed.gorduras_estimadas || 0)
    meal.set('fibers', parsed.fibras_estimadas || 0)
    meal.set('sodium', parsed.sodio_estimado || 0)
    meal.set('ai_confidence', parsed.confianca_geral || 0.5)
    meal.set('ai_notes', parsed.observacoes || '')
    meal.set('ai_raw_response', content)
    meal.set('ai_estimated_values', parsed)
    meal.set('analysis_status', 'awaiting_confirmation')
    meal.set('ai_model', 'fast')
    meal.set('analysis_version', '2.0')
    meal.set('analyzed_at', new Date().toISOString())
    $app.save(meal)

    var userId = ''
    try {
      var patientRec = $app.findRecordById('patients', patientId)
      userId = patientRec.getString('user_id')
    } catch (_) {}

    try {
      var logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      var log = new Record(logCol)
      log.set(
        'prompt',
        'Vision analysis for meal: ' + mealDesc + (patientContext ? '. ' + patientContext : ''),
      )
      log.set('response', content)
      if (userId !== '') log.set('user_id', userId)
      log.set('type', 'vision_analysis')
      log.set('model_used', 'fast')
      log.set('response_time_ms', elapsed)
      log.set('estimated_cost', estimatedCost)
      log.set('tokens_input', tokensInput)
      log.set('tokens_output', tokensOutput)
      log.set('image_size_kb', imageSizeKb)
      log.set('meal_id', mealId)
      $app.saveNoValidate(log)
    } catch (_) {}
  } catch (err) {
    $app.logger().error('Vision analysis failed', 'error', err.message)
    try {
      var mealFail = $app.findRecordById('meals', photo.getString('meal_id'))
      mealFail.set('analysis_status', 'failed')
      $app.save(mealFail)
    } catch (_) {}
  }
  return e.next()
}, 'meal_photos')
