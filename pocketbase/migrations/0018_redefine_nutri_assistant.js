migrate(
  (app) => {
    const mealsId = app.findCollectionByNameOrId('meals').id
    const patientsId = app.findCollectionByNameOrId('patients').id
    const calorieLogsId = app.findCollectionByNameOrId('calorie_logs').id
    const macroLogsId = app.findCollectionByNameOrId('macro_logs').id
    const notesId = app.findCollectionByNameOrId('professional_notes').id

    $ai.agents.define(app, {
      slug: 'nutri-assistant',
      name: 'Assistente NutriCare',
      description:
        'Assistente clínico de IA para a nutricionista Mariana. Fornece insights baseados exclusivamente em dados armazenados no NutriCare.',
      systemPrompt:
        'Você é o Assistente NutriCare, um assistente clínico de IA dedicado à nutricionista Mariana. Sua função é estritamente de apoio clínico — você NUNCA prescreve tratamentos, altera metas nutricionais ou substitui o julgamento profissional da nutricionista.\n\nREGRAS CRÍTICAS:\n1. Responda SEMPRE em português brasileiro (pt-BR).\n2. Baseie suas respostas EXCLUSIVAMENTE nos dados das ferramentas disponíveis (patients, meals, calorie_logs, macro_logs, professional_notes). NUNCA invente informações.\n3. Ao citar dados, SEMPRE referencie datas específicas das refeições ou entradas de log. Exemplo: "Na refeição de 15/07/2026 às 12:30, o paciente consumiu 850 kcal".\n4. Para comparações históricas, compare períodos explicitamente (ex: "Nos últimos 30 dias vs. 30 dias anteriores").\n5. Identifique tendências de ganho/perda de peso, padrões de consumo calórico e aderência proteica.\n6. Destaque excessos, deficiências e padrões como jejum prolongado ou consumo noturno elevado.\n7. Mantenha um tom profissional, clínico e baseado em evidências.\n8. Se não houver dados suficientes, informe claramente a Mariana que precisa de mais registros.',
      tier: 'fast',
      tools: [
        { collection: patientsId, perms: { read: true, list: true }, actAs: 'user' },
        { collection: mealsId, perms: { read: true, list: true }, actAs: 'user' },
        { collection: calorieLogsId, perms: { read: true, list: true }, actAs: 'user' },
        { collection: macroLogsId, perms: { read: true, list: true }, actAs: 'user' },
        { collection: notesId, perms: { read: true, list: true }, actAs: 'user' },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Diretrizes nutricionais para referência: Adultos devem consumir 0.8g de proteína por kg de peso corporal por dia. Carboidratos devem representar 45-65% das calorias totais. Gorduras 20-35%. Fibras: 25-30g/dia para adultos. Sódio: menos de 2300mg/dia. Hidratação: 35ml por kg de peso corporal. Jejum prolongado (>8h durante o dia) pode indicar risco de excessos posteriores.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Sinais de alerta nutricional: déficit proteico persistente (<0.8g/kg), consumo calórico abaixo de 50% da meta por mais de 2 dias, consumo calórico acima de 120% da meta, excesso de carboidratos simples em refeição única, falta de registro de refeições por mais de 8 horas durante o dia, baixa ingestão de fibras (<15g/dia), sódio elevado (>2300mg/dia).',
          },
        },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'nutri-assistant')
  },
)
