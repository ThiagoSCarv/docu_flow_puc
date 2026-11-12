import { describe, expect, it } from 'vitest'
import { Backup } from '../../../src/domain/backup/backup.entity.js'
import { BackupInFutureError } from '../../../src/domain/backup/backup.errors.js'
import { BackupStatus } from '../../../src/shared/utils/enums.js'

const NOW = new Date('2026-11-12T12:00:00Z')

const input = (overrides: Partial<Parameters<typeof Backup.create>[0]> = {}) => ({
  performedAt: new Date('2026-11-11T22:00:00Z'),
  status: BackupStatus.REALIZADO,
  scope: ' Pasta Clientes no Google Drive ',
  notes: ' Backup semanal ',
  responsibleId: 'admin-id',
  ...overrides,
})

describe('Backup.create', () => {
  it('cria o backup com escopo e observação sem espaços nas pontas', () => {
    const backup = Backup.create(input(), NOW)
    expect(backup).toMatchObject({
      performedAt: new Date('2026-11-11T22:00:00Z'),
      status: BackupStatus.REALIZADO,
      scope: 'Pasta Clientes no Google Drive',
      notes: 'Backup semanal',
      responsibleId: 'admin-id',
    })
    expect(backup.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it.each([undefined, '   '])('observação %j vira null', (notes) => {
    expect(Backup.create(input({ notes }), NOW).notes).toBeNull()
  })

  it('aceita backup registrado no momento atual', () => {
    expect(Backup.create(input({ performedAt: NOW }), NOW).performedAt).toEqual(NOW)
  })

  it('rejeita backup com data no futuro', () => {
    const future = new Date(NOW.getTime() + 60_000)
    expect(() => Backup.create(input({ performedAt: future }), NOW)).toThrow(BackupInFutureError)
  })
})
