import type { Client } from './client.entity.js'

export interface ClientRepository {
  findAll(): Promise<Client[]>
  findById(id: string): Promise<Client | null>
  findByCode(code: string): Promise<Client | null>
  save(client: Client): Promise<void>
}
