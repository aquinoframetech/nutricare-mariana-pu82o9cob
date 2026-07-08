import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

function translateError(field: string, detail: unknown): string | null {
  if (!detail || typeof detail !== 'object') return null
  const d = detail as { code?: string; message?: string }
  const code = d.code || ''

  if (field === 'email') {
    if (code === 'validation_not_unique') return 'Este e-mail já está cadastrado.'
    if (code === 'validation_is_email') return 'Informe um e-mail válido.'
  }
  if (field === 'password') {
    if (code === 'validation_min_text_constraint') return 'Senha muito curta.'
  }

  const genericMap: Record<string, string> = {
    validation_not_unique: 'Este valor já está cadastrado.',
    validation_is_email: 'Email inválido.',
    validation_min_text_constraint: 'Valor muito curto.',
    validation_max_text_constraint: 'Valor muito longo.',
    validation_required: 'Este campo é obrigatório.',
  }

  return genericMap[code] || 'Valor inválido.'
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    const translated = translateError(field, detail)
    if (translated) errors[field] = translated
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Erro ao criar sua conta. Tente novamente.'
  }

  const fieldErrors = extractFieldErrors(error)
  const msgs = Object.values(fieldErrors)
  return msgs.length > 0 ? msgs.join(' ') : 'Erro ao criar sua conta. Tente novamente.'
}
