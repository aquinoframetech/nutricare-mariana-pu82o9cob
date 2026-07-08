migrate(
  (app) => {
    const mealsCol = app.findCollectionByNameOrId('meals')

    if (!mealsCol.fields.getByName('fibers')) {
      mealsCol.fields.add(new NumberField({ name: 'fibers' }))
    }

    if (!mealsCol.fields.getByName('sodium')) {
      mealsCol.fields.add(new NumberField({ name: 'sodium' }))
    }

    app.save(mealsCol)
  },
  (app) => {
    const mealsCol = app.findCollectionByNameOrId('meals')

    const fibersField = mealsCol.fields.getByName('fibers')
    if (fibersField) mealsCol.fields.remove(fibersField)

    const sodiumField = mealsCol.fields.getByName('sodium')
    if (sodiumField) mealsCol.fields.remove(sodiumField)

    app.save(mealsCol)
  },
)
