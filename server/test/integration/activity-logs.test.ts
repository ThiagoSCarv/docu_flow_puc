import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ActivityAction, ActivityEntity, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('GET /api/activity-logs (RF27)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminId: string
  let funcionarioId: string
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string
  let clientId: string

  const list = (token?: string, query = '') =>
    ctx.app.inject({
      method: 'GET',
      url: `/api/activity-logs${query}`,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })

  beforeAll(async () => {
    ctx = await createTestApp()
    adminId = (await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')).id
    funcionarioId = (await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com')).id
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com')
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    funcionarioToken = await ctx.tokenFor('func@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Cliente A', code: 'CLI-A' },
    })
    clientId = created.json().id
  })

  afterAll(() => ctx.close())

  it('ADMIN vê o log do mais recente ao mais antigo, com quem fez a ação', async () => {
    const response = await list(adminToken)

    expect(response.statusCode).toBe(200)
    const [latest] = response.json().items
    expect(latest).toMatchObject({
      action: ActivityAction.CLIENTE_CRIADO,
      entity: ActivityEntity.CLIENTS,
      entityId: clientId,
      user: { id: adminId, name: `Usuário ${UserRole.ADMIN}` },
    })
    expect(response.json().total).toBe(4)
  })

  it('filtra por ação e por usuário', async () => {
    const logins = await list(adminToken, `?action=${ActivityAction.LOGIN_SUCESSO}`)
    const fromFuncionario = await list(adminToken, `?userId=${funcionarioId}`)

    expect(logins.json().total).toBe(3)
    expect(fromFuncionario.json().items).toEqual([
      expect.objectContaining({ action: ActivityAction.LOGIN_SUCESSO }),
    ])
  })

  it('ação desconhecida retorna 400', async () => {
    const response = await list(adminToken, '?action=APAGAR_TUDO')

    expect(response.statusCode).toBe(400)
    expect(response.json().fields[0].field).toBe('action')
  })

  it('FUNCIONARIO e CONSULTA recebem 403; sem token, 401', async () => {
    expect((await list(funcionarioToken)).statusCode).toBe(403)
    expect((await list(consultaToken)).statusCode).toBe(403)
    expect((await list()).statusCode).toBe(401)
  })

  it('consultar o log não gera registro novo', async () => {
    const before = (await list(adminToken)).json().total
    const after = (await list(adminToken)).json().total

    expect(after).toBe(before)
  })
})
