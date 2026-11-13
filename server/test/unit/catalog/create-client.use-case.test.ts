import { beforeEach, describe, expect, it } from 'vitest'
import {
  type CreateClientInput,
  CreateClientUseCase,
} from '../../../src/application/catalog/create-client.use-case.js'
import {
  ClientCodeAlreadyInUseError,
  InvalidClientCodeError,
} from '../../../src/domain/catalog/catalog.errors.js'
import { Client } from '../../../src/domain/catalog/client.entity.js'
import { ActivityAction, ActivityEntity } from '../../../src/shared/utils/enums.js'
import {
  ALL_ITEMS,
  FixedClock,
  InMemoryActivityLogRepository,
  InMemoryClientRepository,
} from '../../helpers/fakes.js'

const ADMIN = { userId: 'admin-id', ip: '127.0.0.1' }

describe('CreateClientUseCase', () => {
  let clients: InMemoryClientRepository
  let activityLog: InMemoryActivityLogRepository
  let useCase: CreateClientUseCase

  const input = (overrides: Partial<CreateClientInput> = {}): CreateClientInput => ({
    name: 'Empresa Exemplo',
    code: 'empresa-exemplo',
    actor: ADMIN,
    ...overrides,
  })

  beforeEach(() => {
    clients = new InMemoryClientRepository([
      Client.restore({
        id: 'cliente-a',
        name: 'Cliente A',
        code: 'CLIENTE-A',
        active: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }),
    ])
    activityLog = new InMemoryActivityLogRepository()
    useCase = new CreateClientUseCase(clients, activityLog, new FixedClock())
  })

  it('cria o cliente ativo com código em maiúsculas', async () => {
    const created = await useCase.execute(input())
    expect(created).toMatchObject({
      name: 'Empresa Exemplo',
      code: 'EMPRESA-EXEMPLO',
      active: true,
    })
    expect(await clients.findByCode('EMPRESA-EXEMPLO')).not.toBeNull()
  })

  it('registra a criação no log em nome de quem cadastrou', async () => {
    const created = await useCase.execute(input())
    expect(activityLog.entries).toEqual([
      {
        userId: ADMIN.userId,
        action: ActivityAction.CLIENTE_CRIADO,
        entity: ActivityEntity.CLIENTS,
        entityId: created.id,
        ip: ADMIN.ip,
      },
    ])
  })

  it('rejeita código já cadastrado, mesmo com letras minúsculas', async () => {
    await expect(useCase.execute(input({ code: 'cliente-a' }))).rejects.toBeInstanceOf(
      ClientCodeAlreadyInUseError,
    )
    expect(activityLog.entries).toEqual([])
  })

  it('rejeita código inválido sem gravar nada', async () => {
    await expect(useCase.execute(input({ code: 'COM ESPACO' }))).rejects.toBeInstanceOf(
      InvalidClientCodeError,
    )
    expect((await clients.list(ALL_ITEMS)).total).toBe(1)
  })
})
