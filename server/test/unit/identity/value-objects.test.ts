import { describe, expect, it } from 'vitest'
import { Email } from '../../../src/domain/identity/email.value-object.js'
import {
  InvalidEmailError,
  WeakPasswordError,
} from '../../../src/domain/identity/identity.errors.js'
import { Password } from '../../../src/domain/identity/password.value-object.js'

describe('Email', () => {
  it('normaliza para minúsculas e remove espaços', () => {
    expect(Email.create('  Maria@Exemplo.COM ').value).toBe('maria@exemplo.com')
  })

  it.each(['', 'sem-arroba', 'a@b', 'com espaço@exemplo.com'])('rejeita "%s"', (raw) => {
    expect(() => Email.create(raw)).toThrow(InvalidEmailError)
  })

  it('compara por valor', () => {
    expect(Email.create('A@exemplo.com').equals(Email.create('a@exemplo.com'))).toBe(true)
  })
})

describe('Password', () => {
  it('aceita senha com 8 caracteres, letras e números', () => {
    expect(Password.create('senha123').value).toBe('senha123')
  })

  it.each([
    ['curta', 'abc123', 'A senha deve ter no mínimo 8 caracteres'],
    ['sem letras', '12345678', 'A senha deve conter letras'],
    ['sem números', 'somenteletras', 'A senha deve conter números'],
  ])('rejeita senha %s com mensagem específica', (_, plain, message) => {
    expect(() => Password.create(plain)).toThrow(new WeakPasswordError(message))
  })
})
