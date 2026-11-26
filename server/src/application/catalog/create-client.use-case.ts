// Camada de aplicação: caso de uso que cadastra um cliente fictício (RF06).
import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { ClientCodeAlreadyInUseError } from '../../domain/catalog/catalog.errors.js'
import { Client } from '../../domain/catalog/client.entity.js'
import type { ClientRepository } from '../../domain/catalog/client.repository.js'
import { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import type { Clock } from '../ports/clock.js'
import { type ClientDto, toClientDto } from './client.dto.js'

// Nome e código do cliente, mais o ator para o log.
export type CreateClientInput = {
  name: string
  code: string
  actor: { userId: string; ip: string }
}

// Cria o cliente garantindo código único, pois o código compõe o nome padronizado (RF31).
export class CreateClientUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly activityLog: ActivityLogRepository,
    private readonly clock: Clock,
  ) {}

  // Valida pela entidade, checa duplicidade, persiste e registra no log (RF26).
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

  // Recusa código já usado por outro cliente.
  private async ensureCodeIsAvailable(code: string): Promise<void> {
    if (await this.clients.findByCode(code)) throw new ClientCodeAlreadyInUseError()
  }
}
