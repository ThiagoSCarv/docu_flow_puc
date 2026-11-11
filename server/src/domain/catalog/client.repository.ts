import type { Client } from './client.entity.js'

export interface ClientRepository {
  findById(id: string): Promise<Client | null>
}
