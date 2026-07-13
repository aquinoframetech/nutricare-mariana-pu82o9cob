onRecordAfterCreateSuccess((e) => {
  var meal = e.record
  var status = meal.getString('analysis_status')
  if (!status) {
    meal.set('analysis_status', 'pending')
    $app.save(meal)
  }

  var photos = []
  try {
    photos = $app.findRecordsByFilter(
      'meal_photos',
      "meal_id = '" + meal.id + "'",
      '-created',
      1,
      0,
    )
  } catch (_) {}

  if (photos.length === 0) {
    $app
      .logger()
      .info(
        'ON_MEAL_CREATE_SKIP_QUEUE',
        'meal_id',
        meal.id,
        'reason',
        'no photos yet — deferring queue creation to on_meal_photo_create',
      )
    return e.next()
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
    $app
      .logger()
      .info('ON_MEAL_CREATE_QUEUE_CREATED', 'meal_id', meal.id, 'queue_id', queueRecord.id)
  } catch (err) {
    $app.logger().error('on_meal_create queue error', 'msg', err.message)
  }

  return e.next()
}, 'meals')
