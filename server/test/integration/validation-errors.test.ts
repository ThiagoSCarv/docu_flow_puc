import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

type ValidationBody = { message: string; fields: { field: string; message: string }[] }

describe('erros de validação de entrada', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    adminToken = await ctx.tokenFor('admin@exemplo.com')
  })

  afterAll(() => ctx.close())

  const auth = () => ({ authorization: `Bearer ${adminToken}` })

  it('query inválida retorna 400 em português com o campo', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/documents?limit=500',
      headers: auth(),
    })
    expect(response.statusCode).toBe(400)
    const body = response.json() as ValidationBody
    expect(body.message).toBe('Dados inválidos.')
    expect(body.fields).toEqual([
      { field: 'limit', message: 'Grande demais: esperava que o número fosse <= 100' },
    ])
  })

  it('body inválido lista cada campo em português', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nao-e-email' },
    })
    expect(response.statusCode).toBe(400)
    const body = response.json() as ValidationBody
    expect(body.message).toBe('Dados inválidos.')
    expect(body.fields.map((field) => field.field)).toEqual(['email', 'password'])
    expect(body.fields[0]?.message).toBe('Formato do endereço de e-mail inválido')
  })

  it('body ausente aponta o próprio body', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: auth(),
    })
    expect(response.statusCode).toBe(400)
    const body = response.json() as ValidationBody
    expect(body.fields).toHaveLength(1)
    expect(body.fields[0]?.field).toBe('body')
  })

  it('params inválido retorna 400 em português', async () => {
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/users/123/password',
      headers: auth(),
      payload: { password: 'senha1234' },
    })
    expect(response.statusCode).toBe(400)
    const body = response.json() as ValidationBody
    expect(body.message).toBe('Dados inválidos.')
    expect(body.fields).toEqual([{ field: 'id', message: 'Formato do UUID inválido' }])
  })

  it('erro de domínio continua só com message', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/users',
      headers: auth(),
      payload: {
        name: 'Nova',
        email: 'nova@exemplo.com',
        password: 'curta1',
        role: UserRole.CONSULTA,
        categoryIds: [],
      },
    })
    expect(response.statusCode).toBe(400)
    expect(Object.keys(response.json())).toEqual(['message'])
  })
})
