routerAdd(
  'POST',
  '/backend/v1/analyze-meal-sync',
  (e) => {
    var bytesToBase64Fixed = function (bytes) {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var result = ''
      var len = bytes.length
      var getByte = function (i) {
        if (typeof bytes.charCodeAt === 'function') {
          return bytes.charCodeAt(i) & 0xff
        }
        return bytes[i] & 0xff
      }
      for (var i = 0; i < len; i += 3) {
        var a = getByte(i)
        var b = i + 1 < len ? getByte(i + 1) : 0
        var c = i + 2 < len ? getByte(i + 2) : 0
        result += chars[a >> 2]
        result += chars[((a & 3) << 4) | (b >> 4)]
        result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : '='
        result += i + 2 < len ? chars[c & 63] : '='
      }
      return result
    }

    var detectImageMime = function (fileName, bytes) {
      var getByte = function (i) {
        if (typeof bytes.charCodeAt === 'function') {
          return bytes.charCodeAt(i) & 0xff
        }
        return bytes[i] & 0xff
      }
      var len = bytes.length
      if (len >= 4) {
        var b0 = getByte(0),
          b1 = getByte(1),
          b2 = getByte(2),
          b3 = getByte(3)
        if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return 'image/png'
        if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return 'image/jpeg'
        if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46 && b3 === 0x38) return 'image/gif'
        if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46 && len >= 12) {
          if (
            getByte(8) === 0x57 &&
            getByte(9) === 0x45 &&
            getByte(10) === 0x42 &&
            getByte(11) === 0x50
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

      var hasImageContent = false
      if (photos.length > 0) {
        const p = photos[0]
        const fileName = p.getString('image')
        if (fileName) {
          var fileKey = p.baseFilesPath() + '/' + fileName
          var fsys = $app.newFilesystem()
          var reader = null
          try {
            if (!fsys.exists(fileKey)) {
              throw new Error('Image file not found in storage: ' + fileKey)
            }

            reader = fsys.getReader(fileKey)
            var imgChunks = []
            var imgTotalLen = 0
            var maxBytes = 10 * 1024 * 1024
            var readBuf = new Uint8Array(8192)

            while (true) {
              var bytesRead
              try {
                bytesRead = reader.read(readBuf)
              } catch (readEx) {
                break
              }
              if (!bytesRead || bytesRead <= 0) break
              imgTotalLen += bytesRead
              if (imgTotalLen > maxBytes) {
                throw new Error('Image exceeds 10MB safety limit')
              }
              var chunkStr = ''
              for (var bi = 0; bi < bytesRead; bi++) {
                chunkStr += String.fromCharCode(readBuf[bi])
              }
              imgChunks.push(chunkStr)
            }

            var imgBytes = imgChunks.join('')
            if (imgBytes.length === 0) {
              throw new Error('Image file is empty after reading from storage')
            }

            var imgSizeBytes = imgBytes.length
            var mimeType = detectImageMime(fileName, imgBytes)
            var base64Img = bytesToBase64Fixed(imgBytes)

            if (!base64Img || base64Img.length === 0) {
              throw new Error('Base64 encoding produced empty result')
            }

            var dataUrl = 'data:' + mimeType + ';base64,' + base64Img
            userContent.push({ type: 'image_url', image_url: { url: dataUrl } })
            hasImageContent = true

            $app
              .logger()
              .info(
                'analyze_meal image processed',
                'meal_id',
                mealId,
                'file_name',
                fileName,
                'image_size_bytes',
                imgSizeBytes,
                'base64_length',
                base64Img.length,
                'mime',
                mimeType,
              )
          } catch (imgErr) {
            throw imgErr
          } finally {
            if (reader) {
              try {
                reader.close()
              } catch (_) {}
            }
            try {
              fsys.close()
            } catch (_) {}
          }
        }
      }
      if (photos.length > 0 && !hasImageContent) {
        throw new Error(
          'IMAGE_NOT_ATTACHED_TO_AI_REQUEST: photos found but no image content was prepared for the AI call',
        )
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
