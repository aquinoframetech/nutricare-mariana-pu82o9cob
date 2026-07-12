migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('chatgpt_analysis_logs')

    if (!col.fields.getByName('provider_status_code')) {
      col.fields.add(new NumberField({ name: 'provider_status_code' }))
    }
    if (!col.fields.getByName('original_error')) {
      col.fields.add(new TextField({ name: 'original_error' }))
    }
    if (!col.fields.getByName('request_id')) {
      col.fields.add(new TextField({ name: 'request_id' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('chatgpt_analysis_logs')
    var fields = ['provider_status_code', 'original_error', 'request_id']
    for (var i = 0; i < fields.length; i++) {
      var f = col.fields.getByName(fields[i])
      if (f) col.fields.remove(f)
    }
    app.save(col)
  },
)
