routerAdd(
  'POST',
  '/backend/v1/meals/retry',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const mealId = body.meal_id
      if (!mealId) {
        return e.badRequestError('meal_id is required')
      }

      const meal = $app.findRecordById('meals', mealId)
      meal.set('analysis_status', 'pending')
      $app.save(meal)

      try {
        const queueRecord = $app.findFirstRecordByData('meal_analysis_queue', 'meal_id', mealId)
        queueRecord.set('status', 'pending')
        queueRecord.set('attempts', 0)
        queueRecord.set('error_sanitized', '')
        $app.save(queueRecord)
      } catch (_) {
        const queueCol = $app.findCollectionByNameOrId('meal_analysis_queue')
        const newQueue = new Record(queueCol)
        newQueue.set('meal_id', mealId)
        newQueue.set('status', 'pending')
        newQueue.set('attempts', 0)
        newQueue.set('request_id', 'REQ_' + $security.randomString(8))
        $app.save(newQueue)
      }

      return e.json(200, { success: true })
    } catch (err) {
      $app.logger().error('meal_analysis_retry error', 'msg', err.message)
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)
