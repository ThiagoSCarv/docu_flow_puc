import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { activityLogs, users } from '../../src/infra/database/schema.js'
import { ActivityAction, ActivityEntity, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp, TEST_PASSWORD } from '../helpers/app.js'

const NEW_PASSWORD = 'senhanova2'

describe('PATCH /api/users/:id/password', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string
  let mariaId: string

  const patch = (token: string, userId: string, password: unknown) =>
    ctx.app.inject({
      method: 'PATCH',
      url: `/api/users/${userId}/password`,
      headers: { authorization: `Bearer ${token}` },
      payload: { password },
    })

  const login = (email: string, password: string) =>
    ctx.app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com')
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com')
    const maria = await ctx.createUser(UserRole.FUNCIONARIO, 'maria@exemplo.com')
    mariaId = maria.id
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    funcionarioToken = await ctx.tokenFor('func@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
  })

  afterAll(() => ctx.close())

  it('ADMIN redefine a senha, desbloqueia a conta e a nova senha passa a valer', async () => {
    await ctx.db
      .update(users)
      .set({ lockedUntil: new Date(Date.now() + 15 * 60 * 1000) })
      .where(eq(users.id, mariaId))

    const response = await patch(adminToken, mariaId, NEW_PASSWORD)

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')
    expect((await login('maria@exemplo.com', TEST_PASSWORD)).statusCode).toBe(401)
    expect((await login('maria@exemplo.com', NEW_PASSWORD)).statusCode).toBe(200)
  })

  it('registra a redefinição no log de atividades', async () => {
    await patch(adminToken, mariaId, 'outrasenha3')

    const logs = await ctx.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.action, ActivityAction.SENHA_REDEFINIDA))
    expect(logs.at(-1)).toMatchObject({ entity: ActivityEntity.USERS, entityId: mariaId })
  })

  it('senha fraca retorna 400', async () => {
    const response = await patch(adminToken, mariaId, 'semnumeros')

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'A senha deve conter números' })
  })

  it('usuário inexistente retorna 404', async () => {
    const response = await patch(adminToken, crypto.randomUUID(), NEW_PASSWORD)

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'Usuário não encontrado' })
  })

  it('id que não é UUID retorna 400', async () => {
    expect((await patch(adminToken, 'nao-e-uuid', NEW_PASSWORD)).statusCode).toBe(400)
  })

  it('FUNCIONARIO e CONSULTA recebem 403', async () => {
    expect((await patch(funcionarioToken, mariaId, NEW_PASSWORD)).statusCode).toBe(403)
    expect((await patch(consultaToken, mariaId, NEW_PASSWORD)).statusCode).toBe(403)
  })

  it('sem token retorna 401', async () => {
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/users/${mariaId}/password`,
      payload: { password: NEW_PASSWORD },
    })

    expect(response.statusCode).toBe(401)
  })
})
