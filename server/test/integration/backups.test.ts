import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { activityLogs } from '../../src/infra/database/schema.js'
import { ActivityAction, BackupStatus, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('/api/backups', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string

  const novoBackup = (overrides: Record<string, unknown> = {}) => ({
    performedAt: '2026-11-10T22:00:00-03:00',
    status: BackupStatus.REALIZADO,
    scope: 'Pasta Clientes no Google Drive',
    notes: 'Backup semanal',
    ...overrides,
  })

  const post = (payload: Record<string, unknown>, token?: string) =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/backups',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload,
    })

  const get = (token?: string) =>
    ctx.app.inject({
      method: 'GET',
      url: '/api/backups',
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com', ['FIS'])
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com')
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    funcionarioToken = await ctx.tokenFor('func@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
  })

  afterAll(() => ctx.close())

  it('ADMIN registra backup e fica como responsável', async () => {
    const response = await post(novoBackup(), adminToken)
    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      performedAt: '2026-11-11T01:00:00.000Z',
      status: BackupStatus.REALIZADO,
      scope: 'Pasta Clientes no Google Drive',
      notes: 'Backup semanal',
      responsible: { name: `Usuário ${UserRole.ADMIN}` },
    })
  })

  it('registra o backup no log', async () => {
    const logs = await ctx.db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.action, ActivityAction.BACKUP_REGISTRADO))
    expect(logs).toHaveLength(1)
  })

  it('CONSULTA vê o histórico do mais recente ao mais antigo', async () => {
    await post(
      novoBackup({
        performedAt: '2026-11-11T08:00:00Z',
        status: BackupStatus.VERIFICADO,
        notes: undefined,
      }),
      adminToken,
    )
    const response = await get(consultaToken)
    expect(response.statusCode).toBe(200)
    const history = response.json()
    expect(history.map((backup: { status: string }) => backup.status)).toEqual([
      BackupStatus.VERIFICADO,
      BackupStatus.REALIZADO,
    ])
    expect(history[0].notes).toBeNull()
  })

  it('FUNCIONARIO vê o responsável só com id e nome', async () => {
    const response = await get(funcionarioToken)
    expect(response.statusCode).toBe(200)
    expect(Object.keys(response.json()[0].responsible).sort()).toEqual(['id', 'name'])
  })

  it('data no futuro retorna 400', async () => {
    const response = await post(novoBackup({ performedAt: '2099-01-01T00:00:00Z' }), adminToken)
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'A data do backup não pode estar no futuro' })
  })

  it('data sem horário e fuso retorna 400', async () => {
    const response = await post(novoBackup({ performedAt: '2026-11-10' }), adminToken)
    expect(response.statusCode).toBe(400)
  })

  it('situação inválida retorna 400', async () => {
    const response = await post(novoBackup({ status: 'OK' }), adminToken)
    expect(response.statusCode).toBe(400)
  })

  it('escopo vazio retorna 400', async () => {
    const response = await post(novoBackup({ scope: '   ' }), adminToken)
    expect(response.statusCode).toBe(400)
  })

  it('FUNCIONARIO recebe 403 ao registrar', async () => {
    const response = await post(novoBackup(), funcionarioToken)
    expect(response.statusCode).toBe(403)
  })

  it('CONSULTA recebe 403 ao registrar', async () => {
    const response = await post(novoBackup(), consultaToken)
    expect(response.statusCode).toBe(403)
  })

  it('sem token retorna 401 ao consultar e ao registrar', async () => {
    expect((await get()).statusCode).toBe(401)
    expect((await post(novoBackup())).statusCode).toBe(401)
  })
})
