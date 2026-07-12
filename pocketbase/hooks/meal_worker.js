cronAdd('meal_worker', '* * * * *', () => {
  var workerId = $security.randomString(16)
  var now = new Date()
  var nowIso = now.toISOString()
  var lockExpiryIso = new Date(now.getTime() - 5 * 60000).toISOString()

  try {
    $app
      .db()
      .newQuery(
        'UPDATE meal_analysis_queue SET status = {:st}, locked_at = {:now}, locked_by = {:wid} ' +
          'WHERE id IN (SELECT id FROM meal_analysis_queue WHERE ' +
          "(status = {:pending} OR (status = {:retry} AND (next_retry_at IS NULL OR next_retry_at = '' OR next_retry_at <= {:now}))) " +
          "AND (locked_at IS NULL OR locked_at = '' OR locked_at < {:lockExp}) LIMIT 1)",
      )
      .bind({
        st: 'processing',
        now: nowIso,
        wid: workerId,
        pending: 'pending',
        retry: 'retry_scheduled',
        lockExp: lockExpiryIso,
      })
      .execute()
  } catch (err) {
    $app.logger().error('meal_worker: claim failed', 'error', err.message)
    return
  }

  var jobs = []
  try {
    jobs = $app.findRecordsByFilter(
      'meal_analysis_queue',
      "locked_by = '" + workerId + "'",
      '-created',
      1,
      0,
    )
  } catch (_) {
    return
  }
  if (jobs.length === 0) return

  var job = jobs[0]
  var mealId = job.getString('meal_id')
  var requestId = job.getString('request_id')
  var attempts = job.getInt('attempts') + 1
  var startTime = now.getTime()

  job.set('attempts', attempts)
  job.set('started_at', nowIso)
  $app.saveNoValidate(job)

  $app
    .logger()
    .info('worker.job_claimed', 'request_id', requestId, 'meal_id', mealId, 'attempts', attempts)

  var openaiStatus = 200
  var timeoutSource = 'unknown'
  var durImgVal = 0,
    durImgProc = 0,
    durAiReq = 0,
    durParse = 0,
    durNutri = 0,
    durDbSave = 0
  var imageSizeKb = 0
  var isPermanent = false
  var isTransient = false
  var errorSanitized = ''
  var userId = ''
  var lastCheckpoint = 'job_claimed'
  var imageSizeBytes = 0

  try {
    var meal = $app.findRecordById('meals', mealId)
    var mealStatus = meal.getString('analysis_status')
    if (mealStatus === 'awaiting_confirmation' || mealStatus === 'confirmed') {
      job.set('status', 'completed')
      job.set('finished_at', new Date().toISOString())
      $app.saveNoValidate(job)
      return
    }

    var tImgVal = Date.now()
    var photos = $app.findRecordsByFilter(
      'meal_photos',
      "meal_id = '" + mealId + "'",
      '-created',
      1,
      0,
    )
    durImgVal = Date.now() - tImgVal
    if (photos.length === 0) {
      isPermanent = true
      errorSanitized = 'No photo found'
      throw new Error('no photo')
    }
    var photo = photos[0]
    var filename = photo.getString('image')
    if (!filename) {
      isPermanent = true
      errorSanitized = 'Photo has no image file'
      throw new Error('no image')
    }

    var patientId = meal.getString('patient_id')
    try {
      var patient = $app.findRecordById('patients', patientId)
      userId = patient.getString('user_id')
    } catch (_) {}

    var patientContext = ''
    try {
      var p = $app.findRecordById('patients', patientId)
      patientContext = 'Perfil: '
      if (p.getInt('age')) patientContext += 'idade ' + p.getInt('age') + ', '
      if (p.getString('gender')) patientContext += p.getString('gender') + ', '
      if (p.getInt('weight')) patientContext += p.getInt('weight') + 'kg, '
      if (p.getInt('height')) patientContext += p.getInt('height') + 'cm, '
      if (p.getString('goal')) patientContext += 'meta: ' + p.getString('goal') + ', '
      if (p.getInt('calorie_goal'))
        patientContext += 'meta calórica: ' + p.getInt('calorie_goal') + 'kcal/dia, '
      if (p.getString('restrictions'))
        patientContext += 'restrições: ' + p.getString('restrictions') + ', '
      if (p.getString('allergies')) patientContext += 'alergias: ' + p.getString('allergies') + ', '
      if (p.getString('condition')) patientContext += 'condição: ' + p.getString('condition')
    } catch (_) {}

    var tImgProc = Date.now()
    var baseUrl = $secrets.get('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
    var token = $secrets.get('PB_SUPERUSER_TOKEN') || ''
    var imageUrl = baseUrl + '/api/files/meal_photos/' + photo.id + '/' + filename
    var imageDataUrl = ''

    $app
      .logger()
      .info(
        'worker.image_processing_start',
        'meal_id',
        mealId,
        'photo_id',
        photo.id,
        'filename',
        filename,
      )

    try {
      lastCheckpoint = 'image_fetch_start'
      var tFetch = Date.now()
      var imgRes = $http.send({
        url: imageUrl,
        method: 'GET',
        headers: { Authorization: token },
        timeout: 15,
      })
      var durFetch = Date.now() - tFetch
      lastCheckpoint = 'image_fetch_complete'

      if (imgRes.statusCode !== 200 || !imgRes.body) {
        throw new Error('Image fetch failed with status ' + imgRes.statusCode)
      }

      var body = imgRes.body
      imageSizeBytes = body.length
      imageSizeKb = Math.round(imageSizeBytes / 1024)

      $app
        .logger()
        .info(
          'worker.image_file_read_success',
          'meal_id',
          mealId,
          'image_size_bytes',
          imageSizeBytes,
          'image_size_kb',
          imageSizeKb,
          'fetch_duration_ms',
          durFetch,
          'http_status',
          imgRes.statusCode,
        )

      lastCheckpoint = 'base64_encode_start'
      $app
        .logger()
        .info(
          'worker.base64_conversion_starting',
          'meal_id',
          mealId,
          'image_size_bytes',
          imageSizeBytes,
        )

      var tB64 = Date.now()
      var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var base64 = ''
      var bytesLen = imageSizeBytes
      var b64idx = 0
      while (b64idx < bytesLen) {
        var chunk = ''
        var end = b64idx + 12000
        if (end > bytesLen) end = bytesLen
        while (b64idx < end) {
          var b0 = body[b64idx++]
          var b1 = b64idx < bytesLen ? body[b64idx++] : -1
          var b2 = b64idx < bytesLen ? body[b64idx++] : -1
          chunk +=
            lookup[b0 >> 2] +
            lookup[((b0 & 3) << 4) | (b1 >= 0 ? b1 >> 4 : 0)] +
            (b1 >= 0 ? lookup[((b1 & 15) << 2) | (b2 >= 0 ? b2 >> 6 : 0)] : '=') +
            (b2 >= 0 ? lookup[b2 & 63] : '=')
        }
        base64 += chunk
      }

      var durB64 = Date.now() - tB64
      lastCheckpoint = 'base64_encode_complete'

      $app
        .logger()
        .info(
          'worker.base64_conversion_complete',
          'meal_id',
          mealId,
          'base64_length',
          base64.length,
          'encode_duration_ms',
          durB64,
        )

      imageDataUrl = 'data:image/jpeg;base64,' + base64
    } catch (fetchErr) {
      $app
        .logger()
        .error(
          'worker.image_processing_failed',
          'meal_id',
          mealId,
          'last_checkpoint',
          lastCheckpoint,
          'error_type',
          String(fetchErr.name || ''),
          'error_message',
          fetchErr.message,
          'stack',
          String(fetchErr.stack || ''),
        )
      isPermanent = true
      errorSanitized = 'Failed to fetch image: ' + fetchErr.message
      timeoutSource = 'backend'
      throw fetchErr
    }
    durImgProc = Date.now() - tImgProc

    if (!imageDataUrl) {
      isPermanent = true
      errorSanitized = 'Failed to load image data'
      timeoutSource = 'backend'
      throw new Error('no image data')
    }

    var systemPrompt =
      'Você é um nutricionista especialista em análise visual de alimentos. Analise a foto da refeição e retorne APENAS JSON válido com esta estrutura: {"alimentos_identificados":[{"nome":"string","quantidade_visual_estimada":"string","peso_estimado_em_gramas":number,"modo_de_preparo_provavel":"string","ingredientes_ocultos_possiveis":["string"],"base_nutricional":"TACO|TBCA|USDA","alimento_referencia":"string","confianca_por_alimento":number}],"calorias_estimadas":number,"proteinas_estimadas":number,"carboidratos_estimados":number,"gorduras_estimadas":number,"fibras_estimadas":number,"sodio_estimado":number,"confianca_geral":number,"observacoes":"string em português","perguntas_de_confirmacao":["string em português"]} Regras: Priorize as bases TACO (Brasil), TBCA e USDA. Para pratos compostos (feijoada, lasanha, sopas, tortas, sanduíches, vitaminas), identifique ingredientes e marque ingredientes ocultos (molhos, óleos, açúcar, manteiga). Se a imagem estiver escura, borrada ou não for possível identificar com segurança, retorne confianca_geral < 0.5 e inclua "Não foi possível identificar esta parte da refeição com segurança" nas observacoes. Todos os valores são ESTIMATIVAS nutricionais, não medições precisas. Não alucine.'

    var mealDesc = meal.getString('name') || ''
    var userContent = [
      {
        type: 'text',
        text:
          'Analise esta refeição.' +
          (mealDesc ? ' Descrição: ' + mealDesc : '') +
          (patientContext ? '. ' + patientContext : ''),
      },
      { type: 'image_url', image_url: { url: imageDataUrl } },
    ]

    lastCheckpoint = 'ai_chat_call_start'
    $app
      .logger()
      .info('worker.ai_gateway_reachable', 'meal_id', mealId, 'last_checkpoint', lastCheckpoint)
    var tAi = Date.now()
    var reply
    try {
      reply = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      })
      durAiReq = Date.now() - tAi
      lastCheckpoint = 'ai_chat_response_received'
      $app
        .logger()
        .info('worker.ai_gateway_response_received', 'meal_id', mealId, 'duration_ms', durAiReq)
    } catch (aiErr) {
      durAiReq = Date.now() - tAi
      openaiStatus = aiErr.status || 500
      lastCheckpoint = 'ai_chat_failed'
      $app
        .logger()
        .error(
          'worker.ai_gateway_error',
          'meal_id',
          mealId,
          'last_checkpoint',
          lastCheckpoint,
          'error_type',
          String(aiErr.name || ''),
          'error_message',
          aiErr.message,
        )
      timeoutSource = 'openai'
      if (aiErr instanceof SkipAiConfigError) {
        isPermanent = true
        errorSanitized = 'AI service not configured'
      } else if (aiErr instanceof SkipAiError) {
        if (openaiStatus >= 500) {
          isTransient = true
          errorSanitized = 'AI service temporarily unavailable'
        } else {
          isPermanent = true
          errorSanitized = 'AI request rejected'
        }
      } else {
        isTransient = true
        errorSanitized = 'Unexpected AI error'
      }
      throw aiErr
    }

    var content = reply.choices[0].message.content
    var tParse = Date.now()
    var parsed
    try {
      var jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
      durParse = Date.now() - tParse
    } catch (parseErr) {
      durParse = Date.now() - tParse
      isTransient = true
      errorSanitized = 'Failed to parse AI response'
      timeoutSource = 'backend'
      throw parseErr
    }

    $app
      .logger()
      .info(
        'worker.openai_completed',
        'request_id',
        requestId,
        'meal_id',
        mealId,
        'openai_status',
        openaiStatus,
      )

    var tNutri = Date.now()
    var foodNames = []
    if (parsed.alimentos_identificados) {
      for (var j = 0; j < parsed.alimentos_identificados.length; j++) {
        foodNames.push(parsed.alimentos_identificados[j].nome)
      }
    }
    durNutri = Date.now() - tNutri

    var tDb = Date.now()
    var prevValues = meal.get('ai_estimated_values')
    if (prevValues) {
      var history = meal.get('ai_estimated_values_history')
      if (!history || !Array.isArray(history)) history = []
      else if (typeof history === 'string') {
        try {
          history = JSON.parse(history)
        } catch (_) {
          history = []
        }
      }
      history.push({ values: prevValues, timestamp: nowIso })
      meal.set('ai_estimated_values_history', history)
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
    meal.set('ai_raw_response', parsed)
    meal.set('ai_estimated_values', parsed)
    meal.set('analysis_status', 'awaiting_confirmation')
    meal.set('ai_model', 'fast')
    meal.set('analysis_version', '3.0')
    meal.set('analyzed_at', nowIso)
    $app.save(meal)
    durDbSave = Date.now() - tDb

    $app
      .logger()
      .info(
        'worker.meal_updated',
        'request_id',
        requestId,
        'meal_id',
        mealId,
        'analysis_status',
        'awaiting_confirmation',
      )

    job.set('status', 'completed')
    job.set('finished_at', new Date().toISOString())
    job.set('error_sanitized', '')
    $app.saveNoValidate(job)

    var estimatedCost = 0,
      tokensInput = 0,
      tokensOutput = 0
    if (reply.usage) {
      tokensInput = reply.usage.prompt_tokens || 0
      tokensOutput = reply.usage.completion_tokens || 0
      estimatedCost = (tokensInput * 0.15 + tokensOutput * 0.6) / 1000000
    }
    try {
      var logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      var log = new Record(logCol)
      log.set('prompt', 'REDACTED_FOR_PRIVACY')
      log.set('response', 'REDACTED_FOR_PRIVACY')
      if (userId) log.set('user_id', userId)
      log.set('type', 'vision_analysis')
      log.set('model_used', 'fast')
      log.set('response_time_ms', Date.now() - startTime)
      log.set('estimated_cost', estimatedCost)
      log.set('tokens_input', tokensInput)
      log.set('tokens_output', tokensOutput)
      log.set('image_size_kb', imageSizeKb)
      log.set('meal_id', mealId)
      $app.saveNoValidate(log)
    } catch (_) {}

    try {
      var profCol = $app.findCollectionByNameOrId('analysis_profiling_logs')
      var profLog = new Record(profCol)
      profLog.set('request_id', requestId)
      if (userId) profLog.set('user_id', userId)
      profLog.set('meal_id', mealId)
      profLog.set('ts_request_received', nowIso)
      profLog.set('total_time_ms', Date.now() - startTime)
      profLog.set('model_used', 'fast')
      profLog.set('image_size_kb', imageSizeKb)
      profLog.set('openai_status', openaiStatus)
      profLog.set('timeout_source', '')
      profLog.set('dur_image_validation_ms', durImgVal)
      profLog.set('dur_image_processing_ms', durImgProc)
      profLog.set('dur_openai_request_ms', durAiReq)
      profLog.set('dur_openai_response_ms', durAiReq)
      profLog.set('dur_response_parsing_ms', durParse)
      profLog.set('dur_nutrition_processing_ms', durNutri)
      profLog.set('dur_database_save_ms', durDbSave)
      $app.saveNoValidate(profLog)
    } catch (_) {}
  } catch (err) {
    var rawErr = String(err.message || err)
    var errType = String(err.name || 'Error')
    var errStack = String(err.stack || '')
    $app
      .logger()
      .error(
        'meal_worker_error',
        'meal_id',
        mealId,
        'error',
        rawErr,
        'error_type',
        errType,
        'last_checkpoint',
        lastCheckpoint,
        'image_size_bytes',
        imageSizeBytes,
        'image_size_kb',
        imageSizeKb,
        'stack',
        errStack,
      )
    if (!errorSanitized) errorSanitized = rawErr
    if (!timeoutSource || timeoutSource === 'unknown')
      timeoutSource = isPermanent ? 'backend' : 'openai'

    var maxAttempts = 2
    var shouldFail = isPermanent || attempts >= maxAttempts

    if (shouldFail) {
      job.set('status', 'failed')
      job.set('finished_at', new Date().toISOString())
      job.set('error_sanitized', errorSanitized)
      $app.saveNoValidate(job)
      try {
        var mealFail = $app.findRecordById('meals', mealId)
        mealFail.set('analysis_status', 'failed')
        $app.save(mealFail)
      } catch (_) {}
    } else {
      var backoffSec = 5 // Fast retry for interactive user wait
      var nextRetry = new Date(Date.now() + backoffSec * 1000).toISOString()
      job.set('status', 'retry_scheduled')
      job.set('next_retry_at', nextRetry)
      job.set('error_sanitized', errorSanitized)
      $app.saveNoValidate(job)
    }

    try {
      var profCol2 = $app.findCollectionByNameOrId('analysis_profiling_logs')
      var profLog2 = new Record(profCol2)
      profLog2.set('request_id', requestId)
      if (userId) profLog2.set('user_id', userId)
      profLog2.set('meal_id', mealId)
      profLog2.set('ts_request_received', nowIso)
      profLog2.set('total_time_ms', Date.now() - startTime)
      profLog2.set('model_used', 'fast')
      profLog2.set('image_size_kb', imageSizeKb)
      profLog2.set('openai_status', openaiStatus)
      profLog2.set('timeout_source', timeoutSource)
      profLog2.set('dur_image_validation_ms', durImgVal)
      profLog2.set('dur_image_processing_ms', durImgProc)
      profLog2.set('dur_openai_request_ms', durAiReq)
      profLog2.set('dur_openai_response_ms', durAiReq)
      profLog2.set('dur_response_parsing_ms', durParse)
      profLog2.set('dur_nutrition_processing_ms', durNutri)
      profLog2.set('dur_database_save_ms', durDbSave)
      $app.saveNoValidate(profLog2)
    } catch (_) {}
  }
})
