onRecordAfterCreateSuccess((e) => {
  const photo = e.record
  const mealId = photo.getString('meal_id')
  const filename = photo.getString('image')
  if (!mealId || !filename) return e.next()

  try {
    const meal = $app.findRecordById('meals', mealId)
    var currentStatus = meal.getString('analysis_status')

    if (
      currentStatus === 'awaiting_confirmation' ||
      currentStatus === 'confirmed' ||
      currentStatus === 'professionally_corrected'
    ) {
      return e.next()
    }

    if (currentStatus !== 'processing') {
      meal.set('analysis_status', 'processing')
      $app.save(meal)
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
  } catch (err) {
    $app.logger().error('Failed to enqueue meal analysis', 'error', err.message, 'meal_id', mealId)
    try {
      var mealFail = $app.findRecordById('meals', mealId)
      mealFail.set('analysis_status', 'failed')
      $app.save(mealFail)
    } catch (_) {}
  }
  return e.next()
}, 'meal_photos')
