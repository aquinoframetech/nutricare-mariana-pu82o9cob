onRecordAfterUpdateSuccess((e) => {
  const meal = e.record
  const patientId = meal.getString('patient_id')

  var caloriesChanged = meal.getInt('calories') !== meal.original().getInt('calories')
  var proteinsChanged = meal.getInt('proteins') !== meal.original().getInt('proteins')
  var carbsChanged = meal.getInt('carbs') !== meal.original().getInt('carbs')
  var fatsChanged = meal.getInt('fats') !== meal.original().getInt('fats')

  if (!caloriesChanged && !proteinsChanged && !carbsChanged && !fatsChanged) {
    return e.next()
  }

  var timestamp = meal.getString('timestamp')
  if (!timestamp) return e.next()

  var mealDate = new Date(timestamp)
  var startOfDay = new Date(
    mealDate.getFullYear(),
    mealDate.getMonth(),
    mealDate.getDate(),
  ).toISOString()
  var endOfDay = new Date(
    mealDate.getFullYear(),
    mealDate.getMonth(),
    mealDate.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString()

  var dailyMeals = []
  try {
    dailyMeals = $app.findRecordsByFilter(
      'meals',
      'patient_id = {:pid} && timestamp >= {:start} && timestamp <= {:end}',
      'timestamp',
      0,
      0,
      (pid = patientId),
      (start = startOfDay),
      (end = endOfDay),
    )
  } catch (_) {}

  var totalCalories = 0
  var totalProteins = 0
  var totalCarbs = 0
  var totalFats = 0

  for (var i = 0; i < dailyMeals.length; i++) {
    totalCalories += dailyMeals[i].getInt('calories')
    totalProteins += dailyMeals[i].getInt('proteins')
    totalCarbs += dailyMeals[i].getInt('carbs')
    totalFats += dailyMeals[i].getInt('fats')
  }

  try {
    var calorieLog
    try {
      calorieLog = $app.findFirstRecordByFilter(
        'calorie_logs',
        'patient_id = {:pid} && date >= {:start} && date <= {:end}',
        (pid = patientId),
        (start = startOfDay),
        (end = endOfDay),
      )
      calorieLog.set('calories', totalCalories)
      $app.save(calorieLog)
    } catch (_) {
      var col1 = $app.findCollectionByNameOrId('calorie_logs')
      calorieLog = new Record(col1)
      calorieLog.set('patient_id', patientId)
      calorieLog.set('date', startOfDay)
      calorieLog.set('calories', totalCalories)
      $app.save(calorieLog)
    }
  } catch (err) {
    $app.logger().error('Error updating calorie log on meal update', 'error', err.message)
  }

  try {
    var macroLog
    try {
      macroLog = $app.findFirstRecordByFilter(
        'macro_logs',
        'patient_id = {:pid} && date >= {:start} && date <= {:end}',
        (pid = patientId),
        (start = startOfDay),
        (end = endOfDay),
      )
      macroLog.set('proteins', totalProteins)
      macroLog.set('carbs', totalCarbs)
      macroLog.set('fats', totalFats)
      $app.save(macroLog)
    } catch (_) {
      var col2 = $app.findCollectionByNameOrId('macro_logs')
      macroLog = new Record(col2)
      macroLog.set('patient_id', patientId)
      macroLog.set('date', startOfDay)
      macroLog.set('proteins', totalProteins)
      macroLog.set('carbs', totalCarbs)
      macroLog.set('fats', totalFats)
      $app.save(macroLog)
    }
  } catch (err) {
    $app.logger().error('Error updating macro log on meal update', 'error', err.message)
  }

  try {
    var patient = $app.findRecordById('patients', patientId)
    var calorieGoal = patient.getInt('calorie_goal')

    if (calorieGoal > 0 && totalCalories > calorieGoal) {
      var alertCol = $app.findCollectionByNameOrId('alerts')
      var alert = new Record(alertCol)
      alert.set('patient_id', patientId)
      alert.set('type', 'critical')
      alert.set(
        'message',
        'Calorias diárias ultrapassaram a meta: ' +
          totalCalories +
          ' kcal (meta: ' +
          calorieGoal +
          ' kcal).',
      )
      alert.set('is_read', false)
      $app.save(alert)
    }

    var weight = patient.getInt('weight')
    if (weight > 0 && totalProteins > 0) {
      var proteinThreshold = weight * 0.8 * 0.5
      if (totalProteins < proteinThreshold) {
        var alertCol2 = $app.findCollectionByNameOrId('alerts')
        var protAlert = new Record(alertCol2)
        protAlert.set('patient_id', patientId)
        protAlert.set('type', 'warning')
        protAlert.set(
          'message',
          'Ingestão proteica diária baixa: ' +
            totalProteins +
            'g (mínimo estimado: ' +
            Math.round(proteinThreshold) +
            'g).',
        )
        protAlert.set('is_read', false)
        $app.save(protAlert)
      }
    }
  } catch (err) {
    $app.logger().error('Error checking alerts after meal update', 'error', err.message)
  }

  return e.next()
}, 'meals')
