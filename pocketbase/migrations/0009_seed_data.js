migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    let nutriId
    try {
      nutriId = app.findAuthRecordByEmail('_pb_users_auth_', 'aquinobr@hotmail.com').id
    } catch (_) {
      const u = new Record(usersCol)
      u.setEmail('aquinobr@hotmail.com')
      u.setPassword('Skip@Pass')
      u.setVerified(true)
      u.set('name', 'Nutri Mariana')
      u.set('role', 'nutritionist')
      app.save(u)
      nutriId = u.id
    }

    try {
      app.findFirstRecordByData('nutritionist_profiles', 'user_id', nutriId)
    } catch (_) {
      const pCol = app.findCollectionByNameOrId('nutritionist_profiles')
      const p = new Record(pCol)
      p.set('user_id', nutriId)
      p.set('bio', 'Nutricionista especializada em atendimento clínico e recuperação nutricional.')
      p.set('specialty', 'Nutrição Clínica e Esportiva')
      app.save(p)
    }

    const patientsData = [
      {
        email: 'ana@example.com',
        name: 'Ana Souza',
        age: 32,
        weight: 68,
        height: 165,
        goal: 'Perda de peso',
        condition: 'Pós-operatório Bariátrica',
        calorie_goal: 1200,
      },
      {
        email: 'carlos@example.com',
        name: 'Carlos Oliveira',
        age: 28,
        weight: 80,
        height: 178,
        goal: 'Ganho de massa',
        condition: 'Ganho de Massa Magra',
        calorie_goal: 3000,
      },
      {
        email: 'juliana@example.com',
        name: 'Juliana Lima',
        age: 45,
        weight: 70,
        height: 160,
        goal: 'Controle glicêmico',
        condition: 'Controle de Diabetes',
        calorie_goal: 1800,
      },
    ]

    const patientIds = []
    for (const pd of patientsData) {
      let userId
      try {
        userId = app.findAuthRecordByEmail('_pb_users_auth_', pd.email).id
      } catch (_) {
        const u = new Record(usersCol)
        u.setEmail(pd.email)
        u.setPassword('Skip@Pass')
        u.setVerified(true)
        u.set('name', pd.name)
        u.set('role', 'patient')
        app.save(u)
        userId = u.id
      }

      let pid
      try {
        pid = app.findFirstRecordByData('patients', 'user_id', userId).id
      } catch (_) {
        const pCol = app.findCollectionByNameOrId('patients')
        const p = new Record(pCol)
        p.set('user_id', userId)
        p.set('age', pd.age)
        p.set('weight', pd.weight)
        p.set('height', pd.height)
        p.set('goal', pd.goal)
        p.set('condition', pd.condition)
        p.set('restrictions', '')
        p.set('allergies', '')
        p.set('medical_notes', '')
        p.set('calorie_goal', pd.calorie_goal)
        p.set('nutritionist_id', nutriId)
        app.save(p)
        pid = p.id
      }
      patientIds.push({ id: pid, email: pd.email })
    }

    const mealsCol = app.findCollectionByNameOrId('meals')
    const now = new Date()
    const mealsData = [
      {
        patientIdx: 0,
        name: 'Almoço',
        hoursAgo: 2,
        calories: 350,
        proteins: 25,
        carbs: 30,
        fats: 12,
        desc: 'Salada de folhas, frango grelhado e azeite',
      },
      {
        patientIdx: 0,
        name: 'Café da manhã',
        hoursAgo: 6,
        calories: 250,
        proteins: 15,
        carbs: 35,
        fats: 8,
        desc: 'Ovo mexido e pão integral',
      },
      {
        patientIdx: 1,
        name: 'Almoço',
        hoursAgo: 24,
        calories: 800,
        proteins: 60,
        carbs: 80,
        fats: 30,
        desc: 'Bife ancho, arroz branco e feijão',
      },
    ]
    for (const md of mealsData) {
      const pid = patientIds[md.patientIdx].id
      try {
        app.findFirstRecordByData('meals', 'patient_id', pid)
      } catch (_) {
        const m = new Record(mealsCol)
        m.set('patient_id', pid)
        m.set('name', md.name)
        const ts = new Date(now.getTime() - md.hoursAgo * 3600000)
        m.set('timestamp', ts.toISOString())
        m.set('ai_description', md.desc)
        m.set('calories', md.calories)
        m.set('proteins', md.proteins)
        m.set('carbs', md.carbs)
        m.set('fats', md.fats)
        app.save(m)
      }
    }

    const alertsCol = app.findCollectionByNameOrId('alerts')
    const alertsData = [
      {
        patientIdx: 2,
        type: 'critical',
        message: 'Consumo de carboidratos excedeu 50% da meta em uma única refeição.',
      },
      {
        patientIdx: 1,
        type: 'warning',
        message: 'Nenhum registro nas últimas 8 horas (período diurno).',
      },
      { patientIdx: 0, type: 'success', message: 'Ana atingiu a meta de proteínas do dia!' },
    ]
    for (const ad of alertsData) {
      const pid = patientIds[ad.patientIdx].id
      try {
        app.findFirstRecordByData('alerts', 'patient_id', pid)
      } catch (_) {
        const a = new Record(alertsCol)
        a.set('patient_id', pid)
        a.set('type', ad.type)
        a.set('message', ad.message)
        a.set('is_read', ad.type === 'success')
        app.save(a)
      }
    }

    const notesCol = app.findCollectionByNameOrId('professional_notes')
    try {
      app.findFirstRecordByData('professional_notes', 'patient_id', patientIds[0].id)
    } catch (_) {
      const n = new Record(notesCol)
      n.set('patient_id', patientIds[0].id)
      n.set('nutritionist_id', nutriId)
      n.set(
        'note',
        'Paciente respondendo bem ao plano. Manter protocolo atual e incentivar aumento de proteína no jantar.',
      )
      app.save(n)
    }
  },
  (app) => {},
)
