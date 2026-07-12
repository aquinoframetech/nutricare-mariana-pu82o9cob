routerAdd(
  'POST',
  '/backend/v1/meals/analyze',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    const files = e.findUploadedFiles('image')
    if (!files || files.length === 0) {
      return e.badRequestError('Imagem é obrigatória')
    }
    const fh = files[0]
    const ext = (fh.name || '').split('.').pop().toLowerCase()
    if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png' && ext !== 'webp') {
      return e.badRequestError('Formato inválido. Use JPEG, PNG ou WebP.')
    }
    if (fh.size > 5242880) {
      return e.badRequestError('Imagem muito grande. Máximo 5MB.')
    }

    var patient
    try {
      patient = $app.findFirstRecordByFilter('patients', 'user_id = {:uid}', (uid = userId))
    } catch (_) {
      return e.badRequestError('Perfil de paciente não encontrado')
    }

    var mealName = body.name || body.description || 'Refeição'

    var mealsCol = $app.findCollectionByNameOrId('meals')
    var meal = new Record(mealsCol)
    meal.set('patient_id', patient.id)
    meal.set('name', mealName)
    meal.set('timestamp', new Date().toISOString())
    meal.set('analysis_status', 'processing')
    $app.save(meal)

    var photosCol = $app.findCollectionByNameOrId('meal_photos')
    var photo = new Record(photosCol)
    photo.set('meal_id', meal.id)
    photo.set('image', $filesystem.fileFromMultipart(fh))
    $app.save(photo)

    return e.json(202, { meal_id: meal.id, status: 'processing' })
  },
  $apis.requireAuth(),
  $apis.bodyLimit(10485760),
)
