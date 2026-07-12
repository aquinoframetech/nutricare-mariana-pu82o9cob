onRecordAfterUpdateSuccess((e) => {
  const meal = e.record

  var oldStatus = ''
  var newStatus = ''
  try {
    oldStatus = meal.original().getString('analysis_status')
  } catch (_) {}
  try {
    newStatus = meal.getString('analysis_status')
  } catch (_) {}

  if (newStatus !== 'confirmed' && newStatus !== 'professionally_corrected') return e.next()

  var wasConfirmed = oldStatus === 'confirmed' || oldStatus === 'professionally_corrected'
  var patientId = meal.getString('patient_id')
  if (!patientId) return e.next()

  var newCalories = meal.getInt('calories')
  var newProteins = meal.getInt('proteins')
  var newCarbs = meal.getInt('carbs')
  var newFats = meal.getInt('fats')

  var dCal = newCalories,
    dProt = newProteins,
    dCarb = newCarbs,
    dFat = newFats

  if (wasConfirmed) {
    var oldCal = 0,
      oldProt = 0,
      oldCarb = 0,
      oldFat = 0
    try {
      oldCal = meal.original().getInt('calories')
    } catch (_) {}
    try {
      oldProt = meal.original().getInt('proteins')
    } catch (_) {}
    try {
      oldCarb = meal.original().getInt('carbs')
    } catch (_) {}
    try {
      oldFat = meal.original().getInt('fats')
    } catch (_) {}
    dCal = newCalories - oldCal
    dProt = newProteins - oldProt
    dCarb = newCarbs - oldCarb
    dFat = newFats - oldFat
    if (dCal === 0 && dProt === 0 && dCarb === 0 && dFat === 0) return e.next()
  }

  var now = new Date()
  var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  var calorieLog = null,
    macroLog = null

  try {
    try {
      calorieLog = $app.findFirstRecordByFilter(
        'calorie_logs',
        "patient_id = '" + patientId + "' && date >= '" + startOfDay + "'",
      )
      calorieLog.set('calories', calorieLog.getInt('calories') + dCal)
      $app.save(calorieLog)
    } catch (_) {
      var col1 = $app.findCollectionByNameOrId('calorie_logs')
      calorieLog = new Record(col1)
      calorieLog.set('patient_id', patientId)
      calorieLog.set('date', new Date().toISOString())
      calorieLog.set('calories', dCal)
      $app.save(calorieLog)
    }
    try {
      macroLog = $app.findFirstRecordByFilter(
        'macro_logs',
        "patient_id = '" + patientId + "' && date >= '" + startOfDay + "'",
      )
      macroLog.set('proteins', macroLog.getInt('proteins') + dProt)
      macroLog.set('carbs', macroLog.getInt('carbs') + dCarb)
      macroLog.set('fats', macroLog.getInt('fats') + dFat)
      $app.save(macroLog)
    } catch (_) {
      var col2 = $app.findCollectionByNameOrId('macro_logs')
      macroLog = new Record(col2)
      macroLog.set('patient_id', patientId)
      macroLog.set('date', new Date().toISOString())
      macroLog.set('proteins', dProt)
      macroLog.set('carbs', dCarb)
      macroLog.set('fats', dFat)
      $app.save(macroLog)
    }
  } catch (err) {
    $app.logger().error('Error updating logs on confirmation', 'error', err.message)
  }

  if (!wasConfirmed) {
    try {
      var patient = $app.findRecordById('patients', patientId)
      var calorieGoal = patient.getInt('calorie_goal')

      if (calorieGoal > 0 && newCalories > calorieGoal * 0.5) {
        var ac1 = $app.findCollectionByNameOrId('alerts')
        var a1 = new Record(ac1)
        a1.set('patient_id', patientId)
        a1.set('type', 'critical')
        a1.set(
          'message',
          'Refeição estimada excede 50% do limite calórico diário (' +
            newCalories +
            ' kcal de ' +
            calorieGoal +
            ' kcal).',
        )
        a1.set('is_read', false)
        $app.save(a1)
      }
      if (newProteins > 0 && newProteins < 10) {
        var ac2 = $app.findCollectionByNameOrId('alerts')
        var a2 = new Record(ac2)
        a2.set('patient_id', patientId)
        a2.set('type', 'warning')
        a2.set('message', 'Refeição com baixo teor proteico estimado (' + newProteins + 'g).')
        a2.set('is_read', false)
        $app.save(a2)
      }
      var mealTs = meal.getString('timestamp')
      if (mealTs) {
        try {
          var prev = $app.findRecordsByFilter(
            'meals',
            "patient_id = '" + patientId + "' && timestamp < '" + mealTs + "'",
            '-timestamp',
            1,
            0,
          )
          if (prev.length > 0) {
            var pt = new Date(prev[0].getString('timestamp'))
            var ct = new Date(mealTs)
            var gap = (ct.getTime() - pt.getTime()) / 3600000
            if (gap > 8 && pt.getHours() >= 6 && pt.getHours() <= 22) {
              var ac3 = $app.findCollectionByNameOrId('alerts')
              var a3 = new Record(ac3)
              a3.set('patient_id', patientId)
              a3.set('type', 'warning')
              a3.set(
                'message',
                'Jejum prolongado detectado: ' + Math.round(gap) + ' horas entre refeições.',
              )
              a3.set('is_read', false)
              $app.save(a3)
            }
          }
        } catch (_) {}
      }
      if (calorieLog && calorieGoal > 0 && calorieLog.getInt('calories') > calorieGoal) {
        var ac4 = $app.findCollectionByNameOrId('alerts')
        var a4 = new Record(ac4)
        a4.set('patient_id', patientId)
        a4.set('type', 'critical')
        a4.set(
          'message',
          'Calorias diárias ultrapassaram a meta: ' +
            calorieLog.getInt('calories') +
            ' kcal (meta: ' +
            calorieGoal +
            ' kcal).',
        )
        a4.set('is_read', false)
        $app.save(a4)
      }
      if (macroLog) {
        var weight = patient.getInt('weight')
        if (weight > 0) {
          var protThr = weight * 0.8 * 0.5
          var totProt = macroLog.getInt('proteins')
          if (totProt > 0 && totProt < protThr) {
            var ac5 = $app.findCollectionByNameOrId('alerts')
            var a5 = new Record(ac5)
            a5.set('patient_id', patientId)
            a5.set('type', 'warning')
            a5.set(
              'message',
              'Ingestão proteica diária baixa: ' +
                totProt +
                'g (mínimo estimado: ' +
                Math.round(protThr) +
                'g).',
            )
            a5.set('is_read', false)
            $app.save(a5)
          }
        }
      }
    } catch (err) {
      $app.logger().error('Error generating alerts', 'error', err.message)
    }
  }
  return e.next()
}, 'meals')
