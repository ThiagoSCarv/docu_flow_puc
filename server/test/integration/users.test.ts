import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  activityLogs,
  categories,
  userCategoryPermissions,
  users,
} from '../../src/infra/database/schema.js'
import { ActivityAction, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('/api/users', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string
  let fiscaisId: string

  const novoUsuario = (overrides: Record<string, unknown> = {}) => ({
    name: 'Maria Exemplo',
    email: 'Maria@Exemplo.com',
    password: 'senhaforte1',
    role: UserRole.FUNCIONARIO,
    categoryIds: [fiscaisId],
    ...overrides,
  })

  const post = (token: string, payload: Record<string, unknown>) =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { authorization: `Bearer ${token}` },
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
    const [fiscais] = await ctx.db.select().from(categories).where(eq(categories.code, 'FIS'))
    fiscaisId = fiscais.id
  })

  afterAll(() => ctx.close())

  it('ADMIN cadastra usuário com e-mail minúsculo e sem passwordHash na resposta', async () => {
    const response = await post(adminToken, novoUsuario())
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toMatchObject({
      email: 'maria@exemplo.com',
      role: UserRole.FUNCIONARIO,
      active: true,
    })
    expect(body).not.toHaveProperty('passwordHash')
  })

  it('grava a senha com hash bcrypt', async () => {
    const [user] = await ctx.db.select().from(users).where(eq(users.email, 'maria@exemplo.com'))
    expect(user.passwordHash).toMatch(/^\$2[aby]\$10\$/)
    expect(user.passwordHash).not.toContain('senhaforte1')
  })

  it('grava as categorias permitidas', async () => {
    const [user] = await ctx.db.select().from(users).where(eq(users.email, 'maria@exemplo.com'))
    const permissions = await ctx.db
      .select()
      .from(userCategoryPermissions)
      .where(eq(userCategoryPermissions.userId, user.id))
    expect(permissions.map((p) => p.categoryId)).toEqual([fiscaisId])
  })

  it('registra a criação no log', async () => {
    const logs = await ctx.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.action, ActivityAction.USUARIO_CRIADO))
    expect(logs).toHaveLength(1)
  })

  it('o usuário criado consegue fazer login', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'maria@exemplo.com', password: 'senhaforte1' },
    })
    expect(response.statusCode).toBe(200)
  })

  it('e-mail já cadastrado retorna 409', async () => {
    const response = await post(adminToken, novoUsuario({ email: 'MARIA@exemplo.com' }))
    expect(response.statusCode).toBe(409)
  })

  it.each([
    ['curta', 'abc123'],
    ['sem números', 'somenteletras'],
    ['sem letras', '12345678'],
  ])('senha %s retorna 400', async (_, password) => {
    const response = await post(adminToken, novoUsuario({ email: 'nova@exemplo.com', password }))
    expect(response.statusCode).toBe(400)
  })

  it('perfil inexistente retorna 400', async () => {
    const response = await post(
      adminToken,
      novoUsuario({ email: 'nova@exemplo.com', role: 'ROOT' }),
    )
    expect(response.statusCode).toBe(400)
  })

  it('categoria inexistente retorna 400', async () => {
    const response = await post(
      adminToken,
      novoUsuario({ email: 'nova@exemplo.com', categoryIds: [crypto.randomUUID()] }),
    )
    expect(response.statusCode).toBe(400)
  })

  it('FUNCIONARIO recebe 403 ao cadastrar usuário', async () => {
    const response = await post(funcionarioToken, novoUsuario({ email: 'nova@exemplo.com' }))
    expect(response.statusCode).toBe(403)
  })

  it('CONSULTA recebe 403 ao cadastrar usuário', async () => {
    const response = await post(consultaToken, novoUsuario({ email: 'nova@exemplo.com' }))
    expect(response.statusCode).toBe(403)
  })

  it('sem token retorna 401', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/users' })
    expect(response.statusCode).toBe(401)
  })

  it('ADMIN lista usuários sem passwordHash', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.total).toBe(4)
    expect(body.items).toHaveLength(4)
    for (const user of body.items) expect(user).not.toHaveProperty('passwordHash')
  })

  it('FUNCIONARIO recebe 403 ao listar usuários', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { authorization: `Bearer ${funcionarioToken}` },
    })
    expect(response.statusCode).toBe(403)
  })
})
