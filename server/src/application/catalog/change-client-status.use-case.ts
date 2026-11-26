// Camada de aplicação: caso de uso que inativa ou reativa um cliente sem apagar histórico (RF10).
import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { ClientNotFoundError } from '../../domain/catalog/catalog.errors.js'
import type { ClientRepository } from '../../domain/catalog/client.repository.js'
import { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import { type ClientDto, toClientDto } from './client.dto.js'

// Cliente alvo, situação desejada e quem fez a mudança (para o log).
export type ChangeClientStatusInput = {
  clientId: string
  active: boolean
  actor: { userId: string; ip: string }
}

// Muda a situação do cliente mantendo os documentos vinculados intactos.
export class ChangeClientStatusUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly activityLog: ActivityLogRepository,
  ) {}

  // Se já está na situação pedida, não salva nem loga; senão aplica e registra (RF26).
  async execute(input: ChangeClientStatusInput): Promise<ClientDto> {
    const client = await this.clients.findById(input.clientId)
    if (!client) throw new ClientNotFoundError()
    if (client.active === input.active) return toClientDto(client)

    if (input.active) client.activate()
    else client.deactivate()
    await this.clients.save(client)
    await this.activityLog.record({
      userId: input.actor.userId,
      action: input.active ? ActivityAction.CLIENTE_REATIVADO : ActivityAction.CLIENTE_INATIVADO,
      entity: ActivityEntity.CLIENTS,
      entityId: client.id,
      ip: input.actor.ip,
    })

    return toClientDto(client)
  }
}
