migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const mealsCol = app.findCollectionByNameOrId('meals')

    const collection = new Collection({
      name: 'analysis_profiling_logs',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'request_id', type: 'text', required: true },
        { name: 'user_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        { name: 'meal_id', type: 'relation', collectionId: mealsCol.id, maxSelect: 1 },
        { name: 'total_time_ms', type: 'number' },
        { name: 'image_size_kb', type: 'number' },
        { name: 'image_dimensions', type: 'text' },
        { name: 'model_used', type: 'text' },
        { name: 'openai_status', type: 'number' },
        {
          name: 'timeout_source',
          type: 'select',
          values: ['frontend', 'backend', 'openai', 'unknown'],
          maxSelect: 1,
        },
        { name: 'ts_request_received', type: 'date' },
        { name: 'dur_image_validation_ms', type: 'number' },
        { name: 'dur_image_processing_ms', type: 'number' },
        { name: 'dur_openai_request_ms', type: 'number' },
        { name: 'dur_openai_response_ms', type: 'number' },
        { name: 'dur_response_parsing_ms', type: 'number' },
        { name: 'dur_nutrition_processing_ms', type: 'number' },
        { name: 'dur_database_save_ms', type: 'number' },
        { name: 'dur_response_sent_ms', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_analysis_profiling_req ON analysis_profiling_logs (request_id)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('analysis_profiling_logs')
    app.delete(col)
  },
)
