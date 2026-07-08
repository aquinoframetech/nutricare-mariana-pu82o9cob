import { ClientResponseError } from 'pocketbase'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'

export type SignUpContext = 'createUser' | 'login' | 'createPatient' | 'cleanup'

export function logAuthError(source: string, error: unknown): void {
  if (error instanceof ClientResponseError) {
    const fieldErrors = extractFieldErrors(error)
    console.error('[NutriCare Auth Error]', {
      source,
      httpCode: error.status,
      response: error.response,
      fieldErrors,
      failedFields: Object.keys(fieldErrors),
      message: error.message,
      stack: error.stack,
      isAbort: error.isAbort,
    })
  } else if (error instanceof Error) {
    console.error('[NutriCare Auth Error]', {
      source,
      message: error.message,
      stack: error.stack,
    })
  } else {
    console.error('[NutriCare Auth Error]', {
      source,
      error: String(error),
    })
  }
}

export function mapSignUpError(error: unknown, context: SignUpContext): string {
  if (!(error instanceof ClientResponseError)) {
    return 'Erro ao criar sua conta. Verifique sua conexão e tente novamente.'
  }

  const data = error.response?.data as
    | Record<string, { code?: string; message?: string }>
    | undefined
  const fieldErrors = extractFieldErrors(error)
  const fields = Object.keys(fieldErrors)

  if (fields.includes('email')) {
    const emailCode = data?.email?.code || ''
    const emailMsg = (fieldErrors.email || '').toLowerCase()
    if (
      emailCode === 'validation_not_unique' ||
      emailMsg.includes('unique') ||
      emailMsg.includes('exist') ||
      emailMsg.includes('já')
    ) {
      return 'Este e-mail já está cadastrado.'
    }
    return 'Informe um e-mail válido.'
  }

  if (fields.includes('password')) {
    return 'Senha muito curta. Use pelo menos 8 caracteres.'
  }

  if (context === 'createPatient') {
    return 'Sua conta foi criada, mas houve um erro ao configurar seu perfil. Por favor, entre em contato com o suporte.'
  }

  return 'Erro ao criar sua conta. Verifique sua conexão e tente novamente.'
}
