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
      cp('AUTH_VALIDATED', { user_id: userId })

      var patient
      try {
        patient = $app.findFirstRecordByData('patients', 'user_id', userId)
      } catch (_) {
        cp('PATIENT_NOT_FOUND', { user_id: userId })
        return e.json(400, { error: 'Perfil de paciente não encontrado. Complete seu cadastro.' })
      }
      cp('PATIENT_RESOLVED', { user_id: userId, patient_id: patient.id })

      var uploadedFiles = e.findUploadedFiles('image')
      if (!uploadedFiles || uploadedFiles.length === 0) {
        cp('IMAGE_NOT_RECEIVED')
        return e.json(400, { error: 'Nenhuma imagem enviada. Selecione uma foto.' })
      }
      cp('IMAGE_RECEIVED', {
        file_count: uploadedFiles.length,
        file_name: uploadedFiles[0].name,
      })

      var body = e.requestInfo().body || {}
      var mealName = body.name || 'Refeição'
      var clientRequestId = body.client_request_id || requestId

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

      var mealId = ''
      var mealCreated = false
      try {
        var mealsCol = $app.findCollectionByNameOrId('meals')
        var meal = new Record(mealsCol)
        meal.set('patient_id', patient.id)
        meal.set('name', mealName)
        meal.set('timestamp', new Date().toISOString())
        meal.set('analysis_status', 'pending')
        meal.set('client_request_id', clientRequestId)
        $app.save(meal)
        mealId = meal.id
        mealCreated = true
        cp('MEAL_CREATED', { meal_id: mealId, patient_id: patient.id })
      } catch (mealErr) {
        cp('MEAL_CREATE_FAILED', { error: mealErr.message })
        return e.json(500, { error: 'Erro ao criar registro da refeição. Tente novamente.' })
      }

      var mealPhotoId = ''
      var savedFilename = ''
      try {
        var photoCol = $app.findCollectionByNameOrId('meal_photos')
        var photo = new Record(photoCol)
        photo.set('meal_id', mealId)
        photo.set('image', $filesystem.fileFromMultipart(uploadedFiles[0]))
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
            $app.delete($app.findRecordById('meals', mealId))
          } catch (_) {}
        }
        return e.json(500, {
          error: 'Erro ao salvar a imagem. Verifique o arquivo e tente novamente.',
        })
      }

      try {
        var fsys = $app.newFilesystem()
        var fileKey = photo.baseFilesPath() + '/' + savedFilename
        var fileExists = fsys.exists(fileKey)
        var fileSize = 0
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
            fileSize += n
          }
          reader.close()
        }
        fsys.close()
        cp('IMAGE_SAVED', {
          meal_photo_id: mealPhotoId,
          file_exists: fileExists,
          file_size_bytes: fileSize,
          file_key: fileKey,
        })
        if (!fileExists || fileSize === 0) {
          $app
            .logger()
            .error(
              'STORAGE_VERIFICATION_FAILED',
              'meal_id',
              mealId,
              'file_key',
              fileKey,
              'exists',
              fileExists,
              'size',
              fileSize,
            )
        }
      } catch (storageErr) {
        cp('STORAGE_CHECK_ERROR', { error: storageErr.message, meal_id: mealId })
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
        var queueItem = $app.findFirstRecordByFilter(
          'meal_analysis_queue',
          "meal_id = '" + mealId + "'",
        )
        queueId = queueItem.id
        cp('QUEUE_JOB_CREATED', {
          meal_id: mealId,
          queue_id: queueId,
          queue_status: queueItem.getString('status'),
        })
      } catch (_) {
        cp('QUEUE_JOB_NOT_FOUND', {
          meal_id: mealId,
          note: 'will be created by on_meal_photo_create hook',
        })
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
      return e.json(500, { error: 'Erro ao processar refeição. Tente novamente.' })
    }
  },
  $apis.requireAuth(),
  $apis.bodyLimit(10 * 1024 * 1024),
)
