cronAdd('process_meal_queue', '*/1 * * * *', () => {
  var WORKER_VERSION = 'vision-fix-2026-07-12-v1'

  $app
    .logger()
    .info(
      'MEAL_WORKER_CRON_START',
      'worker_version',
      WORKER_VERSION,
      'timestamp',
      new Date().toISOString(),
    )

  function bytesToBase64(bytes) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    var base64 = ''
    var i = 0
    while (i < bytes.length) {
      var b0 = bytes[i++]
      var b1 = i < bytes.length ? bytes[i++] : 0
      var b2 = i < bytes.length ? bytes[i++] : 0

      var encoded1 = chars.charAt(b0 >> 2)
      var encoded2 = chars.charAt(((b0 & 3) << 4) | (b1 >> 4))
      var encoded3 = chars.charAt(((b1 & 15) << 2) | (b2 >> 6))
      var encoded4 = chars.charAt(b2 & 63)

      if (i - 1 >= bytes.length) encoded3 = '='
      if (i >= bytes.length) encoded4 = '='

      base64 += encoded1 + encoded2 + encoded3 + encoded4
    }
    return base64
  }

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
        var hasImageContent = false

        if (photos.length > 0) {
          var p = photos[0]
          var fileName = p.getString('image')

          if (fileName) {
            try {
              var fileKey = p.baseFilesPath() + '/' + fileName
              var fsys = $app.newFilesystem()
              var reader = fsys.getReader(fileKey)

              var maxBytes = 10 * 1024 * 1024
              var chunks = []
              var totalBytes = 0
              var readBuf = new Uint8Array(8192)

              while (true) {
                var bytesRead = 0
                try {
                  bytesRead = reader.read(readBuf)
                } catch (e) {
                  break
                }
                if (!bytesRead || bytesRead <= 0) break
                for (var b = 0; b < bytesRead; b++) {
                  chunks.push(readBuf[b])
                }
                totalBytes += bytesRead
                if (totalBytes > maxBytes) {
                  throw new Error('Image exceeds 10MB safety limit')
                }
              }

              if (totalBytes === 0) {
                throw new Error('Image file is empty after reading from storage')
              }

              var imgBytes = new Uint8Array(chunks)
              var imgSizeBytes = imgBytes.length
              imgSizeKb = Math.round(imgSizeBytes / 1024)

              var base64Img = bytesToBase64(imgBytes)

              var mimeType = 'image/jpeg'
              if (fileName.toLowerCase().endsWith('.png')) mimeType = 'image/png'
              else if (fileName.toLowerCase().endsWith('.webp')) mimeType = 'image/webp'

              var dataUrl = 'data:' + mimeType + ';base64,' + base64Img
              userContent.push({ type: 'image_url', image_url: { url: dataUrl } })
              hasImageContent = true
            } catch (imgErr) {
              $app.logger().error('Failed to read image to base64', 'error', imgErr.message)
              throw imgErr
            } finally {
              try {
                if (fsys) fsys.close()
              } catch (_) {}
            }
          }
        }

        if (photos.length > 0 && !hasImageContent) {
          throw new Error(
            'IMAGE_NOT_ATTACHED_TO_AI_REQUEST: photos found but no image content was prepared for the AI call',
          )
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
        var errType = ''
        var errString = ''
        try {
          errStack = err.stack || ''
        } catch (_) {}
        try {
          errType = err.constructor ? err.constructor.name || '' : ''
        } catch (_) {}
        try {
          errString = String(err)
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
        } catch (queueSaveErr) {
          $app
            .logger()
            .error(
              'MEAL_WORKER_QUEUE_SAVE_FAILED',
              'worker_version',
              WORKER_VERSION,
              'meal_id',
              mealId,
              'request_id',
              requestId,
              'queue_save_error',
              queueSaveErr.message || 'unknown',
            )
        }

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
          $app
            .logger()
            .error(
              'MEAL_WORKER_MEAL_UPDATE_FAILED',
              'worker_version',
              WORKER_VERSION,
              'meal_id',
              mealId,
              'request_id',
              requestId,
              'meal_update_error',
              mealErr.message || 'unknown',
            )
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
      }
    }
  } catch (err) {
    $app
      .logger()
      .error(
        'MEAL_WORKER_CRON_ERROR',
        'worker_version',
        WORKER_VERSION,
        'msg',
        err.message,
        'stack',
        err.stack || '',
      )
  }
})
