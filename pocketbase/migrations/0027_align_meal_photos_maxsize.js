migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('meal_photos')
    var imageField = col.fields.getByName('image')
    if (imageField) {
      try {
        imageField.maxSize = 5242880
      } catch (_) {}
    }
    app.save(col)
  },
  (app) => {},
)
