cronAdd('process_meal_queue', '*/1 * * * *', () => {
  try {
    var pending = $app.findRecordsByFilter(
      'meal_analysis_queue',
      "status = 'pending' || (status = 'retry_scheduled' && next_retry_at <= @now)",
      'created',
      10,
      0,
    )

    for (var i = 0; i < pending.length; i++) {
      var record = pending[i]
      var requestId = record.getString('request_id') || 'REQ_' + $security.randomString(8)
      var mealId = record.getString('meal_id')
      var tsStart = new Date().getTime()

      var tImgVal = 0,
        tAiReq = 0,
        tParse = 0,
        tNutri = 0,
        tDb = 0
      var modelUsed = 'fast'
      var openaiStatus = 0
      var timeoutSource = 'unknown'
      var userId = ''
      var imgSizeKb = 0
      var imgDims = ''

      try {
        var t0 = new Date().getTime()
        record.set('status', 'processing')
        record.set('locked_at', new Date().toISOString())
        record.set('locked_by', 'cron_worker')
        record.set('started_at', new Date().toISOString())
        record.set('attempts', record.getInt('attempts') + 1)
        $app.save(record)
        tDb += new Date().getTime() - t0

        t0 = new Date().getTime()
        var meal = $app.findRecordById('meals', mealId)
        tDb += new Date().getTime() - t0

        try {
          var patient = $app.findRecordById('patients', meal.getString('patient_id'))
          userId = patient.getString('user_id')
        } catch (_) {}

        var mealName = meal.getString('name')
        var aiInput = mealName
          ? 'Refeição: ' + mealName
          : 'Refeição sem nome, por favor analise a imagem se disponível.'

        t0 = new Date().getTime()
        var photos = $app.findRecordsByFilter(
          'meal_photos',
          "meal_id = '" + mealId + "'",
          '-created',
          1,
          0,
        )
        tDb += new Date().getTime() - t0

        t0 = new Date().getTime()
        var userContent = [{ type: 'text', text: aiInput }]
        if (photos.length > 0) {
          var p = photos[0]
          var fileName = p.getString('image')
          var baseUrl =
            $secrets.get('PB_INSTANCE_URL') ||
            'https://nutricare-mariana-aa9e0.shrd00.internal.goskip.dev'
          if (baseUrl && fileName) {
            var fileUrl = baseUrl + '/api/files/' + p.collectionId + '/' + p.id + '/' + fileName
            userContent.push({ type: 'image_url', image_url: { url: fileUrl } })
          }
        }
        tImgVal = new Date().getTime() - t0

        t0 = new Date().getTime()
        var aiResult = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'Você é um nutricionista. Analise a refeição e retorne uma estimativa nutricional detalhada no formato JSON.\nChaves obrigatórias (todas numéricas devem ser number, e textos string):\n{\n  "ai_food_identified": "string (nome do alimento)",\n  "ai_description": "string (descrição breve)",\n  "ai_confidence": 90,\n  "calories": 250,\n  "proteins": 10,\n  "carbs": 20,\n  "fats": 5,\n  "fibers": 2,\n  "sodium": 100,\n  "ai_notes": "string (dicas ou observações)"\n}',
            },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
        })
        tAiReq = new Date().getTime() - t0
        openaiStatus = 200

        t0 = new Date().getTime()
        var content = aiResult.choices[0].message.content
        var parsed = JSON.parse(content)
        tParse = new Date().getTime() - t0

        t0 = new Date().getTime()
        var estimatedValues = {
          ai_food_identified: parsed.ai_food_identified || 'Não identificado',
          ai_description: parsed.ai_description || '',
          ai_confidence: parsed.ai_confidence || 70,
          calories: parsed.calories || 0,
          proteins: parsed.proteins || 0,
          carbs: parsed.carbs || 0,
          fats: parsed.fats || 0,
          fibers: parsed.fibers || 0,
          sodium: parsed.sodium || 0,
          ai_notes: parsed.ai_notes || '',
        }
        tNutri = new Date().getTime() - t0

        t0 = new Date().getTime()
        meal.set('ai_food_identified', estimatedValues.ai_food_identified)
        meal.set('ai_description', estimatedValues.ai_description)
        meal.set('ai_confidence', estimatedValues.ai_confidence)
        meal.set('calories', estimatedValues.calories)
        meal.set('proteins', estimatedValues.proteins)
        meal.set('carbs', estimatedValues.carbs)
        meal.set('fats', estimatedValues.fats)
        meal.set('fibers', estimatedValues.fibers)
        meal.set('sodium', estimatedValues.sodium)
        meal.set('ai_notes', estimatedValues.ai_notes)
        meal.set('ai_estimated_values', JSON.stringify(estimatedValues))
        meal.set('ai_model', 'fast')
        meal.set('analysis_version', 'v2')
        meal.set('analysis_status', 'awaiting_confirmation')
        meal.set('analyzed_at', new Date().toISOString())
        $app.save(meal)
        tDb += new Date().getTime() - t0

        t0 = new Date().getTime()
        record.set('status', 'completed')
        record.set('finished_at', new Date().toISOString())
        $app.save(record)
        tDb += new Date().getTime() - t0

        var totalMs = new Date().getTime() - tsStart
        try {
          var profLog = null
          try {
            profLog = $app.findFirstRecordByData('analysis_profiling_logs', 'request_id', requestId)
          } catch (_) {}

          if (!profLog) {
            var profCol = $app.findCollectionByNameOrId('analysis_profiling_logs')
            profLog = new Record(profCol)
            profLog.set('request_id', requestId)
          }
          if (userId) profLog.set('user_id', userId)
          profLog.set('meal_id', mealId)
          profLog.set('total_time_ms', totalMs)
          profLog.set('image_size_kb', imgSizeKb)
          profLog.set('image_dimensions', imgDims)
          profLog.set('model_used', modelUsed)
          profLog.set('openai_status', openaiStatus)
          profLog.set('dur_image_validation_ms', tImgVal)
          profLog.set('dur_image_processing_ms', 0)
          profLog.set('dur_openai_request_ms', tAiReq)
          profLog.set('dur_openai_response_ms', 0)
          profLog.set('dur_response_parsing_ms', tParse)
          profLog.set('dur_nutrition_processing_ms', tNutri)
          profLog.set('dur_database_save_ms', tDb)
          profLog.set('dur_response_sent_ms', 0)
          $app.save(profLog)
        } catch (logErr) {
          $app.logger().error('meal_worker profiling log error', 'msg', logErr.message)
        }
      } catch (err) {
        var errMsg = err.message || 'unknown error'
        var errStack = ''
        try {
          errStack = err.stack || ''
        } catch (_) {}

        if (errMsg.toLowerCase().indexOf('timeout') >= 0) {
          timeoutSource = 'openai'
        }
        if (typeof SkipAiError !== 'undefined' && err instanceof SkipAiError) {
          openaiStatus = err.status || 502
          if (errMsg.toLowerCase().indexOf('timeout') >= 0) timeoutSource = 'openai'
        } else if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
          openaiStatus = 503
        }

        try {
          record.set('status', 'failed')
          record.set('error_sanitized', errMsg)
          record.set('finished_at', new Date().toISOString())
          $app.save(record)
        } catch (_) {}

        try {
          var errLogCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
          var errLog = new Record(errLogCol)
          errLog.set('prompt', 'meal_worker analysis for meal: ' + mealId)
          errLog.set('response', errMsg)
          if (userId) errLog.set('user_id', userId)
          errLog.set('type', 'meal_analysis_error')
          errLog.set('model_used', modelUsed)
          errLog.set('meal_id', mealId)
          errLog.set('request_id', requestId)
          errLog.set('provider_status_code', openaiStatus || 500)
          errLog.set('original_error', errMsg)
          errLog.set('response_time_ms', new Date().getTime() - tsStart)
          errLog.set('estimated_cost', 0)
          $app.saveNoValidate(errLog)
        } catch (logErr3) {
          $app.logger().error('meal_worker chatgpt_analysis_logs error', 'msg', logErr3.message)
        }

        try {
          var mealFail = $app.findRecordById('meals', mealId)
          mealFail.set('analysis_status', 'failed')
          mealFail.set(
            'ai_notes',
            'Erro na análise: ' + errMsg + ' (status: ' + (openaiStatus || 500) + ')',
          )
          $app.save(mealFail)
        } catch (mealErr) {
          $app.logger().error('meal_worker update meal error', 'msg', mealErr.message)
        }

        try {
          var profLogErr = null
          try {
            profLogErr = $app.findFirstRecordByData(
              'analysis_profiling_logs',
              'request_id',
              requestId,
            )
          } catch (_) {}

          if (!profLogErr) {
            var profColErr = $app.findCollectionByNameOrId('analysis_profiling_logs')
            profLogErr = new Record(profColErr)
            profLogErr.set('request_id', requestId)
          }
          if (userId) profLogErr.set('user_id', userId)
          profLogErr.set('meal_id', mealId)
          profLogErr.set('total_time_ms', new Date().getTime() - tsStart)
          profLogErr.set('model_used', modelUsed)
          profLogErr.set('openai_status', openaiStatus || 500)
          profLogErr.set('timeout_source', timeoutSource)
          profLogErr.set('dur_image_validation_ms', tImgVal)
          profLogErr.set('dur_image_processing_ms', 0)
          profLogErr.set('dur_openai_request_ms', tAiReq)
          profLogErr.set('dur_response_parsing_ms', tParse)
          profLogErr.set('dur_nutrition_processing_ms', tNutri)
          profLogErr.set('dur_database_save_ms', tDb)
          $app.save(profLogErr)
        } catch (logErr2) {
          $app.logger().error('meal_worker error profiling log', 'msg', logErr2.message)
        }

        $app
          .logger()
          .error(
            'meal_worker processing error',
            'request_id',
            requestId,
            'meal_id',
            mealId,
            'error',
            errMsg,
            'stack',
            errStack,
          )
      }
    }
  } catch (err) {
    $app.logger().error('meal_worker cron error', 'msg', err.message)
  }
})
