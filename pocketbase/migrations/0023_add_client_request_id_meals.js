migrate(
  (app) => {
    const mealsCol = app.findCollectionByNameOrId('meals')

    if (!mealsCol.fields.getByName('client_request_id')) {
      mealsCol.fields.add(new TextField({ name: 'client_request_id' }))
    }
    app.save(mealsCol)

    mealsCol.addIndex(
      'idx_meals_client_request_id',
      true,
      'client_request_id',
      "client_request_id != ''",
    )
    app.save(mealsCol)
  },
  (app) => {
    const mealsCol = app.findCollectionByNameOrId('meals')
    mealsCol.removeIndex('idx_meals_client_request_id')
    const field = mealsCol.fields.getByName('client_request_id')
    if (field) mealsCol.fields.remove(field)
    app.save(mealsCol)
  },
)
