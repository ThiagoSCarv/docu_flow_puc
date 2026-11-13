import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../helpers/app.js'

const INDEX_HTML = '<!doctype html><html><body><div id="root"></div></body></html>'
const ASSET_JS = 'console.log("organizadoc")'

describe('front servido pelo Fastify', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let webDistDir: string

  beforeAll(async () => {
    webDistDir = await mkdtemp(join(tmpdir(), 'organizadoc-web-'))
    await mkdir(join(webDistDir, 'assets'))
    await writeFile(join(webDistDir, 'index.html'), INDEX_HTML)
    await writeFile(join(webDistDir, 'assets', 'app.js'), ASSET_JS)
    ctx = await createTestApp({ webDistDir })
  })

  afterAll(async () => {
    await ctx.close()
    await rm(webDistDir, { recursive: true, force: true })
  })

  it('GET / devolve o index.html', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/' })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.body).toBe(INDEX_HTML)
  })

  it('GET de um asset devolve o arquivo', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/assets/app.js' })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('javascript')
    expect(response.body).toBe(ASSET_JS)
  })

  it('GET de rota do React Router cai no index.html', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/documentos' })
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(INDEX_HTML)
  })

  it('GET de rota inexistente sob /api devolve 404 em JSON', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/nao-existe' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'Rota não encontrada' })
  })

  it('POST fora de /api não devolve o index.html', async () => {
    const response = await ctx.app.inject({ method: 'POST', url: '/documentos' })
    expect(response.statusCode).toBe(404)
  })

  it('a API continua respondendo', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
  })

  it('o /docs continua respondendo', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/docs/json' })
    expect(response.statusCode).toBe(200)
  })
})
