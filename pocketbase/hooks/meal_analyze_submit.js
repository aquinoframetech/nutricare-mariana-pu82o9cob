routerAdd(
  'POST',
  '/backend/v1/meals/analyze',
  (e) => {
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

      const queueCol = $app.findCollectionByNameOrId('meal_analysis_queue')
      const queueRecord = new Record(queueCol)
      queueRecord.set('meal_id', mealId)
      queueRecord.set('status', 'pending')
      queueRecord.set('attempts', 0)
      queueRecord.set('request_id', 'REQ_' + $security.randomString(8))

      $app.save(queueRecord)

      meal.set('analysis_status', 'pending')
      $app.save(meal)

      return e.json(200, { success: true, queue_id: queueRecord.id })
    } catch (err) {
      $app.logger().error('meal_analyze_submit error', 'msg', err.message)
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)
