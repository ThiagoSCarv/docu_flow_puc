import type { Page, PageRequest } from '../../shared/utils/pagination.js'
import type { Client } from './client.entity.js'

export interface ClientRepository {
  list(page: PageRequest): Promise<Page<Client>>
  findById(id: string): Promise<Client | null>
  findByCode(code: string): Promise<Client | null>
  save(client: Client): Promise<void>
}
