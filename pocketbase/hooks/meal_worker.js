cronAdd('process_meal_queue', '*/1 * * * *', () => {
  var WORKER_VERSION = 'vision-fix-2026-07-13-v2'

  $app
    .logger()
    .info(
      'MEAL_WORKER_CRON_START',
      'worker_version',
      WORKER_VERSION,
      'timestamp',
      new Date().toISOString(),
    )

  function bytesToBase64Safe(bytes) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    var result = ''
    var len = bytes.length
    for (var i = 0; i < len; i += 3) {
      var a = bytes[i] & 0xff
      var b = i + 1 < len ? bytes[i + 1] & 0xff : 0
      var c = i + 2 < len ? bytes[i + 2] & 0xff : 0
      result += chars[a >> 2]
      result += chars[((a & 3) << 4) | (b >> 4)]
      result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : '='
      result += i + 2 < len ? chars[c & 63] : '='
    }
    return result
  }

  function detectImageMime(fileName, bytes) {
    var len = bytes.length
    if (len >= 4) {
      var b0 = bytes[0] & 0xff,
        b1 = bytes[1] & 0xff,
        b2 = bytes[2] & 0xff,
        b3 = bytes[3] & 0xff
      if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return 'image/png'
      if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return 'image/jpeg'
      if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46 && b3 === 0x38) return 'image/gif'
      if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46 && len >= 12) {
        if (
          (bytes[8] & 0xff) === 0x57 &&
          (bytes[9] & 0xff) === 0x45 &&
          (bytes[10] & 0xff) === 0x42 &&
          (bytes[11] & 0xff) === 0x50
        )
          return 'image/webp'
      }
    }
    var ext = (fileName || '').split('.').pop().toLowerCase()
    if (ext === 'png') return 'image/png'
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
    if (ext === 'webp') return 'image/webp'
    if (ext === 'gif') return 'image/gif'
    return 'image/jpeg'
  }

  function isTransientError(status, errMsg) {
    if (status === 429 || status >= 500) return true
    var lower = (errMsg || '').toLowerCase()
    if (lower.indexOf('timeout') >= 0) return true
    if (lower.indexOf('network') >= 0) return true
    if (lower.indexOf('connection') >= 0) return true
    if (lower.indexOf('eof') >= 0) return true
    return false
  }

  function isPermanentError(errMsg) {
    var upper = (errMsg || '').toUpperCase()
    if (upper.indexOf('IMAGE_EMPTY') >= 0) return true
    if (upper.indexOf('IMAGE_PREPARATION_FAILED') >= 0) return true
    if (upper.indexOf('UNSUPPORTED_MIME') >= 0) return true
    return false
  }

  function calculateBackoffMs(attempts) {
    var delays = [60000, 300000, 900000, 3600000, 7200000]
    var idx = Math.min(attempts - 1, delays.length - 1)
    return delays[idx]
  }

  var MAX_ATTEMPTS = 5

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
      var queueCreatedAt = record.getString('created')
      var queueWaitMs = queueCreatedAt ? tsStart - new Date(queueCreatedAt).getTime() : 0
      $app
        .logger()
        .info(
          'MEAL_WORKER_JOB_PICKED',
          'meal_id',
          mealId,
          'request_id',
          requestId,
          'queue_created_at',
          queueCreatedAt,
          'queue_wait_ms',
          queueWaitMs,
          'attempts',
          record.getInt('attempts'),
          'queue_status',
          record.getString('status'),
        )
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
          : 'Refeição sem nome, por favor analise a imagem.'

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

        if (photos.length === 0) {
          throw new Error('IMAGE_PREPARATION_FAILED: no photo linked to meal')
        }

        if (photos.length > 0) {
          var p = photos[0]
          var fileName = p.getString('image')

          if (fileName) {
            var fsys = null
            var reader = null
            try {
              var fileKey = p.baseFilesPath() + '/' + fileName
              fsys = $app.newFilesystem()

              if (!fsys.exists(fileKey)) {
                throw new Error('IMAGE_PREPARATION_FAILED: file not found in storage: ' + fileKey)
              }

              reader = fsys.getReader(fileKey)
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
                  throw new Error('IMAGE_PREPARATION_FAILED: image exceeds 10MB safety limit')
                }
              }

              if (totalBytes === 0) {
                throw new Error('IMAGE_EMPTY: 0 bytes read from storage')
              }

              var imgBytes = new Uint8Array(chunks)
              var imgSizeBytes = imgBytes.length
              imgSizeKb = Math.round(imgSizeBytes / 1024)

              var mimeType = detectImageMime(fileName, imgBytes)

              if (
                mimeType !== 'image/png' &&
                mimeType !== 'image/jpeg' &&
                mimeType !== 'image/webp'
              ) {
                throw new Error('UNSUPPORTED_MIME: ' + mimeType)
              }

              var base64Img = bytesToBase64Safe(imgBytes)
              if (!base64Img || base64Img.length === 0) {
                throw new Error('IMAGE_PREPARATION_FAILED: base64 encoding produced empty result')
              }

              var dataUrl = 'data:' + mimeType + ';base64,' + base64Img
              userContent.push({ type: 'image_url', image_url: { url: dataUrl } })
              hasImageContent = true

              $app
                .logger()
                .info(
                  'MEAL_WORKER_IMAGE_PROCESSED',
                  'request_id',
                  requestId,
                  'meal_id',
                  mealId,
                  'file_name',
                  fileName,
                  'mime',
                  mimeType,
                  'image_size_bytes',
                  imgSizeBytes,
                  'base64_length',
                  base64Img.length,
                  'content_parts',
                  userContent.length,
                )
            } catch (imgErr) {
              $app
                .logger()
                .error(
                  'MEAL_WORKER_IMAGE_ERROR',
                  'error',
                  imgErr.message,
                  'meal_id',
                  mealId,
                  'request_id',
                  requestId,
                )
              throw imgErr
            } finally {
              try {
                if (reader) reader.close()
              } catch (_) {}
              try {
                if (fsys) fsys.close()
              } catch (_) {}
            }
          }
        }

        if (photos.length > 0 && !hasImageContent) {
          throw new Error(
            'IMAGE_PREPARATION_FAILED: photos found but no image content was prepared for the AI call',
          )
        }

        if (userContent.length !== 2) {
          throw new Error(
            'IMAGE_PREPARATION_FAILED: userContent must have exactly 2 parts (text + image), got ' +
              userContent.length,
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
                'Você é um nutricionista. Analise a refeição na imagem e retorne uma estimativa nutricional detalhada no formato JSON.\nChaves obrigatórias (todas numéricas devem ser number, e textos string):\n{\n  "ai_food_identified": "string (nome do alimento identificado visualmente)",\n  "ai_description": "string (descrição breve)",\n  "ai_confidence": 90,\n  "calories": 250,\n  "proteins": 10,\n  "carbs": 20,\n  "fats": 5,\n  "fibers": 2,\n  "sodium": 100,\n  "ai_notes": "string (dicas ou observações)"\n}',
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
        var foodIdentified = (parsed.ai_food_identified || '').trim()
        if (
          !foodIdentified ||
          foodIdentified.toLowerCase() === 'não identificado' ||
          foodIdentified.toLowerCase() === 'nao identificado'
        ) {
          throw new Error('VISUAL_CONFIRMATION_FAILED: AI did not identify food from image')
        }

        var estimatedValues = {
          ai_food_identified: foodIdentified,
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
        meal.set('ai_raw_response', JSON.stringify(parsed))
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

        if (typeof SkipAiError !== 'undefined' && err instanceof SkipAiError) {
          openaiStatus = err.status || 502
          if (errMsg.toLowerCase().indexOf('timeout') >= 0) timeoutSource = 'openai'
        } else if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
          openaiStatus = 503
        }

        var permanent = isPermanentError(errMsg)
        var transient = !permanent && isTransientError(openaiStatus, errMsg)
        var currentAttempts = record.getInt('attempts')

        try {
          if (transient && currentAttempts < MAX_ATTEMPTS) {
            var backoffMs = calculateBackoffMs(currentAttempts)
            record.set('status', 'retry_scheduled')
            record.set('next_retry_at', new Date(Date.now() + backoffMs).toISOString())
            record.set('error_sanitized', errMsg)
            record.set('finished_at', new Date().toISOString())
            $app.saveNoValidate(record)
            $app
              .logger()
              .info(
                'MEAL_WORKER_RETRY_SCHEDULED',
                'meal_id',
                mealId,
                'request_id',
                requestId,
                'attempts',
                currentAttempts,
                'next_retry_in_ms',
                backoffMs,
                'error',
                errMsg,
              )
          } else {
            record.set('status', 'failed')
            record.set('error_sanitized', errMsg)
            record.set('finished_at', new Date().toISOString())
            $app.saveNoValidate(record)
            $app
              .logger()
              .info(
                'MEAL_WORKER_FAILED',
                'meal_id',
                mealId,
                'request_id',
                requestId,
                'attempts',
                currentAttempts,
                'permanent',
                permanent,
                'error',
                errMsg,
              )
          }
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
          if (imgSizeKb) errLog.set('image_size_kb', imgSizeKb)
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
