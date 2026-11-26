import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { activityLogs, categories } from '../../src/infra/database/schema.js'
import { ActivityAction, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('manutenção de clientes (RF07, RF10)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string
  let clientId: string
  let fiscaisId: string

  const patch = (url: string, payload: unknown, token?: string) =>
    ctx.app.inject({
      method: 'PATCH',
      url,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload: payload as object,
    })

  const lastLogAction = async () => {
    const logs = await ctx.db.select().from(activityLogs).where(eq(activityLogs.entityId, clientId))
    return logs.at(-1)?.action
  }

  const createDocument = () =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        clientId,
        categoryId: fiscaisId,
        period: '2026-10',
        description: `guia ${crypto.randomUUID().slice(0, 8)}`,
        cloudLocation: 'https://nuvem.exemplo.com/guia',
      },
    })

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com', ['FIS'])
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com')
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    funcionarioToken = await ctx.tokenFor('func@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Cliente A', code: 'cli-a' },
    })
    clientId = created.json().id
    const [fiscais] = await ctx.db.select().from(categories).where(eq(categories.code, 'FIS'))
    fiscaisId = fiscais.id
  })

  afterAll(() => ctx.close())

  describe('PATCH /api/clients/:id', () => {
    it('ADMIN renomeia, o código continua o mesmo e o log registra', async () => {
      const response = await patch(
        `/api/clients/${clientId}`,
        { name: ' Cliente A Ltda ' },
        adminToken,
      )

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({
        id: clientId,
        name: 'Cliente A Ltda',
        code: 'CLI-A',
        active: true,
      })
      expect(await lastLogAction()).toBe(ActivityAction.CLIENTE_ALTERADO)
    })

    it('nome vazio retorna 400 e cliente inexistente retorna 404', async () => {
      const empty = await patch(`/api/clients/${clientId}`, { name: '  ' }, adminToken)
      const missing = await patch(`/api/clients/${crypto.randomUUID()}`, { name: 'X' }, adminToken)

      expect(empty.statusCode).toBe(400)
      expect(missing.statusCode).toBe(404)
      expect(missing.json()).toEqual({ message: 'Cliente não encontrado' })
    })

    it('FUNCIONARIO e CONSULTA recebem 403; sem token, 401', async () => {
      const url = `/api/clients/${clientId}`
      expect((await patch(url, { name: 'X' }, funcionarioToken)).statusCode).toBe(403)
      expect((await patch(url, { name: 'X' }, consultaToken)).statusCode).toBe(403)
      expect((await patch(url, { name: 'X' })).statusCode).toBe(401)
    })
  })

  describe('PATCH /api/clients/:id/status', () => {
    it('inativar mantém os documentos e bloqueia documentos novos', async () => {
      expect((await createDocument()).statusCode).toBe(201)

      const response = await patch(`/api/clients/${clientId}/status`, { active: false }, adminToken)
      const documents = await ctx.app.inject({
        method: 'GET',
        url: `/api/documents?clientId=${clientId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ active: false })
      expect(documents.json().total).toBe(1)
      expect((await createDocument()).statusCode).toBe(400)
      expect(await lastLogAction()).toBe(ActivityAction.CLIENTE_INATIVADO)
    })

    it('reativar volta a aceitar documentos', async () => {
      const response = await patch(`/api/clients/${clientId}/status`, { active: true }, adminToken)

      expect(response.json()).toMatchObject({ active: true })
      expect((await createDocument()).statusCode).toBe(201)
      expect(await lastLogAction()).toBe(ActivityAction.CLIENTE_REATIVADO)
    })

    it('corpo inválido retorna 400; FUNCIONARIO recebe 403', async () => {
      const url = `/api/clients/${clientId}/status`
      expect((await patch(url, { active: 'nao' }, adminToken)).statusCode).toBe(400)
      expect((await patch(url, { active: false }, funcionarioToken)).statusCode).toBe(403)
    })
  })
})
