routerAdd(
  'POST',
  '/backend/v1/meals/analyze',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : ''
      if (!userId) {
        return e.json(401, { error: 'Sessão expirada. Faça login novamente.' })
      }

      let patient
      try {
        patient = $app.findFirstRecordByData('patients', 'user_id', userId)
      } catch (_) {
        return e.json(400, { error: 'Perfil de paciente não encontrado. Complete seu cadastro.' })
      }

      const uploadedFiles = e.findUploadedFiles('image')
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return e.json(400, { error: 'Nenhuma imagem enviada. Selecione uma foto.' })
      }

      const body = e.requestInfo().body || {}
      const mealName = body.name || 'Refeição'
      const clientRequestId = body.client_request_id || ''

      if (clientRequestId) {
        try {
          const existing = $app.findFirstRecordByData('meals', 'client_request_id', clientRequestId)
          return e.json(200, {
            request_id: existing.id,
            meal_id: existing.id,
            status: existing.getString('analysis_status'),
            job_id: '',
          })
        } catch (_) {}
      }

      var mealId = ''
      var mealCreated = false

      try {
        var mealsCol = $app.findCollectionByNameOrId('meals')
        var meal = new Record(mealsCol)
        meal.set('patient_id', patient.id)
        meal.set('name', mealName)
        meal.set('timestamp', new Date().toISOString())
        meal.set('analysis_status', 'pending')
        if (clientRequestId) {
          meal.set('client_request_id', clientRequestId)
        }
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
        var fileObj = $filesystem.fileFromMultipart(uploadedFiles[0])
        photo.set('image', fileObj)
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

      return e.json(200, {
        request_id: mealId,
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
