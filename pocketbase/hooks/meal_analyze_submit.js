routerAdd(
  'POST',
  '/backend/v1/meals/analyze',
  (e) => {
    try {
      var userId = e.auth ? e.auth.id : ''
      if (!userId) {
        return e.json(401, { error: 'Sessão expirada. Faça login novamente.' })
      }

      var patient
      try {
        patient = $app.findFirstRecordByData('patients', 'user_id', userId)
      } catch (_) {
        return e.json(400, { error: 'Perfil de paciente não encontrado. Complete seu cadastro.' })
      }

      var uploadedFiles = e.findUploadedFiles('image')
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return e.json(400, { error: 'Nenhuma imagem enviada. Selecione uma foto.' })
      }

      var body = e.requestInfo().body || {}
      var mealName = body.name || 'Refeição'
      var clientRequestId = body.client_request_id || 'REQ_' + $security.randomString(16)
      var tsRequestReceived = new Date().toISOString()

      try {
        var existing = $app.findFirstRecordByData('meals', 'client_request_id', clientRequestId)
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
      } catch (mealErr) {
        $app
          .logger()
          .error('Failed to create meal record', 'error', mealErr.message, 'user_id', userId)
        return e.json(500, { error: 'Erro ao criar registro da refeição. Tente novamente.' })
      }

      try {
        var photoCol = $app.findCollectionByNameOrId('meal_photos')
        var photo = new Record(photoCol)
        photo.set('meal_id', mealId)
        photo.set('image', $filesystem.fileFromMultipart(uploadedFiles[0]))
        $app.save(photo)
      } catch (photoErr) {
        $app
          .logger()
          .error('Failed to create meal photo', 'error', photoErr.message, 'meal_id', mealId)
        if (mealCreated) {
          try {
            var mealToDelete = $app.findRecordById('meals', mealId)
            $app.delete(mealToDelete)
          } catch (_) {}
        }
        return e.json(500, {
          error: 'Erro ao salvar a imagem. Verifique o arquivo e tente novamente.',
        })
      }

      try {
        var profCol = $app.findCollectionByNameOrId('analysis_profiling_logs')
        var profLog = new Record(profCol)
        profLog.set('request_id', clientRequestId)
        profLog.set('user_id', userId)
        profLog.set('meal_id', mealId)
        profLog.set('ts_request_received', tsRequestReceived)
        profLog.set('model_used', 'fast')
        $app.save(profLog)
      } catch (profErr) {
        $app.logger().error('Failed to create initial profiling log', 'error', profErr.message)
      }

      return e.json(202, {
        request_id: clientRequestId,
        meal_id: mealId,
        status: 'pending',
        job_id: '',
      })
    } catch (err) {
      $app.logger().error('meal_analyze_submit error', 'msg', err.message)
      return e.json(500, { error: 'Erro ao processar refeição. Tente novamente.' })
    }
  },
  $apis.requireAuth(),
  $apis.bodyLimit(10 * 1024 * 1024),
)
