routerAdd(
  'POST',
  '/backend/v1/access-logs',
  (e) => {
    const body = e.requestInfo().body || {}
    try {
      var logCol = $app.findCollectionByNameOrId('access_logs')
      var log = new Record(logCol)
      log.set('user_id', e.auth ? e.auth.id : '')
      log.set('target_patient_id', body.patient_id || '')
      log.set('action', body.action || 'view_profile')
      $app.saveNoValidate(log)
      return e.json(201, { ok: true })
    } catch (err) {
      $app.logger().error('Error creating access log', 'error', err.message)
      return e.json(500, { error: 'Failed to create access log' })
    }
  },
  $apis.requireAuth(),
)
