import { describe, expect, it } from 'vitest'
import { InvalidClientCodeError } from '../../../src/domain/catalog/catalog.errors.js'
import { Client } from '../../../src/domain/catalog/client.entity.js'

const NOW = new Date('2026-11-12T12:00:00Z')

describe('Client.create', () => {
  it('cria cliente ativo com código em maiúsculas e nome sem espaços nas pontas', () => {
    const client = Client.create({ name: '  Empresa Exemplo ', code: ' empresa-exemplo ' }, NOW)
    expect(client).toMatchObject({
      name: 'Empresa Exemplo',
      code: 'EMPRESA-EXEMPLO',
      active: true,
      createdAt: NOW,
    })
    expect(client.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it.each(['', '   ', 'EMPRESA EXEMPLO', 'EMPRESA_A', '../A', 'ÇLIENTE', 'A'.repeat(21)])(
    'rejeita o código %j',
    (code) => {
      expect(() => Client.create({ name: 'Cliente A', code }, NOW)).toThrow(InvalidClientCodeError)
    },
  )

  it('aceita código com exatamente 20 caracteres', () => {
    expect(Client.create({ name: 'Cliente A', code: 'A'.repeat(20) }, NOW).code).toBe(
      'A'.repeat(20),
    )
  })
})
