import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { activityLogs } from '../../src/infra/database/schema.js'
import { ActivityAction, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('POST /api/clients', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string

  const novoCliente = (overrides: Record<string, unknown> = {}) => ({
    name: 'Empresa Exemplo',
    code: 'empresa-exemplo',
    ...overrides,
  })

  const post = (payload: Record<string, unknown>, token?: string) =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload,
    })

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com', ['FIS'])
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com')
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    funcionarioToken = await ctx.tokenFor('func@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
  })

  afterAll(() => ctx.close())

  it('ADMIN cadastra cliente ativo com código em maiúsculas', async () => {
    const response = await post(novoCliente(), adminToken)
    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      name: 'Empresa Exemplo',
      code: 'EMPRESA-EXEMPLO',
      active: true,
    })
  })

  it('registra a criação no log', async () => {
    const logs = await ctx.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.action, ActivityAction.CLIENTE_CRIADO))
    expect(logs).toHaveLength(1)
  })

  it('o cliente criado aparece na listagem', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: { authorization: `Bearer ${consultaToken}` },
    })
    expect(response.json().map((client: { code: string }) => client.code)).toContain(
      'EMPRESA-EXEMPLO',
    )
  })

  it('código repetido retorna 409', async () => {
    const response = await post(novoCliente({ name: 'Outra Empresa' }), adminToken)
    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({ message: 'Código de cliente já cadastrado' })
  })

  it('código inválido retorna 400', async () => {
    const response = await post(novoCliente({ code: 'COM ESPACO' }), adminToken)
    expect(response.statusCode).toBe(400)
  })

  it('nome vazio retorna 400', async () => {
    const response = await post(novoCliente({ name: '   ', code: 'CLIENTE-B' }), adminToken)
    expect(response.statusCode).toBe(400)
  })

  it('FUNCIONARIO recebe 403', async () => {
    const response = await post(novoCliente({ code: 'CLIENTE-C' }), funcionarioToken)
    expect(response.statusCode).toBe(403)
  })

  it('CONSULTA recebe 403', async () => {
    const response = await post(novoCliente({ code: 'CLIENTE-D' }), consultaToken)
    expect(response.statusCode).toBe(403)
  })

  it('sem token retorna 401', async () => {
    const response = await post(novoCliente({ code: 'CLIENTE-E' }))
    expect(response.statusCode).toBe(401)
  })
})
