routerAdd(
  'POST',
  '/backend/v1/ai-vision-test',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')
    var role = ''
    try {
      role = e.auth.getString('role') || ''
    } catch (_) {}
    if (role !== 'nutritionist') return e.forbiddenError('only nutritionists can run vision tests')

    var PROMPT = 'Descreva objetivamente os alimentos visíveis nesta imagem.'
    var MODEL = 'fast'
    var testId = 'VT_' + $security.randomString(8)

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
      return 'image/jpeg'
    }

    function readPhotoFile(photo) {
      var fileName = photo.getString('image')
      if (!fileName)
        return { success: false, error: 'IMAGE_NOT_READABLE: no image filename on photo record' }
      var fsys = null
      var reader = null
      try {
        var fileKey = photo.baseFilesPath() + '/' + fileName
        fsys = $app.newFilesystem()
        if (!fsys.exists(fileKey))
          return {
            success: false,
            error: 'IMAGE_NOT_READABLE: file not found in storage: ' + fileKey,
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
          if (totalBytes > maxBytes)
            return { success: false, error: 'IMAGE_NOT_READABLE: image exceeds 10MB limit' }
          for (var b = 0; b < bytesRead; b++) chunks.push(readBuf[b])
        }
        if (totalBytes === 0)
          return { success: false, error: 'IMAGE_NOT_READABLE: 0 bytes read from storage' }
        var imgBytes = new Uint8Array(chunks)
        var mimeType = detectImageMime(fileName, imgBytes)
        if (mimeType !== 'image/png' && mimeType !== 'image/jpeg' && mimeType !== 'image/webp') {
          return { success: false, error: 'UNSUPPORTED_MIME: ' + mimeType }
        }
        var base64Img = bytesToBase64Safe(imgBytes)
        if (!base64Img || base64Img.length === 0)
          return {
            success: false,
            error: 'IMAGE_NOT_READABLE: base64 encoding produced empty result',
          }
        var dataUrl = 'data:' + mimeType + ';base64,' + base64Img
        return {
          success: true,
          dataUrl: dataUrl,
          mimeType: mimeType,
          sizeBytes: imgBytes.length,
          sizeKb: Math.round(imgBytes.length / 1024),
        }
      } catch (err) {
        return { success: false, error: 'IMAGE_NOT_READABLE: ' + (err.message || 'unknown') }
      } finally {
        try {
          if (reader) reader.close()
        } catch (_) {}
        try {
          if (fsys) fsys.close()
        } catch (_) {}
      }
    }

    function callVisionAI(dataUrl) {
      var tStart = new Date().getTime()
      try {
        var reply = $ai.chat({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content:
                'Você é um assistente de análise visual. Descreva objetivamente o que vê na imagem.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: PROMPT },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
        })
        var content = reply.choices[0].message.content || ''
        return {
          success: true,
          status: 200,
          responseTimeMs: new Date().getTime() - tStart,
          content: content,
          error: '',
        }
      } catch (err) {
        var elapsed = new Date().getTime() - tStart
        var status = 500
        var errMsg = err.message || 'unknown'
        if (typeof SkipAiError !== 'undefined' && err instanceof SkipAiError) {
          status = err.status || 502
          if (errMsg.toLowerCase().indexOf('timeout') >= 0) errMsg = 'GATEWAY_TIMEOUT: ' + errMsg
        } else if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
          status = 503
          errMsg = 'MULTIMODAL_NOT_SUPPORTED: AI Gateway not configured'
        }
        return {
          success: false,
          status: status,
          responseTimeMs: elapsed,
          content: '',
          error: errMsg,
        }
      }
    }

    var photos = []
    try {
      photos = $app.findRecordsByFilter('meal_photos', "image != ''", '-created', 2, 0)
    } catch (err) {
      return e.json(200, {
        test_id: testId,
        timestamp: new Date().toISOString(),
        model_alias: MODEL,
        prompt_used: PROMPT,
        images_tested: [],
        comparison: {
          responses_identical: false,
          both_have_content: false,
          both_descriptive: false,
        },
        capability_status: 'CAPACIDADE NÃO COMPROVADA',
        summary: 'Erro ao buscar fotos: ' + (err.message || 'unknown'),
        error: err.message || 'unknown',
      })
    }

    var imagesTested = []
    for (var i = 0; i < photos.length; i++) {
      var photo = photos[i]
      var photoId = photo.id
      var mealId = photo.getString('meal_id')
      var fileName = photo.getString('image')
      var readResult = readPhotoFile(photo)
      if (!readResult.success) {
        imagesTested.push({
          photo_id: photoId,
          meal_id: mealId,
          file_name: fileName,
          mime_type: '',
          size_bytes: 0,
          size_kb: 0,
          read_success: false,
          read_error: readResult.error,
          ai_status: 0,
          ai_response_time_ms: 0,
          ai_raw_response: '',
          ai_error: '',
        })
        continue
      }
      var aiResult = callVisionAI(readResult.dataUrl)
      imagesTested.push({
        photo_id: photoId,
        meal_id: mealId,
        file_name: fileName,
        mime_type: readResult.mimeType,
        size_bytes: readResult.sizeBytes,
        size_kb: readResult.sizeKb,
        read_success: true,
        read_error: '',
        ai_status: aiResult.status,
        ai_response_time_ms: aiResult.responseTimeMs,
        ai_raw_response: aiResult.content,
        ai_error: aiResult.error,
      })
    }

    var responsesIdentical = false
    var bothHaveContent = false
    var bothDescriptive = false
    if (imagesTested.length >= 2) {
      var r1 = imagesTested[0].ai_raw_response || ''
      var r2 = imagesTested[1].ai_raw_response || ''
      responsesIdentical = r1 === r2 && r1 !== ''
      bothHaveContent = r1.length > 0 && r2.length > 0
      bothDescriptive =
        r1.length > 15 &&
        r2.length > 15 &&
        r1.toLowerCase().indexOf('error') < 0 &&
        r2.toLowerCase().indexOf('error') < 0 &&
        r1.toLowerCase().indexOf('unable') < 0 &&
        r2.toLowerCase().indexOf('unable') < 0 &&
        r1.toLowerCase().indexOf('cannot') < 0 &&
        r2.toLowerCase().indexOf('cannot') < 0
    } else if (imagesTested.length === 1) {
      var single = imagesTested[0].ai_raw_response || ''
      bothHaveContent = single.length > 0
      bothDescriptive = single.length > 15
    }

    var capabilityStatus = 'CAPACIDADE NÃO COMPROVADA'
    var summary = ''
    if (imagesTested.length < 2) {
      summary =
        'Apenas ' +
        imagesTested.length +
        ' foto(s) encontrada(s). Teste requer 2 imagens distintas para validação completa.'
      if (
        imagesTested.length === 1 &&
        imagesTested[0].ai_status === 200 &&
        imagesTested[0].ai_raw_response.length > 15
      ) {
        capabilityStatus = 'CAPACIDADE PARCIALMENTE COMPROVADA'
        summary += ' Uma imagem foi analisada com sucesso, mas comparacao nao foi possivel.'
      }
    } else if (responsesIdentical) {
      summary =
        'Respostas identicas para imagens diferentes - modelo pode estar retornando respostas genericas.'
    } else if (!bothHaveContent) {
      summary = 'Uma ou ambas as respostas estao vazias.'
    } else if (!bothDescriptive) {
      summary = 'Uma ou ambas as respostas sao muito curtas ou contem indicadores de erro.'
    } else if (
      imagesTested[0].ai_status === 200 &&
      imagesTested[1].ai_status === 200 &&
      !responsesIdentical &&
      bothDescriptive
    ) {
      capabilityStatus = 'CAPACIDADE COMPROVADA'
      summary =
        'Duas imagens distintas foram processadas com respostas descritivas unicas e contextuais.'
    } else {
      summary =
        'Falha em um ou ambos os testes de visao. Verifique ai_status e ai_error em cada imagem.'
    }

    try {
      var logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      var log = new Record(logCol)
      log.set('prompt', PROMPT)
      log.set(
        'response',
        JSON.stringify({
          test_id: testId,
          capability_status: capabilityStatus,
          images_count: imagesTested.length,
        }),
      )
      log.set('user_id', userId)
      log.set('type', 'ai_vision_test')
      log.set('model_used', MODEL)
      log.set(
        'provider_status_code',
        imagesTested.length > 0
          ? imagesTested[0].ai_status || (imagesTested[1] ? imagesTested[1].ai_status : 0) || 0
          : 0,
      )
      log.set(
        'original_error',
        imagesTested.length > 0
          ? imagesTested[0].ai_error || (imagesTested[1] ? imagesTested[1].ai_error : '') || ''
          : '',
      )
      log.set('request_id', testId)
      log.set('estimated_cost', 0)
      if (imagesTested.length > 0 && imagesTested[0].size_kb)
        log.set('image_size_kb', imagesTested[0].size_kb)
      $app.saveNoValidate(log)
    } catch (_) {}

    return e.json(200, {
      test_id: testId,
      timestamp: new Date().toISOString(),
      model_alias: MODEL,
      prompt_used: PROMPT,
      images_tested: imagesTested,
      comparison: {
        responses_identical: responsesIdentical,
        both_have_content: bothHaveContent,
        both_descriptive: bothDescriptive,
      },
      capability_status: capabilityStatus,
      summary: summary,
    })
  },
  $apis.requireAuth(),
)
