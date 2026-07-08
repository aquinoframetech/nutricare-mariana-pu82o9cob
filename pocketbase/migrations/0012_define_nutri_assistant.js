migrate(
  (app) => {
    const mealsId = app.findCollectionByNameOrId('meals').id
    const patientsId = app.findCollectionByNameOrId('patients').id
    const macroLogsId = app.findCollectionByNameOrId('macro_logs').id

    $ai.agents.define(app, {
      slug: 'nutri-assistant',
      name: 'NutriCare AI Assistant',
      description:
        'Assistente de IA secundário para dicas de nutrição e esclarecimentos sobre refeições. Não substitui o nutricionista.',
      systemPrompt:
        'Você é o NutriCare AI Assistant, um assistente de suporte secundário que fornece dicas úteis de nutrição e esclarecimentos sobre refeições. Você tem acesso ao histórico de refeições e dados do paciente para fornecer respostas contextuais. IMPORTANTE: Sempre declare explicitamente que suas orientações não substituem o conselho do nutricionista. Responda sempre em português brasileiro de forma acolhedora e educativa.',
      tier: 'fast',
      tools: [
        { collection: mealsId, perms: { read: true, list: true }, actAs: 'user' },
        { collection: patientsId, perms: { read: true, list: true }, actAs: 'user' },
        { collection: macroLogsId, perms: { read: true, list: true }, actAs: 'user' },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'nutri-assistant')
  },
)
