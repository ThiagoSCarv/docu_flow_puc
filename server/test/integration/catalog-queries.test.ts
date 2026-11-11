import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { categories, clients } from '../../src/infra/database/schema.js'
import { UserRole } from '../../src/shared/utils/enums.js'
import { createTestApp } from '../helpers/app.js'

describe('consultas do catálogo', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let adminToken: string
  let funcionarioToken: string
  let consultaToken: string
  let semPermissaoToken: string
  let fiscaisId: string
  let contabeisId: string
  let clienteAId: string
  let clienteBId: string

  const get = (token: string, url: string) =>
    ctx.app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } })

  const namesOf = (response: { json: () => { name: string }[] }) =>
    response
      .json()
      .map((item) => item.name)
      .sort()

  const categoryIdByCode = async (code: string) => {
    const [category] = await ctx.db.select().from(categories).where(eq(categories.code, code))
    return category.id
  }

  const registerDocument = async (
    categoryId: string,
    clientId: string,
    period: string,
    description: string,
  ) => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        categoryId,
        clientId,
        period,
        description,
        cloudLocation: 'https://nuvem.exemplo.com/arquivo.pdf',
      },
    })
    expect(response.statusCode).toBe(201)
  }

  beforeAll(async () => {
    ctx = await createTestApp()
    await ctx.createUser(UserRole.ADMIN, 'admin@exemplo.com')
    await ctx.createUser(UserRole.FUNCIONARIO, 'func@exemplo.com', ['FIS'])
    await ctx.createUser(UserRole.CONSULTA, 'consulta@exemplo.com', ['CONT'])
    await ctx.createUser(UserRole.FUNCIONARIO, 'sem-permissao@exemplo.com')
    adminToken = await ctx.tokenFor('admin@exemplo.com')
    funcionarioToken = await ctx.tokenFor('func@exemplo.com')
    consultaToken = await ctx.tokenFor('consulta@exemplo.com')
    semPermissaoToken = await ctx.tokenFor('sem-permissao@exemplo.com')
    fiscaisId = await categoryIdByCode('FIS')
    contabeisId = await categoryIdByCode('CONT')
    const [clienteA, clienteB] = await ctx.db
      .insert(clients)
      .values([
        { name: 'Cliente A', code: 'CLIA' },
        { name: 'Cliente B', code: 'CLIB' },
      ])
      .returning()
    clienteAId = clienteA.id
    clienteBId = clienteB.id

    await registerDocument(fiscaisId, clienteAId, '2026-03', 'Nota fiscal de serviço')
    await registerDocument(fiscaisId, clienteBId, '2026-04', 'Guia de imposto')
    await registerDocument(contabeisId, clienteAId, '2026-03', 'Balanço 100% revisado')
  })

  afterAll(() => ctx.close())

  describe('GET /api/documents', () => {
    it('ADMIN vê documentos de todas as categorias', async () => {
      const response = await get(adminToken, '/api/documents')

      expect(response.statusCode).toBe(200)
      expect(response.json()).toHaveLength(3)
    })

    it('FUNCIONARIO só lista documentos das categorias permitidas', async () => {
      const response = await get(funcionarioToken, '/api/documents')

      expect(namesOf(response)).toEqual([
        'CLIA_FIS_2026-03_nota-fiscal-de-servico',
        'CLIB_FIS_2026-04_guia-de-imposto',
      ])
    })

    it('CONSULTA só lista documentos das categorias permitidas', async () => {
      const response = await get(consultaToken, '/api/documents')

      expect(namesOf(response)).toEqual(['CLIA_CONT_2026-03_balanco-100-revisado'])
    })

    it('usuário sem categorias permitidas não vê nenhum documento', async () => {
      const response = await get(semPermissaoToken, '/api/documents')

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual([])
    })

    it('filtrar por categoria não permitida devolve lista vazia', async () => {
      const response = await get(funcionarioToken, `/api/documents?categoryId=${contabeisId}`)

      expect(response.json()).toEqual([])
    })

    it('pesquisa por trecho do nome ou da descrição', async () => {
      const byName = await get(adminToken, '/api/documents?search=CLIB')
      const byDescription = await get(adminToken, '/api/documents?search=serviço')

      expect(namesOf(byName)).toEqual(['CLIB_FIS_2026-04_guia-de-imposto'])
      expect(namesOf(byDescription)).toEqual(['CLIA_FIS_2026-03_nota-fiscal-de-servico'])
    })

    it('trata % e _ da pesquisa como texto, não como curinga', async () => {
      const percent = await get(adminToken, '/api/documents?search=100%25')
      const underscore = await get(adminToken, '/api/documents?search=_')

      expect(namesOf(percent)).toEqual(['CLIA_CONT_2026-03_balanco-100-revisado'])
      expect(underscore.json()).toHaveLength(3)
    })

    it('combina filtros de cliente e período', async () => {
      const response = await get(adminToken, `/api/documents?clientId=${clienteAId}&period=2026-03`)

      expect(namesOf(response)).toEqual([
        'CLIA_CONT_2026-03_balanco-100-revisado',
        'CLIA_FIS_2026-03_nota-fiscal-de-servico',
      ])
    })

    it('período inválido retorna 400', async () => {
      const response = await get(adminToken, '/api/documents?period=2026-13')

      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({ message: 'Período inválido. Use o formato AAAA-MM.' })
    })

    it('sem token retorna 401', async () => {
      const response = await ctx.app.inject({ method: 'GET', url: '/api/documents' })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/categories', () => {
    it('ADMIN vê as 6 categorias iniciais', async () => {
      const response = await get(adminToken, '/api/categories')

      expect(response.statusCode).toBe(200)
      expect(response.json()).toHaveLength(6)
    })

    it('FUNCIONARIO vê só as categorias permitidas', async () => {
      const response = await get(funcionarioToken, '/api/categories')

      expect(response.json()).toEqual([{ id: fiscaisId, name: 'Fiscais', code: 'FIS' }])
    })

    it('sem token retorna 401', async () => {
      const response = await ctx.app.inject({ method: 'GET', url: '/api/categories' })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/clients', () => {
    it('usuário autenticado lista os clientes sem campos de controle', async () => {
      const response = await get(consultaToken, '/api/clients')

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual([
        { id: clienteAId, name: 'Cliente A', code: 'CLIA', active: true },
        { id: clienteBId, name: 'Cliente B', code: 'CLIB', active: true },
      ])
    })

    it('sem token retorna 401', async () => {
      const response = await ctx.app.inject({ method: 'GET', url: '/api/clients' })

      expect(response.statusCode).toBe(401)
    })
  })
})
