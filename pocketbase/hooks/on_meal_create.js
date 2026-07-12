onRecordAfterCreateSuccess((e) => {
  var meal = e.record
  var status = meal.getString('analysis_status')
  if (!status) {
    meal.set('analysis_status', 'pending')
    $app.save(meal)
  }

  try {
    var queueCol = $app.findCollectionByNameOrId('meal_analysis_queue')
    var queueRecord = new Record(queueCol)
    queueRecord.set('meal_id', meal.id)
    queueRecord.set('status', 'pending')
    queueRecord.set('attempts', 0)
    queueRecord.set(
      'request_id',
      meal.getString('client_request_id') || 'REQ_' + $security.randomString(8),
    )
    $app.save(queueRecord)
  } catch (err) {
    $app.logger().error('on_meal_create queue error', 'msg', err.message)
  }

  return e.next()
}, 'meals')
