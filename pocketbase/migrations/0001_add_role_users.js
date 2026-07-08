migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!col.fields.getByName('role')) {
      col.fields.add(
        new SelectField({
          name: 'role',
          values: ['patient', 'nutritionist'],
          maxSelect: 1,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    const field = col.fields.getByName('role')
    if (field) col.fields.remove(field)
    app.save(col)
  },
)
