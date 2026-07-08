migrate(
  (app) => {
    const mealsCol = app.findCollectionByNameOrId('meals')
    if (!mealsCol.fields.getByName('ai_food_identified')) {
      mealsCol.fields.add(new TextField({ name: 'ai_food_identified' }))
    }
    if (!mealsCol.fields.getByName('ai_confidence')) {
      mealsCol.fields.add(new NumberField({ name: 'ai_confidence' }))
    }
    if (!mealsCol.fields.getByName('calories_corrected')) {
      mealsCol.fields.add(new NumberField({ name: 'calories_corrected' }))
    }
    if (!mealsCol.fields.getByName('location')) {
      mealsCol.fields.add(new TextField({ name: 'location' }))
    }
    app.save(mealsCol)

    const usersId = '_pb_users_auth_'
    const patientsId = app.findCollectionByNameOrId('patients').id

    const accessLogs = new Collection({
      name: 'access_logs',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'user_id', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'target_patient_id', type: 'relation', collectionId: patientsId, maxSelect: 1 },
        { name: 'action', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_access_logs_user ON access_logs (user_id)',
        'CREATE INDEX idx_access_logs_patient ON access_logs (target_patient_id)',
      ],
    })
    app.save(accessLogs)

    const mealsId = app.findCollectionByNameOrId('meals').id
    const mealEditLogs = new Collection({
      name: 'meal_edit_logs',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'meal_id',
          type: 'relation',
          collectionId: mealsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'editor_id', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'previous_values', type: 'text' },
        { name: 'new_values', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_meal_edit_logs_meal ON meal_edit_logs (meal_id)'],
    })
    app.save(mealEditLogs)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('access_logs'))
    app.delete(app.findCollectionByNameOrId('meal_edit_logs'))
    const mealsCol = app.findCollectionByNameOrId('meals')
    var names = ['ai_food_identified', 'ai_confidence', 'calories_corrected', 'location']
    for (var i = 0; i < names.length; i++) {
      var f = mealsCol.fields.getByName(names[i])
      if (f) mealsCol.fields.remove(f)
    }
    app.save(mealsCol)
  },
)
