routerAdd(
  'POST',
  '/backend/v1/generate-report',
  (e) => {
    const body = e.requestInfo().body || {}
    const patientId = body.patient_id
    const period = body.period || 'weekly'
    if (!patientId) return e.badRequestError('patient_id is required')

    var startTime = new Date().getTime()

    try {
      const patient = $app.findRecordById('patients', patientId)
      const days =
        period === 'daily' ? 1 : period === 'monthly' ? 30 : period === 'quarterly' ? 90 : 7
      const since = new Date(Date.now() - days * 86400000).toISOString()

      var patientName = 'N/A'
      try {
        var userRec = $app.findRecordById('users', patient.getString('user_id'))
        patientName = userRec.getString('name')
      } catch (_) {}

      var meals = []
      try {
        meals = $app.findRecordsByFilter(
          'meals',
          'patient_id = {:pid} && timestamp >= {:since}',
          '-timestamp',
          200,
          0,
          (pid = patientId),
          (since = since),
        )
      } catch (_) {}

      var alerts = []
      try {
        alerts = $app.findRecordsByFilter(
          'alerts',
          'patient_id = {:pid}',
          '-created',
          50,
          0,
          (pid = patientId),
        )
      } catch (_) {}

      var notes = []
      try {
        notes = $app.findRecordsByFilter(
          'professional_notes',
          'patient_id = {:pid}',
          '-created',
          50,
          0,
          (pid = patientId),
        )
      } catch (_) {}

      var calorieLogs = []
      try {
        calorieLogs = $app.findRecordsByFilter(
          'calorie_logs',
          'patient_id = {:pid} && date >= {:since}',
          'date',
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
                  'g Fib:' +
                  m.getInt('fibers') +
                  'g'
                )
              })
              .join('\n')
          : 'Sem refeições registradas no período.'

      var patientContext = 'Paciente: ' + patientName
      if (patient.getInt('age')) patientContext += ', ' + patient.getInt('age') + ' anos'
      if (patient.getString('gender')) patientContext += ', ' + patient.getString('gender')
      if (patient.getInt('weight')) patientContext += ', ' + patient.getInt('weight') + 'kg'
      if (patient.getInt('height')) patientContext += ', ' + patient.getInt('height') + 'cm'
      if (patient.getString('condition'))
        patientContext += ', condição: ' + patient.getString('condition')
      if (patient.getString('restrictions'))
        patientContext += ', restrições: ' + patient.getString('restrictions')
      if (patient.getString('allergies'))
        patientContext += ', alergias: ' + patient.getString('allergies')
      patientContext += ', meta calórica: ' + patient.getInt('calorie_goal') + ' kcal/dia'

      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um nutricionista clínico. Gere um relatório conciso em português (pt-BR) sobre a adesão nutricional do paciente. Máximo 3 parágrafos. Identifique excessos, deficiências e padrões. Não prescreva tratamentos.',
          },
          {
            role: 'user',
            content: patientContext + '\nPeríodo: ' + period + '\nRefeições:\n' + mealSummary,
          },
        ],
      })
      const content = reply.choices[0].message.content
      var elapsed = new Date().getTime() - startTime

      var estimatedCost = 0
      if (reply.usage) {
        var promptTokens = reply.usage.prompt_tokens || 0
        var completionTokens = reply.usage.completion_tokens || 0
        estimatedCost = (promptTokens * 0.15 + completionTokens * 0.6) / 1000000
      }

      var lines = []
      lines.push('RELATÓRIO NUTRICIONAL - NutriCare')
      lines.push('')
      lines.push('Paciente: ' + patientName)
      lines.push('Condição: ' + patient.getString('condition'))
      lines.push('Meta calórica: ' + patient.getInt('calorie_goal') + ' kcal/dia')
      lines.push('Período: ' + period)
      lines.push('')
      lines.push('=== RESUMO IA ===')
      var cl = content.split('\n')
      for (var i = 0; i < cl.length; i++) lines.push(cl[i])
      lines.push('')
      lines.push('=== REFEIÇÕES (' + meals.length + ') ===')
      for (var i = 0; i < meals.length; i++) {
        var m = meals[i]
        lines.push(m.getString('name') + ' - ' + m.getInt('calories') + 'kcal')
        if (m.getString('ai_food_identified'))
          lines.push('  Alimentos: ' + m.getString('ai_food_identified'))
      }
      lines.push('')
      lines.push('=== ALERTAS (' + alerts.length + ') ===')
      for (var i = 0; i < alerts.length; i++)
        lines.push(alerts[i].getString('type') + ': ' + alerts[i].getString('message'))
      lines.push('')
      lines.push('=== NOTAS PROFISSIONAIS (' + notes.length + ') ===')
      for (var i = 0; i < notes.length; i++) lines.push(notes[i].getString('note'))
      lines.push('')
      lines.push('=== EVOLUÇÃO CALÓRICA ===')
      for (var i = 0; i < calorieLogs.length; i++)
        lines.push(
          calorieLogs[i].getString('date').substring(0, 10) +
            ': ' +
            calorieLogs[i].getInt('calories') +
            ' kcal',
        )
      lines.push('')
      lines.push('')
      lines.push('___________________________')
      lines.push('Responsável Técnico')
      lines.push('Nutricionista CRN: ____________')

      var pdfContent = ''
      var y = 750
      for (var i = 0; i < lines.length; i++) {
        if (y < 50) break
        var line = lines[i].replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
        pdfContent += 'BT /F1 10 Tf 50 ' + y + ' Td (' + line + ') Tj ET\n'
        y -= 15
      }

      var objects = []
      objects.push('<< /Type /Catalog /Pages 2 0 R >>')
      objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
      objects.push(
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      )
      objects.push('<< /Length ' + pdfContent.length + ' >>\nstream\n' + pdfContent + '\nendstream')
      objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

      var pdf = '%PDF-1.4\n'
      var offsets = []
      for (var i = 0; i < objects.length; i++) {
        offsets[i] = pdf.length
        pdf += i + 1 + ' 0 obj\n' + objects[i] + '\nendobj\n'
      }
      var xrefOffset = pdf.length
      pdf += 'xref\n0 ' + (objects.length + 1) + '\n'
      pdf += '0000000000 65535 f \n'
      for (var i = 0; i < objects.length; i++) {
        var os = '0000000000' + offsets[i]
        os = os.substring(os.length - 10)
        pdf += os + ' 00000 n \n'
      }
      pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\n'
      pdf += 'startxref\n' + xrefOffset + '\n%%EOF'

      var bytes = new Uint8Array(pdf.length)
      for (var i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i)

      var file = $filesystem.fileFromBytes(bytes, 'relatorio_nutricional.pdf')

      const reportCol = $app.findCollectionByNameOrId('reports')
      const report = new Record(reportCol)
      report.set('patient_id', patientId)
      report.set('period', period)
      report.set('summary', content)
      report.set('pdf_export', file)
      $app.save(report)

      const logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      const log = new Record(logCol)
      log.set('prompt', 'Relatório para paciente ' + patientId + ', período: ' + period)
      log.set('response', content)
      log.set('user_id', e.auth ? e.auth.id : '')
      log.set('type', 'report_generation')
      log.set('model_used', 'fast')
      log.set('response_time_ms', elapsed)
      log.set('estimated_cost', estimatedCost)
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
