routerAdd(
  'GET',
  '/backend/v1/worker/diagnostic',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var role = ''
    try {
      role = e.auth.getString('role') || ''
    } catch (_) {}
    if (role !== 'nutritionist') return e.forbiddenError('only nutritionists can run diagnostics')

    var report = {
      worker_version_expected: 'vision-fix-2026-07-12-v1',
      worker_version_found: '',
      queue_items: [],
      meal_states: [],
      analysis_logs: [],
      profiling_logs: [],
      summary: '',
    }

    try {
      var queueItems = $app.findRecordsByFilter(
        'meal_analysis_queue',
        "status = 'failed' || status = 'pending' || status = 'processing'",
        '-created',
        10,
        0,
      )
      for (var i = 0; i < queueItems.length; i++) {
        var qi = queueItems[i]
        report.queue_items.push({
          id: qi.id,
          request_id: qi.getString('request_id'),
          meal_id: qi.getString('meal_id'),
          status: qi.getString('status'),
          attempts: qi.getInt('attempts'),
          error_sanitized: qi.getString('error_sanitized'),
          started_at: qi.getString('started_at'),
          finished_at: qi.getString('finished_at'),
          created: qi.getString('created'),
        })
      }
    } catch (err) {
      report.summary = 'Error fetching queue items: ' + err.message
    }

    if (report.queue_items.length > 0) {
      var firstMealId = report.queue_items[0].meal_id
      var firstRequestId = report.queue_items[0].request_id

      try {
        var meal = $app.findRecordById('meals', firstMealId)
        report.meal_states.push({
          id: meal.id,
          name: meal.getString('name'),
          analysis_status: meal.getString('analysis_status'),
          ai_notes: meal.getString('ai_notes'),
          ai_food_identified: meal.getString('ai_food_identified'),
          ai_confidence: meal.get('ai_confidence'),
          calories: meal.get('calories'),
          analyzed_at: meal.getString('analyzed_at'),
          client_request_id: meal.getString('client_request_id'),
        })
      } catch (err) {
        report.meal_states.push({ error: 'Could not fetch meal: ' + err.message })
      }

      try {
        var logs = $app.findRecordsByFilter(
          'chatgpt_analysis_logs',
          "meal_id = '" + firstMealId + "'",
          '-created',
          5,
          0,
        )
        for (var j = 0; j < logs.length; j++) {
          var lg = logs[j]
          report.analysis_logs.push({
            id: lg.id,
            type: lg.getString('type'),
            response: lg.getString('response'),
            original_error: lg.getString('original_error'),
            provider_status_code: lg.get('provider_status_code'),
            model_used: lg.getString('model_used'),
            request_id: lg.getString('request_id'),
            response_time_ms: lg.get('response_time_ms'),
            created: lg.getString('created'),
          })
        }
      } catch (err) {
        report.analysis_logs.push({ error: 'Could not fetch analysis logs: ' + err.message })
      }

      try {
        var profLogs = $app.findRecordsByFilter(
          'analysis_profiling_logs',
          "request_id = '" + firstRequestId + "'",
          '-created',
          5,
          0,
        )
        for (var k = 0; k < profLogs.length; k++) {
          var pl = profLogs[k]
          report.profiling_logs.push({
            id: pl.id,
            request_id: pl.getString('request_id'),
            meal_id: pl.getString('meal_id'),
            total_time_ms: pl.get('total_time_ms'),
            model_used: pl.getString('model_used'),
            openai_status: pl.get('openai_status'),
            timeout_source: pl.getString('timeout_source'),
            image_size_kb: pl.get('image_size_kb'),
            dur_image_validation_ms: pl.get('dur_image_validation_ms'),
            dur_openai_request_ms: pl.get('dur_openai_request_ms'),
            dur_response_parsing_ms: pl.get('dur_response_parsing_ms'),
            dur_database_save_ms: pl.get('dur_database_save_ms'),
            created: pl.getString('created'),
          })
        }
      } catch (err) {
        report.profiling_logs.push({ error: 'Could not fetch profiling logs: ' + err.message })
      }

      if (report.analysis_logs.length > 0) {
        var lastLog = report.analysis_logs[0]
        report.worker_version_found = lastLog.request_id ? 'present' : 'unknown'
      }
    }

    report.summary =
      'Diagnostic report generated. Check queue_items, meal_states, analysis_logs, and profiling_logs for details.'

    return e.json(200, report)
  },
  $apis.requireAuth(),
)
