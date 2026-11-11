import type { Client } from './client.entity.js'

export interface ClientRepository {
  findAll(): Promise<Client[]>
  findById(id: string): Promise<Client | null>
}
