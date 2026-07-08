migrate(
  (app) => {
    const patientsId = app.findCollectionByNameOrId('patients').id
    const mealsId = app.findCollectionByNameOrId('meals').id
    const alertsId = app.findCollectionByNameOrId('alerts').id

    $ai.agents.define(app, {
      slug: 'nutricare-assistant',
      name: 'NutriCare Assistant',
      description:
        'Assistente de IA para orientação nutricional educacional e análise de refeições.',
      systemPrompt:
        'Você é um assistente de nutrição educacional do NutriCare. Ajude os pacientes a entender seus dados alimentares, forneça orientações preliminares baseadas em padrões nutricionais e incentive hábitos saudáveis. Sempre esclareça que suas orientações não substituem o acompanhamento profissional da nutricionista. Responda sempre em português brasileiro de forma acolhedora e motivadora.',
      tier: 'fast',
      tools: [
        { collection: patientsId, perms: { read: true, list: true }, actAs: 'user' },
        { collection: mealsId, perms: { read: true, list: true }, actAs: 'user' },
        { collection: alertsId, perms: { read: true, list: true }, actAs: 'user' },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Diretrizes nutricionais: Adultos devem consumir 0.8g de proteína por kg de peso corporal. Carboidratos devem ser 45-65% das calorias totais. Gorduras devem ser 20-35%. Pacientes devem se alimentar a cada 3-4 horas. Pular refeições pode levar a excessos depois. Hidratação: 35ml por kg de peso corporal por dia.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Sinais de alerta nutricional: déficit proteico persistente, consumo calórico abaixo de 50% da meta por mais de 2 dias, excesso de carboidratos simples em uma única refeição, falta de registro de refeições por mais de 8 horas durante o dia.',
          },
        },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'nutricare-assistant')
  },
)
