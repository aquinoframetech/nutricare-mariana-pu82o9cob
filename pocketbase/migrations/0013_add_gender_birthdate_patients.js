migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('patients')

    if (!col.fields.getByName('gender')) {
      col.fields.add(
        new SelectField({
          name: 'gender',
          values: ['masculino', 'feminino', 'outro'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('birth_date')) {
      col.fields.add(
        new DateField({
          name: 'birth_date',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('patients')

    const genderField = col.fields.getByName('gender')
    if (genderField) col.fields.remove(genderField)

    const birthDateField = col.fields.getByName('birth_date')
    if (birthDateField) col.fields.remove(birthDateField)

    app.save(col)
  },
)
