import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { activityLogs, categories } from '../../src/infra/database/schema.js'
import { ActivityAction, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp, TEST_PASSWORD } from '../helpers/app.js'

describe('gestão de acesso dos usuários (RF04, RF20)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminId: string
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string
  let mariaId: string
  let fiscaisId: string
  let contabeisId: string

  const request = (method: 'GET' | 'PATCH', url: string, token?: string, payload?: unknown) =>
    ctx.app.inject({
      method,
      url,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload: payload as object,
    })

  const login = (email: string) =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: TEST_PASSWORD },
    })

  const lastLogAction = async (entityId: string) => {
    const logs = await ctx.db.select().from(activityLogs).where(eq(activityLogs.entityId, entityId))
    return logs.at(-1)?.action
  }

  beforeAll(async () => {
    ctx = await createTestApp()
    const admin = await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    adminId = admin.id
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com', ['FIS'])
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com', ['CONT'])
    const maria = await ctx.createUser(UserRole.FUNCIONARIO, 'maria@exemplo.com', ['FIS'])
    mariaId = maria.id
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    funcionarioToken = await ctx.tokenFor('func@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
    const allCategories = await ctx.db.select().from(categories)
    fiscaisId = allCategories.find((category) => category.code === 'FIS')?.id ?? ''
    contabeisId = allCategories.find((category) => category.code === 'CONT')?.id ?? ''
  })

  afterAll(() => ctx.close())

  describe('PATCH /api/users/:id/status', () => {
    it('ADMIN inativa: o usuário deixa de entrar e o log registra', async () => {
      const response = await request('PATCH', `/api/users/${mariaId}/status`, adminToken, {
        active: false,
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ id: mariaId, active: false })
      expect(response.json()).not.toHaveProperty('passwordHash')
      expect((await login('maria@exemplo.com')).statusCode).toBe(401)
      expect(await lastLogAction(mariaId)).toBe(ActivityAction.USUARIO_INATIVADO)
    })

    it('ADMIN reativa e o usuário volta a entrar', async () => {
      const response = await request('PATCH', `/api/users/${mariaId}/status`, adminToken, {
        active: true,
      })

      expect(response.json()).toMatchObject({ active: true })
      expect((await login('maria@exemplo.com')).statusCode).toBe(200)
      expect(await lastLogAction(mariaId)).toBe(ActivityAction.USUARIO_REATIVADO)
    })

    it('ADMIN não pode inativar a própria conta', async () => {
      const response = await request('PATCH', `/api/users/${adminId}/status`, adminToken, {
        active: false,
      })

      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({ message: 'Você não pode alterar o próprio acesso' })
    })

    it('corpo inválido retorna 400 e usuário inexistente retorna 404', async () => {
      const invalid = await request('PATCH', `/api/users/${mariaId}/status`, adminToken, {
        active: 'sim',
      })
      const missing = await request(
        'PATCH',
        `/api/users/${crypto.randomUUID()}/status`,
        adminToken,
        { active: false },
      )

      expect(invalid.statusCode).toBe(400)
      expect(missing.statusCode).toBe(404)
    })

    it('FUNCIONARIO e CONSULTA recebem 403; sem token, 401', async () => {
      const url = `/api/users/${mariaId}/status`
      expect((await request('PATCH', url, funcionarioToken, { active: false })).statusCode).toBe(
        403,
      )
      expect((await request('PATCH', url, consultaToken, { active: false })).statusCode).toBe(403)
      expect((await request('PATCH', url, undefined, { active: false })).statusCode).toBe(401)
    })
  })

  describe('PATCH /api/users/:id/permissions', () => {
    it('ADMIN troca perfil e categorias, e o log registra PERMISSAO_ALTERADA', async () => {
      const response = await request('PATCH', `/api/users/${mariaId}/permissions`, adminToken, {
        role: UserRole.CONSULTA,
        categoryIds: [contabeisId],
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        role: UserRole.CONSULTA,
        allowedCategoryIds: [contabeisId],
      })
      expect(await lastLogAction(mariaId)).toBe(ActivityAction.PERMISSAO_ALTERADA)
    })

    it('categoria inexistente retorna 400', async () => {
      const response = await request('PATCH', `/api/users/${mariaId}/permissions`, adminToken, {
        role: UserRole.FUNCIONARIO,
        categoryIds: [crypto.randomUUID()],
      })

      expect(response.statusCode).toBe(400)
    })

    it('ADMIN não pode alterar as próprias permissões', async () => {
      const response = await request('PATCH', `/api/users/${adminId}/permissions`, adminToken, {
        role: UserRole.CONSULTA,
        categoryIds: [],
      })

      expect(response.statusCode).toBe(400)
    })

    it('FUNCIONARIO recebe 403', async () => {
      const response = await request(
        'PATCH',
        `/api/users/${mariaId}/permissions`,
        funcionarioToken,
        { role: UserRole.ADMIN, categoryIds: [] },
      )

      expect(response.statusCode).toBe(403)
    })
  })

  describe('GET /api/categories/:id/users', () => {
    it('lista administradores e quem tem a categoria permitida', async () => {
      const response = await request('GET', `/api/categories/${fiscaisId}/users`, adminToken)

      expect(response.statusCode).toBe(200)
      const emails = response.json().items.map((user: { email: string }) => user.email)
      expect(emails).toEqual(['admin@exemplo.com', 'func@exemplo.com'])
      expect(response.json().total).toBe(2)
      expect(response.json().items[0]).not.toHaveProperty('passwordHash')
    })

    it('categoria inexistente retorna 404 e id inválido retorna 400', async () => {
      const missing = await request(
        'GET',
        `/api/categories/${crypto.randomUUID()}/users`,
        adminToken,
      )
      const invalid = await request('GET', '/api/categories/nao-e-uuid/users', adminToken)

      expect(missing.statusCode).toBe(404)
      expect(invalid.statusCode).toBe(400)
    })

    it('FUNCIONARIO e CONSULTA recebem 403; sem token, 401', async () => {
      const url = `/api/categories/${fiscaisId}/users`
      expect((await request('GET', url, funcionarioToken)).statusCode).toBe(403)
      expect((await request('GET', url, consultaToken)).statusCode).toBe(403)
      expect((await request('GET', url)).statusCode).toBe(401)
    })
  })
})
