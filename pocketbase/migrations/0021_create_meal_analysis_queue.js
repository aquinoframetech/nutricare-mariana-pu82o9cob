migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const mealsCol = app.findCollectionByNameOrId('meals')

    const queueCollection = new Collection({
      name: 'meal_analysis_queue',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'request_id', type: 'text', required: true },
        {
          name: 'meal_id',
          type: 'relation',
          required: true,
          collectionId: mealsCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'processing', 'completed', 'retry_scheduled', 'failed'],
          maxSelect: 1,
        },
        { name: 'attempts', type: 'number' },
        { name: 'locked_at', type: 'date' },
        { name: 'locked_by', type: 'text' },
        { name: 'error_sanitized', type: 'text' },
        { name: 'started_at', type: 'date' },
        { name: 'finished_at', type: 'date' },
        { name: 'next_retry_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_meal_queue_meal ON meal_analysis_queue (meal_id)',
        'CREATE INDEX idx_meal_queue_status ON meal_analysis_queue (status)',
        'CREATE INDEX idx_meal_queue_retry ON meal_analysis_queue (next_retry_at)',
      ],
    })
    app.save(queueCollection)

    if (!mealsCol.fields.getByName('ai_estimated_values_history')) {
      mealsCol.fields.add(new JSONField({ name: 'ai_estimated_values_history' }))
    }
    app.save(mealsCol)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('meal_analysis_queue')
    app.delete(col)
    const mealsCol = app.findCollectionByNameOrId('meals')
    const histField = mealsCol.fields.getByName('ai_estimated_values_history')
    if (histField) mealsCol.fields.remove(histField)
    app.save(mealsCol)
  },
)
