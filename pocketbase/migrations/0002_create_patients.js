migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const collection = new Collection({
      name: 'patients',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      viewRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'age', type: 'number', onlyInt: true },
        { name: 'weight', type: 'number' },
        { name: 'height', type: 'number' },
        { name: 'goal', type: 'text' },
        { name: 'condition', type: 'text' },
        { name: 'restrictions', type: 'text' },
        { name: 'allergies', type: 'text' },
        { name: 'medical_notes', type: 'text' },
        { name: 'calorie_goal', type: 'number', onlyInt: true },
        { name: 'nutritionist_id', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_patients_user ON patients (user_id)',
        'CREATE INDEX idx_patients_nutri ON patients (nutritionist_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('patients')
    app.delete(col)
  },
)
