import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { activityLogs, categories, clients, documents } from '../../src/infra/database/schema.js'
import { ActivityAction, ActivityEntity, UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('POST /api/documents', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string
  let fiscaisId: string
  let contabeisId: string
  let clienteAId: string
  let clienteInativoId: string

  const novoDocumento = (overrides: Record<string, unknown> = {}) => ({
    clientId: clienteAId,
    categoryId: fiscaisId,
    period: '2026-03',
    description: 'Nota fiscal de serviço',
    cloudLocation: 'https://nuvem.exemplo.com/cliente-a/nf-2026-03.pdf',
    ...overrides,
  })

  const post = (token: string, payload: Record<string, unknown>) =>
    ctx.app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: { authorization: `Bearer ${token}` },
      payload,
    })

  const categoryIdByCode = async (code: string) => {
    const [category] = await ctx.db.select().from(categories).where(eq(categories.code, code))
    return category.id
  }

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com', ['FIS'])
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com', ['FIS'])
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    funcionarioToken = await ctx.tokenFor('func@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
    fiscaisId = await categoryIdByCode('FIS')
    contabeisId = await categoryIdByCode('CONT')
    const [clienteA, clienteInativo] = await ctx.db
      .insert(clients)
      .values([
        { name: 'Cliente A', code: 'CLIA' },
        { name: 'Cliente Inativo', code: 'CLINAT', active: false },
      ])
      .returning()
    clienteAId = clienteA.id
    clienteInativoId = clienteInativo.id
  })

  afterAll(() => ctx.close())

  it('FUNCIONARIO cadastra documento em categoria permitida com nome padronizado', async () => {
    const response = await post(funcionarioToken, novoDocumento())

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toMatchObject({
      name: 'CLIA_FIS_2026-03_nota-fiscal-de-servico',
      period: '2026-03',
      clientId: clienteAId,
      categoryId: fiscaisId,
    })
    const [stored] = await ctx.db.select().from(documents).where(eq(documents.id, body.id))
    expect(stored.name).toBe('CLIA_FIS_2026-03_nota-fiscal-de-servico')
  })

  it('registra o cadastro no log de atividades', async () => {
    const { id } = (
      await post(funcionarioToken, novoDocumento({ description: 'Recibo de pagamento' }))
    ).json()

    const [log] = await ctx.db.select().from(activityLogs).where(eq(activityLogs.entityId, id))
    expect(log).toMatchObject({
      action: ActivityAction.DOCUMENTO_CRIADO,
      entity: ActivityEntity.DOCUMENTS,
    })
  })

  it('ADMIN cadastra em qualquer categoria', async () => {
    const response = await post(adminToken, novoDocumento({ categoryId: contabeisId }))

    expect(response.statusCode).toBe(201)
    expect(response.json().name).toBe('CLIA_CONT_2026-03_nota-fiscal-de-servico')
  })

  it('nome padronizado repetido retorna 409 sem gravar outro documento', async () => {
    const payload = novoDocumento({ description: 'Contrato social' })
    expect((await post(funcionarioToken, payload)).statusCode).toBe(201)

    const response = await post(funcionarioToken, {
      ...payload,
      description: 'CONTRATO   SOCIAL',
      cloudLocation: 'https://nuvem.exemplo.com/outro-link.pdf',
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({ message: 'Já existe um documento com este nome padronizado' })
    const stored = await ctx.db
      .select()
      .from(documents)
      .where(eq(documents.name, 'CLIA_FIS_2026-03_contrato-social'))
    expect(stored).toHaveLength(1)
  })

  it('FUNCIONARIO recebe 403 ao cadastrar em categoria não permitida', async () => {
    const response = await post(funcionarioToken, novoDocumento({ categoryId: contabeisId }))

    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({
      message: 'Você não tem permissão para cadastrar documentos nesta categoria',
    })
  })

  it('CONSULTA recebe 403 mesmo em categoria permitida', async () => {
    const response = await post(consultaToken, novoDocumento())

    expect(response.statusCode).toBe(403)
  })

  it('sem token retorna 401', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/documents',
      payload: novoDocumento(),
    })

    expect(response.statusCode).toBe(401)
  })

  it.each(['2026-13', '2026-1', '03-2026'])('período inválido "%s" retorna 400', async (period) => {
    const response = await post(funcionarioToken, novoDocumento({ period }))

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'Período inválido. Use o formato AAAA-MM.' })
  })

  it('link da nuvem sem HTTPS retorna 400', async () => {
    const response = await post(
      funcionarioToken,
      novoDocumento({ cloudLocation: 'http://nuvem.exemplo.com/arquivo.pdf' }),
    )

    expect(response.statusCode).toBe(400)
  })

  it('cliente inativo retorna 400', async () => {
    const response = await post(funcionarioToken, novoDocumento({ clientId: clienteInativoId }))

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'Cliente inativo não recebe novos documentos' })
  })

  it('cliente inexistente retorna 400', async () => {
    const response = await post(funcionarioToken, novoDocumento({ clientId: crypto.randomUUID() }))

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'Cliente inexistente' })
  })
})
