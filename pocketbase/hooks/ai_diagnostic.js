routerAdd(
  'POST',
  '/backend/v1/ai/diagnostic',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var role = ''
    try {
      role = e.auth.getString('role') || ''
    } catch (_) {}
    if (role !== 'nutritionist') return e.forbiddenError('only nutritionists can run diagnostics')

    var report = {
      provider_used: 'Skip AI Gateway',
      alias_used: 'fast',
      platform_credits_active: false,
      vision_capability_verified: false,
      test_request_sent: false,
      text_test: {
        success: false,
        http_status: 0,
        response_time_ms: 0,
        content_preview: '',
        original_error: '',
      },
      vision_test: {
        success: false,
        http_status: 0,
        response_time_ms: 0,
        content_preview: '',
        original_error: '',
      },
      root_cause: '',
      recommendations: [],
    }

    var t1Start = new Date().getTime()
    try {
      var textReply = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: 'Reply with exactly: TEXT_OK' },
          { role: 'user', content: 'ping' },
        ],
      })
      report.text_test.success = true
      report.text_test.http_status = 200
      report.text_test.response_time_ms = new Date().getTime() - t1Start
      report.text_test.content_preview = (textReply.choices[0].message.content || '').substring(
        0,
        200,
      )
      report.platform_credits_active = true
    } catch (err) {
      report.text_test.response_time_ms = new Date().getTime() - t1Start
      report.text_test.original_error = err.message || 'unknown'
      if (typeof SkipAiError !== 'undefined' && err instanceof SkipAiError) {
        report.text_test.http_status = err.status || 502
      } else if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
        report.text_test.http_status = 503
        report.root_cause = 'AI Gateway not configured — SkipAiConfigError'
      } else {
        report.text_test.http_status = 500
      }
    }

    var tinyImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    var t2Start = new Date().getTime()
    report.test_request_sent = true
    try {
      var visionReply = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: 'Describe what you see in one word.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is in this image?' },
              { type: 'image_url', image_url: { url: tinyImage } },
            ],
          },
        ],
      })
      report.vision_test.success = true
      report.vision_test.http_status = 200
      report.vision_test.response_time_ms = new Date().getTime() - t2Start
      report.vision_test.content_preview = (visionReply.choices[0].message.content || '').substring(
        0,
        200,
      )
      report.vision_capability_verified = true
    } catch (err) {
      report.vision_test.response_time_ms = new Date().getTime() - t2Start
      report.vision_test.original_error = err.message || 'unknown'
      if (typeof SkipAiError !== 'undefined' && err instanceof SkipAiError) {
        report.vision_test.http_status = err.status || 502
      } else if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
        report.vision_test.http_status = 503
      } else {
        report.vision_test.http_status = 500
      }
    }

    if (report.root_cause === '' && !report.platform_credits_active) {
      report.root_cause =
        'AI Gateway not configured or no credits available (SkipAiConfigError on text test)'
      report.recommendations.push('Verify Skip Cloud AI credits and gateway configuration')
    } else if (report.text_test.success && !report.vision_test.success) {
      report.root_cause =
        'Text AI works but vision fails. The "fast" alias may not support multimodal input, or the image format is rejected by the provider.'
      report.recommendations.push('Verify the "fast" model alias supports vision/multimodal inputs')
      report.recommendations.push('Check if the image data URL format is accepted by the gateway')
      report.recommendations.push(
        'Review the vision_test.original_error for provider-specific details',
      )
    } else if (!report.text_test.success && !report.vision_test.success) {
      report.root_cause =
        'Both text and vision fail. AI Gateway may be down, credits exhausted, or credentials invalid.'
      report.recommendations.push('Check Skip Cloud status and AI credit balance')
      report.recommendations.push('Verify OPENAI_API_KEY secret is set in the instance')
    } else if (report.text_test.success && report.vision_test.success) {
      report.root_cause =
        'AI Gateway is functioning correctly for both text and vision. Issue is likely in the meal photo URL construction or image processing pipeline.'
      report.recommendations.push(
        'Check meal_worker.js image URL construction (baseUrl + file path)',
      )
      report.recommendations.push('Verify meal_photos records have valid image file references')
      report.recommendations.push('Check if photo URLs are accessible from the AI Gateway server')
    }

    try {
      var logCol = $app.findCollectionByNameOrId('chatgpt_analysis_logs')
      var log = new Record(logCol)
      log.set('prompt', 'AI Diagnostic Test')
      log.set('response', JSON.stringify(report))
      log.set('user_id', userId)
      log.set('type', 'ai_diagnostic')
      log.set('model_used', 'fast')
      log.set(
        'response_time_ms',
        report.text_test.response_time_ms + report.vision_test.response_time_ms,
      )
      log.set('estimated_cost', 0)
      log.set(
        'provider_status_code',
        report.vision_test.http_status || report.text_test.http_status,
      )
      log.set(
        'original_error',
        report.vision_test.original_error || report.text_test.original_error,
      )
      log.set('request_id', 'DIAG_' + $security.randomString(8))
      $app.saveNoValidate(log)
    } catch (_) {}

    return e.json(200, report)
  },
  $apis.requireAuth(),
)
