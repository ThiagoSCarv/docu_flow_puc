import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { categories } from '../../src/infra/database/schema.js'
import { BackupStatus, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('GET /api/dashboard (RF29)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string
  let fiscaisId: string

  const as = (token: string) => ({ authorization: `Bearer ${token}` })

  const dashboard = (token?: string) =>
    ctx.app.inject({ method: 'GET', url: '/api/dashboard', headers: token ? as(token) : {} })

  const categoryId = async (code: string) => {
    const [category] = await ctx.db.select().from(categories).where(eq(categories.code, code))
    return category.id
  }

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com', ['FIS'])
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com')
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    funcionarioToken = await ctx.tokenFor('func@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
    fiscaisId = await categoryId('FIS')
    const contabeisId = await categoryId('CONT')

    const client = await ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: as(adminToken),
      payload: { name: 'Cliente A', code: 'CLI-A' },
    })
    const inactive = await ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: as(adminToken),
      payload: { name: 'Cliente B', code: 'CLI-B' },
    })
    await ctx.app.inject({
      method: 'PATCH',
      url: `/api/clients/${inactive.json().id}/status`,
      headers: as(adminToken),
      payload: { active: false },
    })
    for (const [category, description] of [
      [fiscaisId, 'guia icms'],
      [fiscaisId, 'guia iss'],
      [contabeisId, 'balanco'],
    ]) {
      await ctx.app.inject({
        method: 'POST',
        url: '/api/documents',
        headers: as(adminToken),
        payload: {
          clientId: client.json().id,
          categoryId: category,
          period: '2026-10',
          description,
          cloudLocation: 'https://nuvem.exemplo.com/arquivo',
        },
      })
    }
    await ctx.app.inject({
      method: 'POST',
      url: '/api/backups',
      headers: as(adminToken),
      payload: {
        performedAt: '2026-11-10T10:00:00Z',
        status: BackupStatus.REALIZADO,
        scope: 'Drive',
      },
    })
  })

  afterAll(() => ctx.close())

  it('ADMIN vê todos os documentos, clientes por situação e backups pendentes', async () => {
    const response = await dashboard(adminToken)

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      documents: { total: 3 },
      clients: { active: 1, inactive: 1 },
      backups: {
        pendingVerification: 1,
        latest: { performedAt: '2026-11-10T10:00:00.000Z', status: BackupStatus.REALIZADO },
      },
    })
    expect(response.json().documents.byCategory).toHaveLength(2)
  })

  it('FUNCIONARIO conta só os documentos das categorias permitidas', async () => {
    const response = await dashboard(funcionarioToken)

    expect(response.json().documents).toEqual({
      total: 2,
      byCategory: [{ categoryId: fiscaisId, total: 2 }],
    })
  })

  it('CONSULTA sem categorias vê zero documentos', async () => {
    const response = await dashboard(consultaToken)

    expect(response.statusCode).toBe(200)
    expect(response.json().documents).toEqual({ total: 0, byCategory: [] })
  })

  it('sem token retorna 401', async () => {
    expect((await dashboard()).statusCode).toBe(401)
  })
})
