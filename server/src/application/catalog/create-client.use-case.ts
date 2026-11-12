import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { ClientCodeAlreadyInUseError } from '../../domain/catalog/catalog.errors.js'
import { Client } from '../../domain/catalog/client.entity.js'
import type { ClientRepository } from '../../domain/catalog/client.repository.js'
import { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import type { Clock } from '../ports/clock.js'
import { type ClientDto, toClientDto } from './client.dto.js'

export type CreateClientInput = {
  name: string
  code: string
  actor: { userId: string; ip: string }
}

export class CreateClientUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly activityLog: ActivityLogRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateClientInput): Promise<ClientDto> {
    const client = Client.create({ name: input.name, code: input.code }, this.clock.now())
    await this.ensureCodeIsAvailable(client.code)

    await this.clients.save(client)
    await this.activityLog.record({
      userId: input.actor.userId,
      action: ActivityAction.CLIENTE_CRIADO,
      entity: ActivityEntity.CLIENTS,
      entityId: client.id,
      ip: input.actor.ip,
    })

    return toClientDto(client)
  }

  private async ensureCodeIsAvailable(code: string): Promise<void> {
    if (await this.clients.findByCode(code)) throw new ClientCodeAlreadyInUseError()
  }
}
