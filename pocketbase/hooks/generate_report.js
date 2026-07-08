routerAdd(
  'POST',
  '/backend/v1/generate-report',
  (e) => {
    const body = e.requestInfo().body || {}
    const patientId = body.patient_id
    const period = body.period || 'weekly'
    if (!patientId) return e.badRequestError('patient_id is required')

    try {
      const patient = $app.findRecordById('patients', patientId)
      const days = period === 'daily' ? 1 : period === 'monthly' ? 30 : 7
      const since = new Date(Date.now() - days * 86400000).toISOString()

      let meals = []
      try {
        meals = $app.findRecordsByFilter(
          'meals',
          'patient_id = {:pid} && timestamp >= {:since}',
          '-timestamp',
          100,
          0,
          (pid = patientId),
          (since = since),
        )
      } catch (_) {}

      const mealSummary =
        meals.length > 0
          ? meals
              .map(function (m) {
                return (
                  m.getString('name') +
                  ': ' +
                  m.getInt('calories') +
                  'kcal P:' +
                  m.getInt('proteins') +
                  'g C:' +
                  m.getInt('carbs') +
                  'g F:' +
                  m.getInt('fats') +
                  'g'
                )
              })
              .join('\n')
          : 'Sem refeições registradas no período.'

      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um nutricionista clínico. Gere um relatório conciso em português sobre a adesão nutricional do paciente com base nas refeições registradas. Máximo 3 parágrafos.',
          },
          {
            role: 'user',
            content:
              'Paciente: ' +
              patient.getString('condition') +
              ', Meta: ' +
              patient.getInt('calorie_goal') +
              'kcal/dia\nRefeições:\n' +
              mealSummary,
          },
        ],
      })

      const content = reply.choices[0].message.content

      const reportCol = $app.findCollectionByNameOrId('reports')
      const report = new Record(reportCol)
      report.set('patient_id', patientId)
      report.set('period', period)
      report.set('summary', content)
      $app.save(report)

      const logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      const log = new Record(logCol)
      log.set('prompt', 'Relatório para paciente ' + patientId + ', período: ' + period)
      log.set('response', content)
      log.set('user_id', e.auth?.id || '')
      log.set('type', 'report_generation')
      $app.saveNoValidate(log)

      return e.json(200, { summary: content, id: report.id })
    } catch (err) {
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'AI temporariamente indisponível' })
      if (err instanceof SkipAiError)
        return e.json(502, { error: 'AI temporariamente indisponível' })
      throw err
    }
  },
  $apis.requireAuth(),
)
