import type { ClientRepository } from '../../domain/catalog/client.repository.js'
import { type ClientDto, toClientDto } from './client.dto.js'

export class ListClientsUseCase {
  constructor(private readonly clients: ClientRepository) {}

  async execute(): Promise<ClientDto[]> {
    const all = await this.clients.findAll()
    return all.map(toClientDto)
  }
}
