import type { Page, PageRequest } from '../../shared/utils/pagination.js'
import type { Client } from './client.entity.js'

export type ClientStatusCount = {
  active: number
  inactive: number
}

export interface ClientRepository {
  countByStatus(): Promise<ClientStatusCount>
  list(page: PageRequest): Promise<Page<Client>>
  findById(id: string): Promise<Client | null>
  findByCode(code: string): Promise<Client | null>
  save(client: Client): Promise<void>
}
