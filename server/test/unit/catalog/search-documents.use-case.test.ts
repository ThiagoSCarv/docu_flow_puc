import { beforeEach, describe, expect, it } from 'vitest'
import {
  type SearchDocumentsInput,
  SearchDocumentsUseCase,
} from '../../../src/application/catalog/search-documents.use-case.js'
import { InvalidPeriodError } from '../../../src/domain/catalog/catalog.errors.js'
import { Document } from '../../../src/domain/catalog/document.entity.js'
import { DocumentName } from '../../../src/domain/catalog/document-name.value-object.js'
import { Period } from '../../../src/domain/catalog/period.value-object.js'
import { UserRole } from '../../../src/shared/utils/enums.js'
import { InMemoryDocumentRepository } from '../../helpers/fakes.js'

const FISCAIS = 'cat-fiscais'
const CONTABEIS = 'cat-contabeis'
const CLIENTE_A = 'cliente-a'
const CLIENTE_B = 'cliente-b'

const FUNCIONARIO = { role: UserRole.FUNCIONARIO, allowedCategoryIds: [FISCAIS] }
const ADMIN = { role: UserRole.ADMIN, allowedCategoryIds: [] }

function documentOf(categoryId: string, clientId: string, period: string, description: string) {
  const parsedPeriod = Period.create(period)
  return Document.create(
    {
      name: DocumentName.create({
        clientCode: clientId,
        categoryCode: categoryId,
        period: parsedPeriod,
        description,
      }),
      description,
      period: parsedPeriod,
      cloudLocation: 'https://nuvem.exemplo.com/arquivo.pdf',
      clientId,
      categoryId,
      createdBy: 'autor-id',
    },
    new Date('2026-11-11T12:00:00Z'),
  )
}

describe('SearchDocumentsUseCase', () => {
  let useCase: SearchDocumentsUseCase

  const notaFiscal = documentOf(FISCAIS, CLIENTE_A, '2026-03', 'Nota fiscal de serviço')
  const guiaImposto = documentOf(FISCAIS, CLIENTE_B, '2026-04', 'Guia de imposto')
  const balanco = documentOf(CONTABEIS, CLIENTE_A, '2026-03', 'Balanço patrimonial')

  const search = (overrides: Partial<SearchDocumentsInput> = {}) =>
    useCase.execute({ actor: FUNCIONARIO, ...overrides })

  const namesOf = (found: { name: string }[]) => found.map((document) => document.name).sort()

  beforeEach(async () => {
    const documents = new InMemoryDocumentRepository()
    for (const document of [notaFiscal, guiaImposto, balanco]) await documents.save(document)
    useCase = new SearchDocumentsUseCase(documents)
  })

  it('ADMIN vê documentos de todas as categorias', async () => {
    expect(await search({ actor: ADMIN })).toHaveLength(3)
  })

  it('FUNCIONARIO só vê documentos das categorias permitidas', async () => {
    expect(namesOf(await search())).toEqual(namesOf([notaFiscal, guiaImposto].map(toName)))
  })

  it('lista vazia de permissões não vê nenhum documento', async () => {
    expect(await search({ actor: { ...FUNCIONARIO, allowedCategoryIds: [] } })).toEqual([])
  })

  it('filtrar por categoria não permitida devolve lista vazia', async () => {
    expect(await search({ categoryId: CONTABEIS })).toEqual([])
  })

  it('filtra por cliente', async () => {
    expect(namesOf(await search({ clientId: CLIENTE_B }))).toEqual([guiaImposto.name.value])
  })

  it('filtra por período', async () => {
    expect(namesOf(await search({ actor: ADMIN, period: '2026-03' }))).toEqual(
      namesOf([notaFiscal, balanco].map(toName)),
    )
  })

  it('pesquisa por trecho do nome ou da descrição, sem diferenciar maiúsculas', async () => {
    expect(namesOf(await search({ search: 'IMPOSTO' }))).toEqual([guiaImposto.name.value])
    expect(namesOf(await search({ search: 'serviço' }))).toEqual([notaFiscal.name.value])
  })

  it('combina os filtros', async () => {
    const found = await search({ actor: ADMIN, clientId: CLIENTE_A, categoryId: CONTABEIS })
    expect(namesOf(found)).toEqual([balanco.name.value])
  })

  it('rejeita período inválido', async () => {
    await expect(search({ period: '2026-13' })).rejects.toBeInstanceOf(InvalidPeriodError)
  })
})

function toName(document: Document) {
  return { name: document.name.value }
}
