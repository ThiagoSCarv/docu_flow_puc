// Domínio (identity): value object da senha em texto puro, validada antes do hash (RNF15).
import { WeakPasswordError } from './identity.errors.js'

export const MIN_PASSWORD_LENGTH = 8

// Regras da senha em ordem; a primeira que falhar define a mensagem devolvida ao usuário.
const PASSWORD_RULES = [
  {
    isSatisfiedBy: (value: string) => value.length >= MIN_PASSWORD_LENGTH,
    message: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`,
  },
  {
    isSatisfiedBy: (value: string) => /[A-Za-z]/.test(value),
    message: 'A senha deve conter letras',
  },
  { isSatisfiedBy: (value: string) => /[0-9]/.test(value), message: 'A senha deve conter números' },
]

// Senha que já cumpre a política; só existe em memória até virar hash bcrypt (RNF04).
export class Password {
  private constructor(readonly value: string) {}

  // Recusa a senha com a mensagem da primeira regra descumprida.
  static create(plain: string): Password {
    const brokenRule = PASSWORD_RULES.find((rule) => !rule.isSatisfiedBy(plain))
    if (brokenRule) throw new WeakPasswordError(brokenRule.message)
    return new Password(plain)
  }
}
