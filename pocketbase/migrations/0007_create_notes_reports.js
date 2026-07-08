migrate(
  (app) => {
    const patientsId = app.findCollectionByNameOrId('patients').id
    const usersId = '_pb_users_auth_'

    const notes = new Collection({
      name: 'professional_notes',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      viewRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      createRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: patientsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'nutritionist_id',
          type: 'relation',
          required: true,
          collectionId: usersId,
          maxSelect: 1,
        },
        { name: 'note', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_notes_patient ON professional_notes (patient_id)'],
    })
    app.save(notes)

    const reports = new Collection({
      name: 'reports',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      viewRule:
        "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || @request.auth.role = 'nutritionist')",
      createRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: patientsId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'period', type: 'text' },
        { name: 'summary', type: 'text' },
        {
          name: 'pdf_export',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['application/pdf'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_reports_patient ON reports (patient_id)'],
    })
    app.save(reports)

    const analysisLogs = new Collection({
      name: 'chatgpt_analysis_logs',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'nutritionist'",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'prompt', type: 'text' },
        { name: 'response', type: 'text' },
        { name: 'user_id', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'type', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_analysis_logs_user ON chatgpt_analysis_logs (user_id)'],
    })
    app.save(analysisLogs)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('professional_notes'))
    app.delete(app.findCollectionByNameOrId('reports'))
    app.delete(app.findCollectionByNameOrId('chatgpt_analysis_logs'))
  },
)
