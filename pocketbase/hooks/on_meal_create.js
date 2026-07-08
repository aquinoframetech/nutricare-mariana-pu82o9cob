onRecordAfterCreateSuccess((e) => {
  const meal = e.record
  const patientId = meal.getString('patient_id')
  const calories = meal.getInt('calories')

  try {
    const patient = $app.findRecordById('patients', patientId)
    const calorieGoal = patient.getInt('calorie_goal')

    if (calorieGoal > 0 && calories > calorieGoal * 0.5) {
      const alertCol = $app.findCollectionByNameOrId('alerts')
      const alert = new Record(alertCol)
      alert.set('patient_id', patientId)
      alert.set('type', 'critical')
      alert.set('message', 'Refeição excede 50% do limite calórico diário.')
      alert.set('is_read', false)
      $app.save(alert)
    }

    const proteins = meal.getInt('proteins')
    if (proteins > 0 && proteins < 10) {
      const alertCol = $app.findCollectionByNameOrId('alerts')
      const alert = new Record(alertCol)
      alert.set('patient_id', patientId)
      alert.set('type', 'warning')
      alert.set(
        'message',
        'Refeição com baixo teor proteico detectado. Considere adicionar fontes de proteína.',
      )
      alert.set('is_read', false)
      $app.save(alert)
    }
  } catch (err) {
    $app.logger().error('Error generating alert', 'error', err.message)
  }

  return e.next()
}, 'meals')
