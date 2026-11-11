import { WeakPasswordError } from './identity.errors.js'

export const MIN_PASSWORD_LENGTH = 8

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

export class Password {
  private constructor(readonly value: string) {}

  static create(plain: string): Password {
    const brokenRule = PASSWORD_RULES.find((rule) => !rule.isSatisfiedBy(plain))
    if (brokenRule) throw new WeakPasswordError(brokenRule.message)
    return new Password(plain)
  }
}
