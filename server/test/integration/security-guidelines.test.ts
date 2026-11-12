import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SECURITY_GUIDELINES } from '../../src/domain/awareness/security-guidelines.js'
import { UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('GET /api/security-guidelines', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>

  const get = (token?: string) =>
    ctx.app.inject({
      method: 'GET',
      url: '/api/security-guidelines',
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com')
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com')
  })

  afterAll(() => ctx.close())

  it.each([
    [UserRole.ADMIN, 'admin@exemplo.com'],
    [UserRole.FUNCIONARIO, 'func@exemplo.com'],
    [UserRole.CONSULTA, 'consulta@exemplo.com'],
  ])('%s recebe as orientações na ordem do conteúdo', async (_role, email) => {
    const response = await get(await ctx.tokenFor(email))
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(SECURITY_GUIDELINES)
  })

  it('sem token retorna 401', async () => {
    expect((await get()).statusCode).toBe(401)
  })

  it('aparece no OpenAPI', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/docs/json' })
    expect(response.json().paths).toHaveProperty('/api/security-guidelines')
  })
})
