migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const collection = new Collection({
      name: 'nutritionist_profiles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'bio', type: 'text' },
        { name: 'specialty', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_nutri_profiles_user ON nutritionist_profiles (user_id)'],
    })
    app.save(collection)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('nutritionist_profiles')
    app.delete(col)
  },
)
