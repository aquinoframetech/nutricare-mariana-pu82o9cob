migrate(
  (app) => {
    const mealsCol = app.findCollectionByNameOrId('meals')

    if (!mealsCol.fields.getByName('ai_raw_response')) {
      mealsCol.fields.add(new JSONField({ name: 'ai_raw_response' }))
    }
    if (!mealsCol.fields.getByName('ai_estimated_values')) {
      mealsCol.fields.add(new JSONField({ name: 'ai_estimated_values' }))
    }
    if (!mealsCol.fields.getByName('patient_confirmed_values')) {
      mealsCol.fields.add(new JSONField({ name: 'patient_confirmed_values' }))
    }
    if (!mealsCol.fields.getByName('nutritionist_corrected_values')) {
      mealsCol.fields.add(new JSONField({ name: 'nutritionist_corrected_values' }))
    }
    if (!mealsCol.fields.getByName('analysis_status')) {
      mealsCol.fields.add(
        new SelectField({
          name: 'analysis_status',
          values: [
            'pending',
            'processing',
            'awaiting_confirmation',
            'confirmed',
            'professionally_corrected',
            'failed',
          ],
          maxSelect: 1,
        }),
      )
    }
    if (!mealsCol.fields.getByName('analyzed_at')) {
      mealsCol.fields.add(new DateField({ name: 'analyzed_at' }))
    }
    if (!mealsCol.fields.getByName('confirmed_at')) {
      mealsCol.fields.add(new DateField({ name: 'confirmed_at' }))
    }
    if (!mealsCol.fields.getByName('corrected_at')) {
      mealsCol.fields.add(new DateField({ name: 'corrected_at' }))
    }
    if (!mealsCol.fields.getByName('ai_model')) {
      mealsCol.fields.add(new TextField({ name: 'ai_model' }))
    }
    if (!mealsCol.fields.getByName('analysis_version')) {
      mealsCol.fields.add(new TextField({ name: 'analysis_version' }))
    }
    app.save(mealsCol)

    const logCol = app.findCollectionByNameOrId('chatgpt_analysis_logs')
    if (!logCol.fields.getByName('tokens_input')) {
      logCol.fields.add(new NumberField({ name: 'tokens_input' }))
    }
    if (!logCol.fields.getByName('tokens_output')) {
      logCol.fields.add(new NumberField({ name: 'tokens_output' }))
    }
    if (!logCol.fields.getByName('image_size_kb')) {
      logCol.fields.add(new NumberField({ name: 'image_size_kb' }))
    }
    if (!logCol.fields.getByName('meal_id')) {
      logCol.fields.add(
        new RelationField({ name: 'meal_id', collectionId: mealsCol.id, maxSelect: 1 }),
      )
    }
    app.save(logCol)
  },
  (app) => {
    const mealsCol = app.findCollectionByNameOrId('meals')
    var mealFields = [
      'ai_raw_response',
      'ai_estimated_values',
      'patient_confirmed_values',
      'nutritionist_corrected_values',
      'analysis_status',
      'analyzed_at',
      'confirmed_at',
      'corrected_at',
      'ai_model',
      'analysis_version',
    ]
    for (var i = 0; i < mealFields.length; i++) {
      var f = mealsCol.fields.getByName(mealFields[i])
      if (f) mealsCol.fields.remove(f)
    }
    app.save(mealsCol)

    const logCol = app.findCollectionByNameOrId('chatgpt_analysis_logs')
    var logFields = ['tokens_input', 'tokens_output', 'image_size_kb', 'meal_id']
    for (var j = 0; j < logFields.length; j++) {
      var f2 = logCol.fields.getByName(logFields[j])
      if (f2) logCol.fields.remove(f2)
    }
    app.save(logCol)
  },
)
