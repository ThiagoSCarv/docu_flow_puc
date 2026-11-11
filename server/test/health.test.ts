import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'

describe('infraestrutura da API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  it('GET /api/health responde ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('GET /docs/json retorna o OpenAPI', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/json' })
    expect(response.statusCode).toBe(200)
    expect(response.json().paths).toHaveProperty('/api/health')
  })
})
