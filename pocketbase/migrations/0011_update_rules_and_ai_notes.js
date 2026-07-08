migrate(
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var roleField = usersCol.fields.getByName('role')
    if (roleField) {
      usersCol.fields.remove(roleField)
    }
    usersCol.fields.add(
      new SelectField({
        name: 'role',
        values: ['patient', 'nutritionist', 'admin'],
        maxSelect: 1,
      }),
    )
    usersCol.viewRule = "@request.auth.id != ''"
    app.save(usersCol)

    var mealsCol = app.findCollectionByNameOrId('meals')
    if (!mealsCol.fields.getByName('ai_notes')) {
      mealsCol.fields.add(new TextField({ name: 'ai_notes' }))
    }
    mealsCol.listRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    mealsCol.viewRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    mealsCol.createRule = "@request.auth.id != '' && patient_id.user_id = @request.auth.id"
    mealsCol.updateRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    mealsCol.deleteRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    app.save(mealsCol)

    var patientsCol = app.findCollectionByNameOrId('patients')
    patientsCol.listRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || nutritionist_id = @request.auth.id)"
    patientsCol.viewRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || nutritionist_id = @request.auth.id)"
    patientsCol.updateRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || nutritionist_id = @request.auth.id)"
    patientsCol.deleteRule = "@request.auth.id != '' && nutritionist_id = @request.auth.id"
    app.save(patientsCol)

    var alertsCol = app.findCollectionByNameOrId('alerts')
    alertsCol.listRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    alertsCol.viewRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    alertsCol.updateRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    alertsCol.deleteRule = "@request.auth.id != '' && patient_id.nutritionist_id = @request.auth.id"
    app.save(alertsCol)

    var calorieLogsCol = app.findCollectionByNameOrId('calorie_logs')
    calorieLogsCol.listRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    calorieLogsCol.viewRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    calorieLogsCol.updateRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    calorieLogsCol.deleteRule =
      "@request.auth.id != '' && patient_id.nutritionist_id = @request.auth.id"
    app.save(calorieLogsCol)

    var macroLogsCol = app.findCollectionByNameOrId('macro_logs')
    macroLogsCol.listRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    macroLogsCol.viewRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    macroLogsCol.updateRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    macroLogsCol.deleteRule =
      "@request.auth.id != '' && patient_id.nutritionist_id = @request.auth.id"
    app.save(macroLogsCol)

    var notesCol = app.findCollectionByNameOrId('professional_notes')
    notesCol.listRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    notesCol.viewRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    notesCol.createRule = "@request.auth.id != '' && patient_id.nutritionist_id = @request.auth.id"
    notesCol.updateRule = "@request.auth.id != '' && patient_id.nutritionist_id = @request.auth.id"
    notesCol.deleteRule = "@request.auth.id != '' && patient_id.nutritionist_id = @request.auth.id"
    app.save(notesCol)

    var reportsCol = app.findCollectionByNameOrId('reports')
    reportsCol.listRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    reportsCol.viewRule =
      "@request.auth.id != '' && (patient_id.user_id = @request.auth.id || patient_id.nutritionist_id = @request.auth.id)"
    reportsCol.createRule =
      "@request.auth.id != '' && patient_id.nutritionist_id = @request.auth.id"
    reportsCol.updateRule =
      "@request.auth.id != '' && patient_id.nutritionist_id = @request.auth.id"
    reportsCol.deleteRule =
      "@request.auth.id != '' && patient_id.nutritionist_id = @request.auth.id"
    app.save(reportsCol)
  },
  (app) => {
    var mealsCol = app.findCollectionByNameOrId('meals')
    var f = mealsCol.fields.getByName('ai_notes')
    if (f) mealsCol.fields.remove(f)
    app.save(mealsCol)
  },
)
