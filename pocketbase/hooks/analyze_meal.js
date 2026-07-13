routerAdd(
  'POST',
  '/backend/v1/analyze-meal-sync',
  (e) => {
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

    try {
      var body = e.requestInfo().body || {}
      var mealId = body.meal_id
      if (!mealId) return e.badRequestError('meal_id is required')

      var meal = $app.findRecordById('meals', mealId)
      if (!meal) return e.notFoundError('meal not found')

      var mealName = meal.getString('name')
      var aiInput = mealName
        ? 'Refeição: ' + mealName
        : 'Refeição sem nome, por favor analise a imagem.'

      var photos = $app.findRecordsByFilter(
        'meal_photos',
        "meal_id = '" + mealId + "'",
        '-created',
        1,
        0,
      )
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
              } catch (readEx) {
                break
              }
              if (!bytesRead || bytesRead <= 0) break
              totalBytes += bytesRead
              if (totalBytes > maxBytes) {
                throw new Error('IMAGE_PREPARATION_FAILED: image exceeds 10MB safety limit')
              }
              for (var bi = 0; bi < bytesRead; bi++) {
                chunks.push(readBuf[bi])
              }
            }

            if (totalBytes === 0) {
              throw new Error('IMAGE_EMPTY: 0 bytes read from storage')
            }

            var imgBytes = new Uint8Array(chunks)
            var imgSizeBytes = imgBytes.length
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
                'ANALYZE_MEAL_IMAGE_PROCESSED',
                'request_id',
                'SYNC_' + mealId,
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

      var aiResult = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um nutricionista. Analise a refeição na imagem e retorne uma estimativa nutricional no formato JSON.\nChaves obrigatórias:\n{\n  "ai_food_identified": "string (nome do alimento identificado visualmente)",\n  "ai_description": "string",\n  "ai_confidence": 90,\n  "calories": 250,\n  "proteins": 10,\n  "carbs": 20,\n  "fats": 5,\n  "fibers": 2,\n  "sodium": 100,\n  "ai_notes": "string"\n}',
          },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
      })

      var content = aiResult.choices[0].message.content
      var parsed = JSON.parse(content)

      var foodIdentified = (parsed.ai_food_identified || '').trim()
      if (
        !foodIdentified ||
        foodIdentified.toLowerCase() === 'não identificado' ||
        foodIdentified.toLowerCase() === 'nao identificado'
      ) {
        throw new Error('VISUAL_CONFIRMATION_FAILED: AI did not identify food from image')
      }

      meal.set('ai_food_identified', foodIdentified)
      meal.set('ai_description', parsed.ai_description || '')
      meal.set('ai_confidence', parsed.ai_confidence || 70)
      meal.set('calories', parsed.calories || 0)
      meal.set('proteins', parsed.proteins || 0)
      meal.set('carbs', parsed.carbs || 0)
      meal.set('fats', parsed.fats || 0)
      meal.set('fibers', parsed.fibers || 0)
      meal.set('sodium', parsed.sodium || 0)
      meal.set('ai_notes', parsed.ai_notes || '')
      meal.set(
        'ai_estimated_values',
        JSON.stringify({
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
        }),
      )
      meal.set('ai_raw_response', JSON.stringify(parsed))
      meal.set('ai_model', 'fast')
      meal.set('analysis_version', 'v2')
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
      return e.json(aStatus >= 500 ? 502 : aStatus, { error: aErrMsg, provider_status: aStatus })
    }
  },
  $apis.requireAuth(),
)
