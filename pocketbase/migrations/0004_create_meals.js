migrate(
  (app) => {
    const patientsId = app.findCollectionByNameOrId('patients').id
    const collection = new Collection({
      name: 'meals',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      viewRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      createRule: "@request.auth.id != '' && patient_id.user_id = @request.auth.id",
      updateRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      deleteRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: patientsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'name', type: 'text' },
        { name: 'timestamp', type: 'date' },
        { name: 'ai_description', type: 'text' },
        { name: 'calories', type: 'number', onlyInt: true },
        { name: 'proteins', type: 'number', onlyInt: true },
        { name: 'carbs', type: 'number', onlyInt: true },
        { name: 'fats', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_meals_patient ON meals (patient_id)',
        'CREATE INDEX idx_meals_timestamp ON meals (timestamp)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('meals')
    app.delete(col)
  },
)
