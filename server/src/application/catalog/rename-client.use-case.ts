import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { ClientNotFoundError } from '../../domain/catalog/catalog.errors.js'
import type { ClientRepository } from '../../domain/catalog/client.repository.js'
import { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import { type ClientDto, toClientDto } from './client.dto.js'

export type RenameClientInput = {
  clientId: string
  name: string
  actor: { userId: string; ip: string }
}

export class RenameClientUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly activityLog: ActivityLogRepository,
  ) {}

  async execute(input: RenameClientInput): Promise<ClientDto> {
    const client = await this.clients.findById(input.clientId)
    if (!client) throw new ClientNotFoundError()

    client.rename(input.name)
    await this.clients.save(client)
    await this.activityLog.record({
      userId: input.actor.userId,
      action: ActivityAction.CLIENTE_ALTERADO,
      entity: ActivityEntity.CLIENTS,
      entityId: client.id,
      ip: input.actor.ip,
    })

    return toClientDto(client)
  }
}
