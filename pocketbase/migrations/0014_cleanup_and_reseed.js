migrate(
  (app) => {
    var collectionsToTruncate = [
      'meal_edit_logs',
      'access_logs',
      'chatgpt_analysis_logs',
      'reports',
      'professional_notes',
      'macro_logs',
      'calorie_logs',
      'alerts',
      'meal_photos',
      'meals',
      'patients',
      'nutritionist_profiles',
    ]

    for (var i = 0; i < collectionsToTruncate.length; i++) {
      try {
        var col = app.findCollectionByNameOrId(collectionsToTruncate[i])
        app.truncateCollection(col)
      } catch (_) {}
    }

    try {
      var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      app.truncateCollection(usersCol)
    } catch (_) {}

    var uCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var user = new Record(uCol)
    user.setEmail('aquinobr@hotmail.com')
    user.setPassword('Skip@Pass')
    user.setVerified(true)
    user.set('name', 'Mariana Aquino')
    user.set('role', 'patient')
    app.save(user)

    var pCol = app.findCollectionByNameOrId('patients')
    var patient = new Record(pCol)
    patient.set('user_id', user.id)
    patient.set('age', 0)
    patient.set('weight', 0)
    patient.set('height', 0)
    patient.set('goal', '')
    patient.set('condition', '')
    patient.set('restrictions', '')
    patient.set('allergies', '')
    patient.set('medical_notes', '')
    patient.set('calorie_goal', 0)
    app.save(patient)
  },
  (app) => {},
)
