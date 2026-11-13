import type { ClientRepository } from '../../domain/catalog/client.repository.js'
import { mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { type ClientDto, toClientDto } from './client.dto.js'

export class ListClientsUseCase {
  constructor(private readonly clients: ClientRepository) {}

  async execute(page: PageRequest): Promise<Page<ClientDto>> {
    return mapPage(await this.clients.list(page), toClientDto)
  }
}
