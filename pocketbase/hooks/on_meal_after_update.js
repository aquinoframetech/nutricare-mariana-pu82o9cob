onRecordAfterUpdateSuccess((e) => {
  const meal = e.record

  var oldCalories = 0
  var newCalories = 0
  var oldProteins = 0
  var newProteins = 0
  var oldCarbs = 0
  var newCarbs = 0
  var oldFats = 0
  var newFats = 0

  try {
    oldCalories = meal.original().getInt('calories')
  } catch (_) {}
  try {
    newCalories = meal.getInt('calories')
  } catch (_) {}
  try {
    oldProteins = meal.original().getInt('proteins')
  } catch (_) {}
  try {
    newProteins = meal.getInt('proteins')
  } catch (_) {}
  try {
    oldCarbs = meal.original().getInt('carbs')
  } catch (_) {}
  try {
    newCarbs = meal.getInt('carbs')
  } catch (_) {}
  try {
    oldFats = meal.original().getInt('fats')
  } catch (_) {}
  try {
    newFats = meal.getInt('fats')
  } catch (_) {}

  var deltaCalories = newCalories - oldCalories
  var deltaProteins = newProteins - oldProteins
  var deltaCarbs = newCarbs - oldCarbs
  var deltaFats = newFats - oldFats

  if (deltaCalories === 0 && deltaProteins === 0 && deltaCarbs === 0 && deltaFats === 0) {
    return e.next()
  }

  var patientId = meal.getString('patient_id')
  if (!patientId) return e.next()

  var now = new Date()
  var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  try {
    var calorieLog
    try {
      calorieLog = $app.findFirstRecordByFilter(
        'calorie_logs',
        'patient_id = {:pid} && date >= {:since}',
        (pid = patientId),
        (since = startOfDay),
      )
      calorieLog.set('calories', calorieLog.getInt('calories') + deltaCalories)
      $app.save(calorieLog)
    } catch (_) {
      var col1 = $app.findCollectionByNameOrId('calorie_logs')
      calorieLog = new Record(col1)
      calorieLog.set('patient_id', patientId)
      calorieLog.set('date', new Date().toISOString())
      calorieLog.set('calories', deltaCalories)
      $app.save(calorieLog)
    }

    var macroLog
    try {
      macroLog = $app.findFirstRecordByFilter(
        'macro_logs',
        'patient_id = {:pid} && date >= {:since}',
        (pid = patientId),
        (since = startOfDay),
      )
      macroLog.set('proteins', macroLog.getInt('proteins') + deltaProteins)
      macroLog.set('carbs', macroLog.getInt('carbs') + deltaCarbs)
      macroLog.set('fats', macroLog.getInt('fats') + deltaFats)
      $app.save(macroLog)
    } catch (_) {
      var col2 = $app.findCollectionByNameOrId('macro_logs')
      macroLog = new Record(col2)
      macroLog.set('patient_id', patientId)
      macroLog.set('date', new Date().toISOString())
      macroLog.set('proteins', deltaProteins)
      macroLog.set('carbs', deltaCarbs)
      macroLog.set('fats', deltaFats)
      $app.save(macroLog)
    }
  } catch (err) {
    $app.logger().error('Error updating logs on meal update', 'error', err.message)
  }

  return e.next()
}, 'meals')
