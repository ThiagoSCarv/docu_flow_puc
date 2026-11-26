// Camada de aplicação: caso de uso que consulta os clientes cadastrados (RF08).
import type { ClientRepository } from '../../domain/catalog/client.repository.js'
import { mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { type ClientDto, toClientDto } from './client.dto.js'

// Lista os clientes paginados, sem registrar no log por ser só leitura.
export class ListClientsUseCase {
  constructor(private readonly clients: ClientRepository) {}

  // Busca uma página e converte cada cliente em DTO.
  async execute(page: PageRequest): Promise<Page<ClientDto>> {
    return mapPage(await this.clients.list(page), toClientDto)
  }
}
