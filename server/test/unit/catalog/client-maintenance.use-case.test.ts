import { beforeEach, describe, expect, it } from 'vitest'
import { ChangeClientStatusUseCase } from '../../../src/application/catalog/change-client-status.use-case.js'
import { RenameClientUseCase } from '../../../src/application/catalog/rename-client.use-case.js'
import { ClientNotFoundError } from '../../../src/domain/catalog/catalog.errors.js'
import { Client } from '../../../src/domain/catalog/client.entity.js'
import { ActivityAction, ActivityEntity } from '../../../src/shared/utils/enums.js'
import {
  FixedClock,
  InMemoryActivityLogRepository,
  InMemoryClientRepository,
} from '../../helpers/fakes.js'

const ADMIN = { userId: 'admin-id', ip: '127.0.0.1' }

describe('manutenção de clientes (RF07, RF10)', () => {
  let clients: InMemoryClientRepository
  let activityLog: InMemoryActivityLogRepository
  let clienteA: Client

  beforeEach(async () => {
    clienteA = Client.create({ name: 'Cliente A', code: 'CLI-A' }, new FixedClock().now())
    clients = new InMemoryClientRepository([clienteA])
    activityLog = new InMemoryActivityLogRepository()
  })

  describe('RenameClientUseCase', () => {
    it('renomeia, mantém o código e registra CLIENTE_ALTERADO', async () => {
      const useCase = new RenameClientUseCase(clients, activityLog)

      const result = await useCase.execute({
        clientId: clienteA.id,
        name: 'Cliente A Ltda',
        actor: ADMIN,
      })

      expect(result).toMatchObject({ name: 'Cliente A Ltda', code: 'CLI-A' })
      expect(activityLog.entries).toEqual([
        {
          userId: ADMIN.userId,
          action: ActivityAction.CLIENTE_ALTERADO,
          entity: ActivityEntity.CLIENTS,
          entityId: clienteA.id,
          ip: ADMIN.ip,
        },
      ])
    })

    it('recusa cliente inexistente', async () => {
      const useCase = new RenameClientUseCase(clients, activityLog)

      await expect(
        useCase.execute({ clientId: 'nao-existe', name: 'X', actor: ADMIN }),
      ).rejects.toBeInstanceOf(ClientNotFoundError)
    })
  })

  describe('ChangeClientStatusUseCase', () => {
    it('inativa e reativa, registrando cada mudança', async () => {
      const useCase = new ChangeClientStatusUseCase(clients, activityLog)

      const inactive = await useCase.execute({
        clientId: clienteA.id,
        active: false,
        actor: ADMIN,
      })
      const active = await useCase.execute({ clientId: clienteA.id, active: true, actor: ADMIN })

      expect(inactive.active).toBe(false)
      expect(active.active).toBe(true)
      expect(activityLog.actions()).toEqual([
        ActivityAction.CLIENTE_INATIVADO,
        ActivityAction.CLIENTE_REATIVADO,
      ])
    })

    it('não registra nada quando a situação já é a pedida', async () => {
      const useCase = new ChangeClientStatusUseCase(clients, activityLog)

      await useCase.execute({ clientId: clienteA.id, active: true, actor: ADMIN })

      expect(activityLog.entries).toHaveLength(0)
    })

    it('recusa cliente inexistente', async () => {
      const useCase = new ChangeClientStatusUseCase(clients, activityLog)

      await expect(
        useCase.execute({ clientId: 'nao-existe', active: false, actor: ADMIN }),
      ).rejects.toBeInstanceOf(ClientNotFoundError)
    })
  })
})
