routerAdd(
  'POST',
  '/backend/v1/meals/analyze',
  (e) => {
    const requestId = $security.randomString(32)
    const body = e.requestInfo().body || {}
    const userId = e.auth ? e.auth.id : ''

    $app
      .logger()
      .info('meal_upload.request_received', 'request_id', requestId, 'user_id', userId || '')

    if (!userId) return e.unauthorizedError('auth required')

    var patient
    try {
      patient = $app.findFirstRecordByFilter('patients', "user_id = '" + userId + "'")
    } catch (_) {
      return e.badRequestError('Perfil de paciente não encontrado')
    }

    $app
      .logger()
      .info('meal_upload.auth_validated', 'request_id', requestId, 'patient_id', patient.id)

    const files = e.findUploadedFiles('image')
    if (!files || files.length === 0) {
      return e.badRequestError('Imagem é obrigatória')
    }
    const fh = files[0]
    const ext = (fh.name || '').split('.').pop().toLowerCase()
    if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png' && ext !== 'webp') {
      return e.badRequestError('Formato inválido. Use JPEG, PNG ou WebP.')
    }
    if (fh.size > 5242880) {
      return e.badRequestError('Imagem muito grande. Máximo 5MB.')
    }

    var clientRequestId = body.client_request_id || ''
    if (clientRequestId) {
      try {
        var existingMeal = $app.findFirstRecordByFilter(
          'meals',
          "client_request_id = '" + clientRequestId + "'",
        )
        var existingJobId = ''
        try {
          var existingJob = $app.findFirstRecordByFilter(
            'meal_analysis_queue',
            "meal_id = '" + existingMeal.id + "'",
          )
          existingJobId = existingJob.id
        } catch (_) {}
        $app
          .logger()
          .info(
            'meal_upload.idempotent_match',
            'request_id',
            requestId,
            'meal_id',
            existingMeal.id,
            'client_request_id',
            clientRequestId,
          )
        return e.json(202, {
          request_id: requestId,
          meal_id: existingMeal.id,
          job_id: existingJobId,
          status: existingMeal.getString('analysis_status'),
          idempotent: true,
        })
      } catch (_) {}
    }

    var mealName = body.name || body.description || 'Refeição'
    var mealId = ''
    var jobId = ''

    try {
      $app.runInTransaction(function (txApp) {
        try {
          var mealsCol = txApp.findCollectionByNameOrId('meals')
          var meal = new Record(mealsCol)
          meal.set('patient_id', patient.id)
          meal.set('name', mealName)
          meal.set('timestamp', new Date().toISOString())
          meal.set('analysis_status', 'processing')
          if (clientRequestId) meal.set('client_request_id', clientRequestId)
          txApp.save(meal)
          mealId = meal.id

          $app.logger().info('meal_upload.meal_created', 'request_id', requestId, 'meal_id', mealId)
        } catch (eMeal) {
          throw new Error('[meal_analyze_submit.js] line 60 (meal.create): ' + eMeal.message)
        }

        try {
          var queueCol = txApp.findCollectionByNameOrId('meal_analysis_queue')
          var job = new Record(queueCol)
          job.set('request_id', requestId)
          job.set('meal_id', mealId)
          job.set('status', 'pending')
          job.set('attempts', 0)
          // Fixed bug: Using `save()` instead of `saveNoValidate()` guarantees that PocketBase correctly
          // populates required lifecycle hooks such as `id`, `created`, and `updated` timestamps.
          txApp.save(job)
          jobId = job.id

          $app
            .logger()
            .info('meal_upload.queue_job_created', 'request_id', requestId, 'job_id', jobId)
        } catch (eJob) {
          throw new Error(
            '[meal_analyze_submit.js] line 83 (meal_analysis_queue.create): ' + eJob.message,
          )
        }
      })

      $app
        .logger()
        .info(
          'meal_upload.transaction_committed',
          'request_id',
          requestId,
          'meal_id',
          mealId,
          'job_id',
          jobId,
        )

      try {
        // Run safely outside the atomic transaction block as File Uploads are natively blocked from being executed
        // inside `runInTransaction`. This was causing the transaction to throw without saving the records.
        var photosCol = $app.findCollectionByNameOrId('meal_photos')
        var photo = new Record(photosCol)
        photo.set('meal_id', mealId)
        photo.set('image', $filesystem.fileFromMultipart(fh))
        $app.save(photo)

        $app.logger().info('meal_upload.file_stored', 'request_id', requestId, 'meal_id', mealId)
      } catch (ePhoto) {
        $app
          .logger()
          .error('meal_upload.file_store_failed', 'meal_id', mealId, 'error', ePhoto.message)
      }

      return e.json(202, {
        request_id: requestId,
        meal_id: mealId,
        job_id: jobId,
        status: 'processing',
      })
    } catch (err) {
      var rawError = String(err.stack || err)
      $app
        .logger()
        .error(
          'MEAL_JOB_CREATE_FAILED',
          'request_id',
          requestId,
          'error',
          err.message,
          'raw_error',
          rawError,
        )
      return e.json(500, {
        error: 'MEAL_JOB_CREATE_FAILED',
        request_id: requestId,
        internal_error_code: err.message,
      })
    }
  },
  $apis.requireAuth(),
  $apis.bodyLimit(10485760),
)
