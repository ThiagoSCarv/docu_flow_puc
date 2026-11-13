import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  DEMO_CLIENT_COUNT,
  DEMO_VIEWER_CATEGORIES,
  DEMO_VIEWER_EMAIL,
  type DemoSeedSummary,
  demoBackupCount,
  demoDocumentCount,
  demoUserCount,
  seedDemoData,
} from '../../src/infra/database/demo-seed.js'
import {
  activityLogs,
  backups,
  clients,
  documents,
  users,
} from '../../src/infra/database/schema.js'
import { UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp, TEST_PASSWORD } from '../helpers/app.js'

const TEST_CLIENT_COUNT = 12

describe('seed de dados de demonstração', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let admin: { id: string; name: string }
  let adminToken: string
  let summary: DemoSeedSummary | null

  beforeAll(async () => {
    ctx = await createTestApp()
    admin = await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    summary = await seedDemoData(ctx.db, {
      admin,
      password: TEST_PASSWORD,
      clientCount: TEST_CLIENT_COUNT,
    })
    adminToken = await ctx.tokenFor('admin@exemplo.com')
  })

  afterAll(() => ctx.close())

  async function listDocumentNames(token: string) {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/documents',
      headers: { authorization: `Bearer ${token}` },
    })
    return (response.json() as { name: string }[]).map((document) => document.name)
  }

  it('na escala padrão gera mil clientes e o restante na mesma proporção', () => {
    expect(DEMO_CLIENT_COUNT).toBe(1000)
    expect(demoUserCount(DEMO_CLIENT_COUNT)).toBe(500)
    expect(demoDocumentCount(DEMO_CLIENT_COUNT)).toBe(3250)
    expect(demoBackupCount(DEMO_CLIENT_COUNT)).toBe(1000)
  })

  it('grava a quantidade pedida de cada tipo de dado', async () => {
    expect(summary).toEqual({
      users: demoUserCount(TEST_CLIENT_COUNT),
      clients: TEST_CLIENT_COUNT,
      documents: demoDocumentCount(TEST_CLIENT_COUNT),
      backups: demoBackupCount(TEST_CLIENT_COUNT),
    })
    expect(await ctx.db.select().from(clients)).toHaveLength(TEST_CLIENT_COUNT)
    expect(await ctx.db.select().from(documents)).toHaveLength(demoDocumentCount(TEST_CLIENT_COUNT))
    expect(await ctx.db.select().from(backups)).toHaveLength(demoBackupCount(TEST_CLIENT_COUNT))
    expect(await ctx.db.select().from(users)).toHaveLength(demoUserCount(TEST_CLIENT_COUNT) + 1)
  })

  it('gera os nomes padronizados pelo domínio', async () => {
    const names = await listDocumentNames(adminToken)
    expect(names).toContain('CLI-0001_CONT_2026-01_balanco-patrimonial')
    expect(names.every((name) => /^CLI-\d{4}_[A-Z]+_2026-\d{2}_[a-z0-9-]+$/.test(name))).toBe(true)
  })

  it('registra cada criação no log de atividades', async () => {
    const created =
      demoUserCount(TEST_CLIENT_COUNT) +
      TEST_CLIENT_COUNT +
      demoDocumentCount(TEST_CLIENT_COUNT) +
      demoBackupCount(TEST_CLIENT_COUNT)
    const adminLogin = 1
    expect(await ctx.db.select().from(activityLogs)).toHaveLength(created + adminLogin)
  })

  it('nenhum backup fica no futuro', async () => {
    const rows = await ctx.db.select().from(backups)
    expect(rows.every((backup) => backup.performedAt.getTime() <= Date.now())).toBe(true)
  })

  it('usuário de demonstração entra com a senha da seed e vê só as categorias liberadas', async () => {
    const viewerToken = await ctx.tokenFor(DEMO_VIEWER_EMAIL)
    const visibleNames = await listDocumentNames(viewerToken)
    const pattern = new RegExp(`_(${DEMO_VIEWER_CATEGORIES.join('|')})_`)
    expect(visibleNames.length).toBeGreaterThan(0)
    expect(visibleNames.every((name) => pattern.test(name))).toBe(true)
  })

  it('rodar de novo não duplica nada', async () => {
    const secondRun = await seedDemoData(ctx.db, {
      admin,
      password: TEST_PASSWORD,
      clientCount: TEST_CLIENT_COUNT,
    })
    expect(secondRun).toBeNull()
    expect(await ctx.db.select().from(documents)).toHaveLength(demoDocumentCount(TEST_CLIENT_COUNT))
  })
})
