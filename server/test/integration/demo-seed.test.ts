import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  DEMO_BACKUPS,
  DEMO_CLIENTS,
  DEMO_DOCUMENTS,
  DEMO_USERS,
  seedDemoData,
} from '../../src/infra/database/demo-seed.js'
import { activityLogs, backups, clients, documents } from '../../src/infra/database/schema.js'
import { UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp, TEST_PASSWORD } from '../helpers/app.js'

describe('seed de dados de demonstração', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let firstRunApplied: boolean

  beforeAll(async () => {
    ctx = await createTestApp()
    const admin = await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    firstRunApplied = await seedDemoData(ctx.db, {
      admin: { id: admin.id, name: admin.name },
      password: TEST_PASSWORD,
    })
    adminToken = await ctx.tokenFor('admin@exemplo.com')
  })

  afterAll(() => ctx.close())

  async function listDocuments(token: string) {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/documents',
      headers: { authorization: `Bearer ${token}` },
    })
    return response.json() as { name: string }[]
  }

  it('cria clientes, documentos e backups fictícios', async () => {
    expect(firstRunApplied).toBe(true)
    expect(await ctx.db.select().from(clients)).toHaveLength(DEMO_CLIENTS.length)
    expect(await ctx.db.select().from(documents)).toHaveLength(DEMO_DOCUMENTS.length)
    expect(await ctx.db.select().from(backups)).toHaveLength(DEMO_BACKUPS.length)
  })

  it('gera os nomes padronizados pelo domínio', async () => {
    const names = (await listDocuments(adminToken)).map((document) => document.name)
    expect(names).toContain('EMPRESA-A_CONT_2026-03_balanco-patrimonial')
    expect(names).toContain('CLIENTE-D_FIS_2026-05_declaracao-anual-do-mei')
  })

  it('registra as criações no log de atividades', async () => {
    const expectedEntries =
      DEMO_USERS.length + DEMO_CLIENTS.length + DEMO_DOCUMENTS.length + DEMO_BACKUPS.length
    const logins = 1
    expect(await ctx.db.select().from(activityLogs)).toHaveLength(expectedEntries + logins)
  })

  it('usuários de demonstração entram com a senha da seed e veem só as categorias liberadas', async () => {
    const consultaToken = await ctx.tokenFor('consulta@exemplo.com')
    const visibleNames = (await listDocuments(consultaToken)).map((document) => document.name)
    const allowedCodes = DEMO_USERS.find((user) => user.role === UserRole.CONSULTA)?.categoryCodes
    const expected = DEMO_DOCUMENTS.filter((document) =>
      allowedCodes?.includes(document.categoryCode),
    )
    expect(visibleNames).toHaveLength(expected.length)
    expect(visibleNames.every((name) => /_(CONT|FIS)_/.test(name))).toBe(true)
  })

  it('rodar de novo não duplica nada', async () => {
    const admin = await ctx.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const secondRunApplied = await seedDemoData(ctx.db, {
      admin: { id: admin.json().id, name: admin.json().name },
      password: TEST_PASSWORD,
    })
    expect(secondRunApplied).toBe(false)
    expect(await ctx.db.select().from(documents)).toHaveLength(DEMO_DOCUMENTS.length)
  })
})
