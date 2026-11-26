// Domínio (catalog): contrato do repositório de clientes.
import type { Page, PageRequest } from '../../shared/utils/pagination.js'
import type { Client } from './client.entity.js'

// Contagem de clientes ativos e inativos exibida no painel (RF29).
export type ClientStatusCount = {
  active: number
  inactive: number
}

// Porta implementada na infra: consulta, lista paginada e grava clientes.
export interface ClientRepository {
  countByStatus(): Promise<ClientStatusCount>
  list(page: PageRequest): Promise<Page<Client>>
  findById(id: string): Promise<Client | null>
  // Usada para recusar código repetido antes de gravar (409).
  findByCode(code: string): Promise<Client | null>
  save(client: Client): Promise<void>
}
