import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  DEMO_EMPLOYEE_CATEGORIES,
  DEMO_EMPLOYEE_EMAIL,
  demoBackupCount,
  demoDocumentCount,
  demoUserCount,
  seedDemoData,
} from '../../src/infra/database/demo-seed.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../src/infra/http/schemas.js'
import { UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp, TEST_PASSWORD } from '../helpers/app.js'

const CLIENT_COUNT = 30

type PageBody = { items: { id: string; name: string }[]; total: number }

describe('paginação das listagens', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let employeeToken: string

  beforeAll(async () => {
    ctx = await createTestApp()
    const admin = await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await seedDemoData(ctx.db, { admin, password: TEST_PASSWORD, clientCount: CLIENT_COUNT })
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    employeeToken = await ctx.tokenFor(DEMO_EMPLOYEE_EMAIL)
  })

  afterAll(() => ctx.close())

  const get = (url: string, token = adminToken) =>
    ctx.app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } })

  const pageOf = async (url: string, token = adminToken) =>
    (await get(url, token)).json() as PageBody

  it.each([
    ['/api/documents', demoDocumentCount(CLIENT_COUNT)],
    ['/api/clients', CLIENT_COUNT],
    ['/api/backups', demoBackupCount(CLIENT_COUNT)],
    ['/api/users', demoUserCount(CLIENT_COUNT) + 1],
  ])('%s devolve { items, total } com %i itens no total', async (url, expectedTotal) => {
    const response = await get(url)
    expect(response.statusCode).toBe(200)
    const page = response.json() as PageBody
    expect(page.total).toBe(expectedTotal)
    expect(page.items).toHaveLength(Math.min(expectedTotal, DEFAULT_PAGE_SIZE))
  })

  it(`sem limit devolve ${DEFAULT_PAGE_SIZE} itens`, async () => {
    expect((await pageOf('/api/documents')).items).toHaveLength(DEFAULT_PAGE_SIZE)
  })

  it('páginas seguidas não repetem nem pulam itens', async () => {
    const total = demoDocumentCount(CLIENT_COUNT)
    const ids: string[] = []
    for (let offset = 0; offset < total; offset += 40) {
      const page = await pageOf(`/api/documents?limit=40&offset=${offset}`)
      ids.push(...page.items.map((item) => item.id))
    }
    expect(ids).toHaveLength(total)
    expect(new Set(ids).size).toBe(total)
  })

  it('offset depois do fim devolve lista vazia com o total', async () => {
    const page = await pageOf('/api/clients?offset=1000')
    expect(page).toEqual({ items: [], total: CLIENT_COUNT })
  })

  it(`aceita limit de até ${MAX_PAGE_SIZE}`, async () => {
    expect((await pageOf(`/api/documents?limit=${MAX_PAGE_SIZE}`)).items).toHaveLength(
      Math.min(MAX_PAGE_SIZE, demoDocumentCount(CLIENT_COUNT)),
    )
  })

  it.each([`limit=${MAX_PAGE_SIZE + 1}`, 'limit=0', 'limit=abc', 'limit=2.5', 'offset=-1'])(
    'recusa %s com 400',
    async (query) => {
      const response = await get(`/api/documents?${query}`)
      expect(response.statusCode).toBe(400)
    },
  )

  it('o total do FUNCIONARIO conta só as categorias permitidas', async () => {
    const page = await pageOf(`/api/documents?limit=${MAX_PAGE_SIZE}`, employeeToken)
    const adminTotal = (await pageOf('/api/documents')).total
    const pattern = new RegExp(`_(${DEMO_EMPLOYEE_CATEGORIES.join('|')})_`)
    expect(page.total).toBeLessThan(adminTotal)
    expect(page.items.every((item) => pattern.test(item.name))).toBe(true)
  })

  it('filtros e paginação combinam: o total segue o filtro', async () => {
    const page = await pageOf('/api/documents?search=CLI-0001&limit=2')
    expect(page.total).toBe(4)
    expect(page.items).toHaveLength(2)
  })
})
