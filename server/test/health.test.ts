import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from './helpers/app.js'

describe('infraestrutura da API', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>

  beforeAll(async () => {
    ctx = await createTestApp()
  })

  afterAll(() => ctx.close())

  it('GET /api/health responde ok', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('GET /docs/json retorna o OpenAPI', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/docs/json' })
    expect(response.statusCode).toBe(200)
    expect(response.json().paths).toHaveProperty('/api/health')
  })
})
