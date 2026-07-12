onRecordUpdateRequest((e) => {
  const meal = e.record
  var fieldsToTrack = [
    'name',
    'calories',
    'proteins',
    'carbs',
    'fats',
    'fibers',
    'sodium',
    'ai_description',
    'calories_corrected',
    'location',
    'ai_food_identified',
    'ai_confidence',
    'ai_notes',
    'analysis_status',
    'patient_confirmed_values',
    'nutritionist_corrected_values',
    'ai_model',
    'analysis_version',
  ]

  var previousValues = {}
  var newValues = {}
  var hasChanges = false

  for (var i = 0; i < fieldsToTrack.length; i++) {
    var field = fieldsToTrack[i]
    var prev = meal.original().get(field)
    var next = meal.get(field)
    if (prev !== next) {
      previousValues[field] = prev
      newValues[field] = next
      hasChanges = true
    }
  }

  e.next()

  if (hasChanges) {
    try {
      var logCol = $app.findCollectionByNameOrId('meal_edit_logs')
      var log = new Record(logCol)
      log.set('meal_id', meal.id)
      log.set('editor_id', e.auth ? e.auth.id : '')
      log.set('previous_values', JSON.stringify(previousValues))
      log.set('new_values', JSON.stringify(newValues))
      $app.saveNoValidate(log)
    } catch (err) {
      $app.logger().error('Error logging meal edit', 'error', err.message)
    }
  }
}, 'meals')
