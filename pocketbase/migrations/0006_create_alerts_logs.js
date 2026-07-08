migrate(
  (app) => {
    const patientsId = app.findCollectionByNameOrId('patients').id

    const alerts = new Collection({
      name: 'alerts',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      viewRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: patientsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'type', type: 'text' },
        { name: 'message', type: 'text' },
        { name: 'is_read', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_alerts_patient ON alerts (patient_id)'],
    })
    app.save(alerts)

    const calorieLogs = new Collection({
      name: 'calorie_logs',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      viewRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: patientsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'calories', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_calorie_logs_patient_date ON calorie_logs (patient_id, date)'],
    })
    app.save(calorieLogs)

    const macroLogs = new Collection({
      name: 'macro_logs',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      viewRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: patientsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'proteins', type: 'number', onlyInt: true },
        { name: 'carbs', type: 'number', onlyInt: true },
        { name: 'fats', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_macro_logs_patient_date ON macro_logs (patient_id, date)'],
    })
    app.save(macroLogs)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('alerts'))
    app.delete(app.findCollectionByNameOrId('calorie_logs'))
    app.delete(app.findCollectionByNameOrId('macro_logs'))
  },
)
