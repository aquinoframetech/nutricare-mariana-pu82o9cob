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

export function mapSignInError(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }

  if (error.isAbort) {
    return 'Operação cancelada.'
  }

  if (error.status === 0) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }

  if (error.status === 400) {
    return 'Falha na autenticação. Verifique suas credenciais.'
  }

  if (error.status === 429) {
    return 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
  }

  if (error.status >= 500) {
    return 'Erro no servidor. Tente novamente em instantes.'
  }

  return 'Falha na autenticação. Verifique suas credenciais.'
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
    const pwCode = data?.password?.code || ''
    const pwMsg = (fieldErrors.password || '').toLowerCase()
    if (
      pwCode === 'validation_min_text_constraint' ||
      pwMsg.includes('short') ||
      pwMsg.includes('curt') ||
      pwMsg.includes('mínimo')
    ) {
      return 'A senha deve ter no mínimo 8 caracteres.'
    }
    return 'Senha inválida. Verifique os requisitos.'
  }

  if (fields.includes('name')) {
    return 'Nome é obrigatório.'
  }

  if (fields.includes('passwordConfirm')) {
    return 'As senhas não coincidem.'
  }

  if (error.status === 0) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }

  if (context === 'createPatient') {
    return 'Sua conta foi criada, mas houve um erro ao configurar seu perfil. Por favor, entre em contato com o suporte.'
  }

  if (context === 'login') {
    return 'Erro ao autenticar. Tente fazer login com seus dados.'
  }

  return 'Erro ao criar sua conta. Verifique os campos e tente novamente.'
}
