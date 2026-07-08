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
      alert.set(
        'message',
        'Refeição excede 50% do limite calórico diário (' +
          calories +
          ' kcal de ' +
          calorieGoal +
          ' kcal).',
      )
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
        'Refeição com baixo teor proteico (' +
          proteins +
          'g). Considere adicionar fontes de proteína.',
      )
      alert.set('is_read', false)
      $app.save(alert)
    }

    var mealTimestamp = meal.getString('timestamp')
    if (mealTimestamp) {
      try {
        var previousMeals = $app.findRecordsByFilter(
          'meals',
          'patient_id = {:pid} && timestamp < {:current}',
          '-timestamp',
          1,
          0,
          (pid = patientId),
          (current = mealTimestamp),
        )
        if (previousMeals.length > 0) {
          var prevTime = new Date(previousMeals[0].getString('timestamp'))
          var currTime = new Date(mealTimestamp)
          var gapHours = (currTime.getTime() - prevTime.getTime()) / 3600000
          if (gapHours > 8) {
            var prevHour = prevTime.getHours()
            if (prevHour >= 6 && prevHour <= 22) {
              var alertCol2 = $app.findCollectionByNameOrId('alerts')
              var fastAlert = new Record(alertCol2)
              fastAlert.set('patient_id', patientId)
              fastAlert.set('type', 'warning')
              fastAlert.set(
                'message',
                'Jejum prolongado detectado: ' + Math.round(gapHours) + ' horas entre refeições.',
              )
              fastAlert.set('is_read', false)
              $app.save(fastAlert)
            }
          }
        }
      } catch (_) {}
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

    try {
      var patient2 = $app.findRecordById('patients', patientId)
      var calorieGoal2 = patient2.getInt('calorie_goal')
      var totalCalories = calorieLog.getInt('calories')
      if (calorieGoal2 > 0 && totalCalories > calorieGoal2) {
        var alertCol3 = $app.findCollectionByNameOrId('alerts')
        var calAlert = new Record(alertCol3)
        calAlert.set('patient_id', patientId)
        calAlert.set('type', 'critical')
        calAlert.set(
          'message',
          'Calorias diárias ultrapassaram a meta: ' +
            totalCalories +
            ' kcal (meta: ' +
            calorieGoal2 +
            ' kcal).',
        )
        calAlert.set('is_read', false)
        $app.save(calAlert)
      }

      var weight = patient2.getInt('weight')
      if (weight > 0) {
        var proteinThreshold = weight * 0.8 * 0.5
        var totalProtein = macroLog.getInt('proteins')
        if (totalProtein > 0 && totalProtein < proteinThreshold) {
          var alertCol4 = $app.findCollectionByNameOrId('alerts')
          var protAlert = new Record(alertCol4)
          protAlert.set('patient_id', patientId)
          protAlert.set('type', 'warning')
          protAlert.set(
            'message',
            'Ingestão proteica diária baixa: ' +
              totalProtein +
              'g (mínimo estimado: ' +
              Math.round(proteinThreshold) +
              'g).',
          )
          protAlert.set('is_read', false)
          $app.save(protAlert)
        }
      }
    } catch (_) {}
  } catch (err) {
    $app.logger().error('Error updating logs', 'error', err.message)
  }

  return e.next()
}, 'meals')
