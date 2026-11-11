import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { activityLogs, users } from '../../src/infra/database/schema.js'
import { ActivityAction, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp, TEST_PASSWORD } from '../helpers/app.js'

type Ctx = Awaited<ReturnType<typeof createTestApp>>

const login = (ctx: Ctx, email: string, password: string) =>
  ctx.app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })

describe('POST /api/auth/login', () => {
  let ctx: Ctx

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com')
  })

  afterAll(() => ctx.close())

  it('login válido retorna token', async () => {
    const response = await login(ctx, 'func@exemplo.com', TEST_PASSWORD)
    expect(response.statusCode).toBe(200)
    expect(response.json().token).toEqual(expect.any(String))
  })

  it('aceita e-mail com letras maiúsculas', async () => {
    const response = await login(ctx, 'FUNC@Exemplo.com', TEST_PASSWORD)
    expect(response.statusCode).toBe(200)
  })

  it('token expira em 1 hora', async () => {
    const { token } = (await login(ctx, 'func@exemplo.com', TEST_PASSWORD)).json()
    const payload = ctx.app.jwt.decode<{ iat: number; exp: number }>(token)
    expect(payload && payload.exp - payload.iat).toBe(3600)
  })

  it('senha errada retorna 401 com mensagem genérica', async () => {
    const response = await login(ctx, 'func@exemplo.com', 'errada123')
    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ message: 'E-mail ou senha inválidos' })
  })

  it('e-mail inexistente retorna a mesma resposta da senha errada', async () => {
    const response = await login(ctx, 'ninguem@exemplo.com', 'errada123')
    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ message: 'E-mail ou senha inválidos' })
  })

  it('usuário inativo recebe a mesma resposta genérica', async () => {
    await ctx.createUser(UserRole.CONSULTA, 'inativo@exemplo.com')
    await ctx.db.update(users).set({ active: false }).where(eq(users.email, 'inativo@exemplo.com'))
    const response = await login(ctx, 'inativo@exemplo.com', TEST_PASSWORD)
    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ message: 'E-mail ou senha inválidos' })
  })

  it('body inválido retorna 400', async () => {
    const response = await login(ctx, 'nao-e-email', '')
    expect(response.statusCode).toBe(400)
  })

  it('registra login com sucesso e com falha no log', async () => {
    const logs = await ctx.db.select({ action: activityLogs.action }).from(activityLogs)
    const actions = logs.map((l) => l.action)
    expect(actions).toContain(ActivityAction.LOGIN_SUCESSO)
    expect(actions).toContain(ActivityAction.LOGIN_FALHA)
  })
})

describe('bloqueio após tentativas incorretas', () => {
  let ctx: Ctx

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.FUNCIONARIO, 'alvo@exemplo.com')
  })

  afterAll(() => ctx.close())

  it('a 5ª falha bloqueia com 423', async () => {
    for (let i = 0; i < 4; i++) {
      expect((await login(ctx, 'alvo@exemplo.com', 'errada123')).statusCode).toBe(401)
    }
    expect((await login(ctx, 'alvo@exemplo.com', 'errada123')).statusCode).toBe(423)
  })

  it('conta bloqueada recusa até a senha correta', async () => {
    expect((await login(ctx, 'alvo@exemplo.com', TEST_PASSWORD)).statusCode).toBe(423)
  })

  it('libera o login depois que o bloqueio expira', async () => {
    await ctx.db
      .update(users)
      .set({ lockedUntil: new Date(Date.now() - 1000) })
      .where(eq(users.email, 'alvo@exemplo.com'))
    expect((await login(ctx, 'alvo@exemplo.com', TEST_PASSWORD)).statusCode).toBe(200)
  })

  it('login com sucesso zera o contador de falhas', async () => {
    const [user] = await ctx.db.select().from(users).where(eq(users.email, 'alvo@exemplo.com'))
    expect(user.failedLoginAttempts).toBe(0)
    expect(user.lockedUntil).toBeNull()
  })
})

describe('rate limit do login', () => {
  let ctx: Ctx

  beforeAll(async () => {
    ctx = await createTestApp()
  })

  afterAll(() => ctx.close())

  it('a 11ª tentativa no mesmo minuto retorna 429', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await login(ctx, `x${i}@exemplo.com`, 'errada123')).statusCode).toBe(401)
    }
    expect((await login(ctx, 'x@exemplo.com', 'errada123')).statusCode).toBe(429)
  })
})

describe('GET /api/auth/me', () => {
  let ctx: Ctx

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com')
  })

  afterAll(() => ctx.close())

  it('sem token retorna 401', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(response.statusCode).toBe(401)
  })

  it('token inválido retorna 401', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Bearer token-falso' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('com token devolve o usuário sem passwordHash', async () => {
    const token = await ctx.tokenFor('consulta@exemplo.com')
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toMatchObject({ email: 'consulta@exemplo.com', role: UserRole.CONSULTA })
    expect(body).not.toHaveProperty('passwordHash')
    expect(body).not.toHaveProperty('failedLoginAttempts')
  })

  it('usuário desativado perde o acesso mesmo com token válido', async () => {
    const token = await ctx.tokenFor('consulta@exemplo.com')
    await ctx.db.update(users).set({ active: false }).where(eq(users.email, 'consulta@exemplo.com'))
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(response.statusCode).toBe(401)
  })
})
