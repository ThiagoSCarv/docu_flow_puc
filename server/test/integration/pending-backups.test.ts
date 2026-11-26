import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BackupStatus, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('GET /api/backups/pending (RF25)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let consultaToken: string

  const register = (performedAt: string, status: BackupStatus) =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/backups',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { performedAt, status, scope: 'Pasta Clientes' },
    })

  const pending = (token?: string, query = '') =>
    ctx.app.inject({
      method: 'GET',
      url: `/api/backups/pending${query}`,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })

  const performedDates = (response: Awaited<ReturnType<typeof pending>>) =>
    response.json().items.map((backup: { performedAt: string }) => backup.performedAt)

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com')
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
  })

  afterAll(() => ctx.close())

  it('sem nenhuma verificação, todo REALIZADO está pendente', async () => {
    await register('2026-11-01T10:00:00Z', BackupStatus.REALIZADO)
    await register('2026-11-02T10:00:00Z', BackupStatus.FALHOU)

    const response = await pending(adminToken)

    expect(response.statusCode).toBe(200)
    expect(performedDates(response)).toEqual(['2026-11-01T10:00:00.000Z'])
    expect(response.json().total).toBe(1)
  })

  it('só fica pendente o REALIZADO depois do último VERIFICADO, do mais recente ao mais antigo', async () => {
    await register('2026-11-03T10:00:00Z', BackupStatus.VERIFICADO)
    await register('2026-11-04T10:00:00Z', BackupStatus.REALIZADO)
    await register('2026-11-05T10:00:00Z', BackupStatus.REALIZADO)

    const response = await pending(consultaToken)

    expect(performedDates(response)).toEqual([
      '2026-11-05T10:00:00.000Z',
      '2026-11-04T10:00:00.000Z',
    ])
    expect(response.json().total).toBe(2)
  })

  it('pagina com limit e offset', async () => {
    const response = await pending(adminToken, '?limit=1&offset=1')

    expect(performedDates(response)).toEqual(['2026-11-04T10:00:00.000Z'])
    expect(response.json().total).toBe(2)
  })

  it('limit fora da faixa retorna 400 e sem token retorna 401', async () => {
    expect((await pending(adminToken, '?limit=0')).statusCode).toBe(400)
    expect((await pending()).statusCode).toBe(401)
  })
})
