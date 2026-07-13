routerAdd(
  'POST',
  '/backend/v1/meals/analyze',
  (e) => {
    var t0 = new Date().getTime()
    var requestId = 'REQ_' + $security.randomString(16)

    function cp(name, data) {
      var elapsed = new Date().getTime() - t0
      var msg = name + ' request_id=' + requestId + ' elapsed_ms=' + elapsed
      if (data) {
        var keys = Object.keys(data)
        for (var i = 0; i < keys.length; i++) {
          msg += ' ' + keys[i] + '=' + data[keys[i]]
        }
      }
      $app.logger().info(msg, 'request_id', requestId)
    }

    cp('REQUEST_RECEIVED')

    try {
      var userId = e.auth ? e.auth.id : ''
      if (!userId) {
        cp('AUTH_FAILED')
        return e.json(401, { error: 'Sessão expirada. Faça login novamente.' })
      }

      var body = e.requestInfo().body || {}
      var mealName = body.description || body.name || 'Refeição'
      var clientRequestId = body.client_request_id || requestId
      var inputPatientId = body.patient_id

      if (e.request && typeof e.request.formValue === 'function') {
        mealName =
          mealName !== 'Refeição'
            ? mealName
            : e.request.formValue('description') || e.request.formValue('name') || 'Refeição'
        clientRequestId = body.client_request_id
          ? body.client_request_id
          : e.request.formValue('client_request_id') || requestId
        inputPatientId = inputPatientId || e.request.formValue('patient_id')
      }

      var patient
      try {
        if (inputPatientId) {
          patient = $app.findRecordById('patients', inputPatientId)
          if (patient.getString('user_id') !== userId && !e.hasSuperuserAuth()) {
            throw new Error('unauthorized')
          }
        } else {
          patient = $app.findFirstRecordByData('patients', 'user_id', userId)
        }
      } catch (_) {
        cp('PATIENT_NOT_FOUND', { user_id: userId })
        return e.json(400, { error: 'Perfil de paciente não encontrado. Complete seu cadastro.' })
      }
      cp('PATIENT_VALIDATED', { user_id: userId, patient_id: patient.id })

      try {
        var existing = $app.findFirstRecordByData('meals', 'client_request_id', clientRequestId)
        cp('IDEMPOTENT_HIT', {
          meal_id: existing.id,
          status: existing.getString('analysis_status'),
        })
        return e.json(202, {
          request_id: existing.getString('client_request_id') || existing.id,
          meal_id: existing.id,
          status: existing.getString('analysis_status'),
          job_id: '',
        })
      } catch (_) {}

      var uploadedFiles = e.findUploadedFiles('image')
      if (!uploadedFiles || uploadedFiles.length === 0) {
        cp('IMAGE_NOT_RECEIVED')
        return e.json(400, {
          code: 'IMAGE_NOT_RECEIVED',
          error: 'Nenhuma imagem enviada. Selecione uma foto.',
        })
      }

      var file = uploadedFiles[0]
      var fileName = file.name || 'image.jpeg'
      var ext = fileName.split('.').pop().toLowerCase()
      if (ext === 'jpg') ext = 'jpeg'
      var validMimes = ['jpeg', 'png', 'webp']

      if (validMimes.indexOf(ext) === -1) {
        cp('INVALID_IMAGE_TYPE', { ext: ext })
        return e.json(400, { error: 'Formato de imagem não suportado. Use JPG, PNG ou WebP.' })
      }

      var mimeType = 'image/' + ext
      var fileSize = file.size || 0

      cp('IMAGE_RECEIVED', {
        hasFile: true,
        fileName: fileName,
        mimeType: mimeType,
        size: fileSize,
      })
      $app
        .logger()
        .info(
          'UPLOAD_RECEIVED',
          'hasFile',
          true,
          'fileName',
          fileName,
          'mimeType',
          mimeType,
          'size',
          fileSize,
        )

      var mealId = ''
      var mealCreated = false
      try {
        var mealsCol = $app.findCollectionByNameOrId('meals')
        var mealRecord = new Record(mealsCol)
        mealRecord.set('patient_id', patient.id)
        mealRecord.set('name', mealName)
        mealRecord.set('timestamp', new Date().toISOString())
        mealRecord.set('analysis_status', 'pending')
        mealRecord.set('client_request_id', clientRequestId)
        $app.save(mealRecord)
        mealId = mealRecord.id
        mealCreated = true
        cp('MEAL_CREATED', { meal_id: mealId, patient_id: patient.id })
      } catch (mealErr) {
        cp('MEAL_CREATE_FAILED', { error: mealErr.message })
        return e.json(500, {
          code: 'MEAL_IMAGE_SAVE_FAILED',
          error: 'Erro ao criar registro da refeição. Tente novamente.',
        })
      }

      var mealPhotoId = ''
      var savedFilename = ''
      try {
        var photoCol = $app.findCollectionByNameOrId('meal_photos')
        var photo = new Record(photoCol)
        photo.set('meal_id', mealId)
        photo.set('image', file)
        $app.save(photo)
        mealPhotoId = photo.id
        savedFilename = photo.getString('image')
        cp('MEAL_PHOTO_CREATED', {
          meal_id: mealId,
          meal_photo_id: mealPhotoId,
          filename: savedFilename,
        })
      } catch (photoErr) {
        cp('MEAL_PHOTO_FAILED', { error: photoErr.message, meal_id: mealId })
        if (mealCreated) {
          try {
            var mealFail = $app.findRecordById('meals', mealId)
            mealFail.set('analysis_status', 'failed')
            $app.save(mealFail)
          } catch (_) {}
        }
        return e.json(500, {
          code: 'MEAL_IMAGE_SAVE_FAILED',
          error: 'Erro ao salvar a imagem. Verifique o arquivo e tente novamente.',
          details: photoErr.message,
        })
      }

      var fileExists = false
      var verifiedSize = 0
      try {
        var fsys = $app.newFilesystem()
        var fileKey = photo.baseFilesPath() + '/' + savedFilename
        fileExists = fsys.exists(fileKey)
        if (fileExists) {
          var reader = fsys.getReader(fileKey)
          var buf = new Uint8Array(8192)
          while (true) {
            var n = 0
            try {
              n = reader.read(buf)
            } catch (_) {
              break
            }
            if (!n || n <= 0) break
            verifiedSize += n
          }
          reader.close()
        }
        fsys.close()

        if (!fileExists || verifiedSize === 0) {
          throw new Error('File not confirmed in storage')
        }
        cp('FILE_CONFIRMED_IN_STORAGE', {
          meal_photo_id: mealPhotoId,
          file_exists: fileExists,
          file_size_bytes: verifiedSize,
          file_key: fileKey,
        })
      } catch (storageErr) {
        cp('STORAGE_CHECK_ERROR', { error: storageErr.message, meal_id: mealId })
        if (mealCreated) {
          try {
            var mealFailStatus = $app.findRecordById('meals', mealId)
            mealFailStatus.set('analysis_status', 'failed')
            $app.save(mealFailStatus)
          } catch (_) {}
        }
        return e.json(500, {
          code: 'MEAL_IMAGE_SAVE_FAILED',
          error: 'Erro na confirmação da imagem no storage.',
        })
      }

      try {
        var profCol = $app.findCollectionByNameOrId('analysis_profiling_logs')
        var profLog = new Record(profCol)
        profLog.set('request_id', clientRequestId)
        profLog.set('user_id', userId)
        profLog.set('meal_id', mealId)
        profLog.set('ts_request_received', new Date(t0).toISOString())
        profLog.set('model_used', 'fast')
        $app.save(profLog)
      } catch (profErr) {
        $app.logger().error('profiling_log_failed', 'error', profErr.message, 'meal_id', mealId)
      }

      var queueId = ''
      try {
        var queueCol = $app.findCollectionByNameOrId('meal_analysis_queue')
        var queueItem
        try {
          queueItem = $app.findFirstRecordByFilter(
            'meal_analysis_queue',
            "meal_id = '" + mealId + "'",
          )
          queueId = queueItem.id
        } catch (_) {
          var queueRecord = new Record(queueCol)
          queueRecord.set('meal_id', mealId)
          queueRecord.set('status', 'pending')
          queueRecord.set('attempts', 0)
          queueRecord.set('request_id', clientRequestId)
          $app.save(queueRecord)
          queueId = queueRecord.id
        }
        cp('QUEUE_JOB_CREATED', {
          meal_id: mealId,
          queue_id: queueId,
        })
      } catch (err) {
        cp('QUEUE_JOB_ERROR', { error: err.message })
      }

      cp('RESPONSE_SENT', {
        meal_id: mealId,
        request_id: clientRequestId,
        total_ms: new Date().getTime() - t0,
        queue_id: queueId,
      })

      return e.json(202, {
        request_id: clientRequestId,
        meal_id: mealId,
        status: 'pending',
        job_id: queueId,
      })
    } catch (err) {
      cp('UNEXPECTED_ERROR', { error: err.message })
      $app.logger().error('meal_analyze_submit_error', 'msg', err.message, 'request_id', requestId)
      return e.json(500, {
        code: 'MEAL_IMAGE_SAVE_FAILED',
        error: 'Erro ao processar refeição. Tente novamente.',
      })
    }
  },
  $apis.requireAuth(),
  $apis.bodyLimit(10 * 1024 * 1024),
)
