migrate(
  (app) => {
    const mealsId = app.findCollectionByNameOrId('meals').id
    const collection = new Collection({
      name: 'meal_photos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      fields: [
        {
          name: 'meal_id',
          type: 'relation',
          required: true,
          collectionId: mealsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'image',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_meal_photos_meal ON meal_photos (meal_id)'],
    })
    app.save(collection)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('meal_photos')
    app.delete(col)
  },
)
