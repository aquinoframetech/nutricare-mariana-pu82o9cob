onRecordAfterCreateSuccess((e) => {
  const meal = e.record
  const patientId = meal.getString('patient_id')
  const calories = meal.getInt('calories')
  const proteins = meal.getInt('proteins')
  const carbs = meal.getInt('carbs')
  const fats = meal.getInt('fats')

  try {
    const patient = $app.findRecordById('patients', patientId)
    const calorieGoal = patient.getInt('calorie_goal')

    if (calorieGoal > 0 && calories > calorieGoal * 0.5) {
      const alertCol = $app.findCollectionByNameOrId('alerts')
      const alert = new Record(alertCol)
      alert.set('patient_id', patientId)
      alert.set('type', 'critical')
      alert.set('message', 'Refeicao excede 50% do limite calorico diario.')
      alert.set('is_read', false)
      $app.save(alert)
    }

    if (proteins > 0 && proteins < 10) {
      const alertCol = $app.findCollectionByNameOrId('alerts')
      const alert = new Record(alertCol)
      alert.set('patient_id', patientId)
      alert.set('type', 'warning')
      alert.set(
        'message',
        'Refeicao com baixo teor proteico. Considere adicionar fontes de proteina.',
      )
      alert.set('is_read', false)
      $app.save(alert)
    }
  } catch (err) {
    $app.logger().error('Error generating alert', 'error', err.message)
  }

  try {
    var now = new Date()
    var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    var calorieLog
    try {
      calorieLog = $app.findFirstRecordByFilter(
        'calorie_logs',
        'patient_id = {:pid} && date >= {:since}',
        (pid = patientId),
        (since = startOfDay),
      )
      calorieLog.set('calories', calorieLog.getInt('calories') + calories)
      $app.save(calorieLog)
    } catch (_) {
      var col1 = $app.findCollectionByNameOrId('calorie_logs')
      calorieLog = new Record(col1)
      calorieLog.set('patient_id', patientId)
      calorieLog.set('date', new Date().toISOString())
      calorieLog.set('calories', calories)
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
      macroLog.set('proteins', macroLog.getInt('proteins') + proteins)
      macroLog.set('carbs', macroLog.getInt('carbs') + carbs)
      macroLog.set('fats', macroLog.getInt('fats') + fats)
      $app.save(macroLog)
    } catch (_) {
      var col2 = $app.findCollectionByNameOrId('macro_logs')
      macroLog = new Record(col2)
      macroLog.set('patient_id', patientId)
      macroLog.set('date', new Date().toISOString())
      macroLog.set('proteins', proteins)
      macroLog.set('carbs', carbs)
      macroLog.set('fats', fats)
      $app.save(macroLog)
    }
  } catch (err) {
    $app.logger().error('Error updating logs', 'error', err.message)
  }

  return e.next()
}, 'meals')
