import { beforeEach, describe, expect, it } from 'vitest'
import {
  type CreateDocumentInput,
  CreateDocumentUseCase,
} from '../../../src/application/catalog/create-document.use-case.js'
import {
  CategoryNotAllowedError,
  DocumentNameAlreadyInUseError,
  InactiveClientError,
  InvalidPeriodError,
  UnknownCategoryError,
  UnknownClientError,
} from '../../../src/domain/catalog/catalog.errors.js'
import { Client } from '../../../src/domain/catalog/client.entity.js'
import { ActivityAction, ActivityEntity, UserRole } from '../../../src/shared/utils/enums.js'
import {
  FixedClock,
  InMemoryActivityLogRepository,
  InMemoryCategoryRepository,
  InMemoryClientRepository,
  InMemoryDocumentRepository,
} from '../../helpers/fakes.js'

const FISCAIS = { id: 'cat-fiscais', name: 'Fiscais', code: 'FIS' }
const CONTABEIS = { id: 'cat-contabeis', name: 'Contábeis', code: 'CONT' }

const clientProps = { name: 'Cliente A', code: 'CLIA', active: true, createdAt: new Date() }
const CLIENTE_A = Client.restore({ ...clientProps, id: 'cliente-a' })
const CLIENTE_INATIVO = Client.restore({ ...clientProps, id: 'cliente-inativo', active: false })

const FUNCIONARIO = {
  userId: 'funcionario-id',
  role: UserRole.FUNCIONARIO,
  allowedCategoryIds: [FISCAIS.id],
  ip: '127.0.0.1',
}

describe('CreateDocumentUseCase', () => {
  let documents: InMemoryDocumentRepository
  let activityLog: InMemoryActivityLogRepository
  let useCase: CreateDocumentUseCase

  const input = (overrides: Partial<CreateDocumentInput> = {}): CreateDocumentInput => ({
    clientId: CLIENTE_A.id,
    categoryId: FISCAIS.id,
    period: '2026-03',
    description: 'Nota fiscal de serviço',
    cloudLocation: 'https://nuvem.exemplo.com/cliente-a/nf-2026-03.pdf',
    actor: FUNCIONARIO,
    ...overrides,
  })

  beforeEach(() => {
    documents = new InMemoryDocumentRepository()
    activityLog = new InMemoryActivityLogRepository()
    useCase = new CreateDocumentUseCase(
      documents,
      new InMemoryClientRepository([CLIENTE_A, CLIENTE_INATIVO]),
      new InMemoryCategoryRepository([FISCAIS, CONTABEIS]),
      activityLog,
      new FixedClock(),
    )
  })

  it('cadastra o documento com o nome padronizado e a localização na nuvem', async () => {
    const created = await useCase.execute(input())

    expect(created).toMatchObject({
      name: 'CLIA_FIS_2026-03_nota-fiscal-de-servico',
      description: 'Nota fiscal de serviço',
      period: '2026-03',
      cloudLocation: 'https://nuvem.exemplo.com/cliente-a/nf-2026-03.pdf',
      clientId: CLIENTE_A.id,
      categoryId: FISCAIS.id,
      createdBy: FUNCIONARIO.userId,
    })
    expect(documents.items.has(created.id)).toBe(true)
  })

  it('registra o cadastro no log em nome de quem cadastrou', async () => {
    const created = await useCase.execute(input())

    expect(activityLog.entries).toEqual([
      {
        userId: FUNCIONARIO.userId,
        action: ActivityAction.DOCUMENTO_CRIADO,
        entity: ActivityEntity.DOCUMENTS,
        entityId: created.id,
        ip: FUNCIONARIO.ip,
      },
    ])
  })

  it('ADMIN cadastra em categoria fora da sua lista de permissões', async () => {
    const admin = { ...FUNCIONARIO, role: UserRole.ADMIN, allowedCategoryIds: [] }

    await expect(
      useCase.execute(input({ categoryId: CONTABEIS.id, actor: admin })),
    ).resolves.toMatchObject({ categoryId: CONTABEIS.id })
  })

  it('FUNCIONARIO não cadastra em categoria não permitida', async () => {
    await expect(useCase.execute(input({ categoryId: CONTABEIS.id }))).rejects.toBeInstanceOf(
      CategoryNotAllowedError,
    )
    expect(documents.items.size).toBe(0)
  })

  it('CONSULTA não cadastra documentos', async () => {
    const consulta = { ...FUNCIONARIO, role: UserRole.CONSULTA }

    await expect(useCase.execute(input({ actor: consulta }))).rejects.toBeInstanceOf(
      CategoryNotAllowedError,
    )
  })

  it('recusa nome padronizado repetido sem gravar nem registrar no log', async () => {
    await useCase.execute(input())

    await expect(
      useCase.execute(input({ description: 'NOTA fiscal de serviço!' })),
    ).rejects.toBeInstanceOf(DocumentNameAlreadyInUseError)
    expect(documents.items.size).toBe(1)
    expect(activityLog.entries).toHaveLength(1)
  })

  it('rejeita período inválido', async () => {
    await expect(useCase.execute(input({ period: '2026-13' }))).rejects.toBeInstanceOf(
      InvalidPeriodError,
    )
  })

  it('rejeita cliente inexistente', async () => {
    await expect(useCase.execute(input({ clientId: 'nao-existe' }))).rejects.toBeInstanceOf(
      UnknownClientError,
    )
  })

  it('rejeita cliente inativo', async () => {
    await expect(useCase.execute(input({ clientId: CLIENTE_INATIVO.id }))).rejects.toBeInstanceOf(
      InactiveClientError,
    )
  })

  it('rejeita categoria inexistente', async () => {
    const admin = { ...FUNCIONARIO, role: UserRole.ADMIN }

    await expect(
      useCase.execute(input({ categoryId: 'nao-existe', actor: admin })),
    ).rejects.toBeInstanceOf(UnknownCategoryError)
  })
})
