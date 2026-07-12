routerAdd(
  'POST',
  '/backend/v1/meals/{mealId}/retry',
  (e) => {
    const mealId = e.request.pathValue('mealId')
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var meal
    try {
      meal = $app.findRecordById('meals', mealId)
    } catch (_) {
      return e.notFoundError('meal not found')
    }

    var patientId = meal.getString('patient_id')
    try {
      var patient = $app.findRecordById('patients', patientId)
      if (patient.getString('user_id') !== userId) {
        return e.forbiddenError('not authorized')
      }
    } catch (_) {
      return e.forbiddenError('not authorized')
    }

    var requestId = $security.randomString(32)
    try {
      var existingJob = $app.findFirstRecordByFilter(
        'meal_analysis_queue',
        "meal_id = '" + mealId + "'",
      )
      existingJob.set('status', 'pending')
      existingJob.set('attempts', 0)
      existingJob.set('error_sanitized', '')
      existingJob.set('locked_at', '')
      existingJob.set('locked_by', '')
      existingJob.set('next_retry_at', '')
      existingJob.set('started_at', '')
      existingJob.set('finished_at', '')
      existingJob.set('request_id', requestId)
      $app.saveNoValidate(existingJob)
    } catch (_) {
      var queueCol = $app.findCollectionByNameOrId('meal_analysis_queue')
      var job = new Record(queueCol)
      job.set('request_id', requestId)
      job.set('meal_id', mealId)
      job.set('status', 'pending')
      job.set('attempts', 0)
      $app.saveNoValidate(job)
    }

    meal.set('analysis_status', 'processing')
    $app.save(meal)

    return e.json(202, { meal_id: mealId, status: 'processing' })
  },
  $apis.requireAuth(),
)
