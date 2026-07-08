migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('chatgpt_analysis_logs')

    if (!col.fields.getByName('model_used')) {
      col.fields.add(new TextField({ name: 'model_used' }))
    }

    if (!col.fields.getByName('response_time_ms')) {
      col.fields.add(new NumberField({ name: 'response_time_ms' }))
    }

    if (!col.fields.getByName('estimated_cost')) {
      col.fields.add(new NumberField({ name: 'estimated_cost' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('chatgpt_analysis_logs')

    const modelField = col.fields.getByName('model_used')
    if (modelField) col.fields.remove(modelField)

    const rtField = col.fields.getByName('response_time_ms')
    if (rtField) col.fields.remove(rtField)

    const costField = col.fields.getByName('estimated_cost')
    if (costField) col.fields.remove(costField)

    app.save(col)
  },
)
