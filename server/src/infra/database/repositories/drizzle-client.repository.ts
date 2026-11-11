import { eq } from 'drizzle-orm'
import { Client } from '../../../domain/catalog/client.entity.js'
import type { ClientRepository } from '../../../domain/catalog/client.repository.js'
import { clients } from '../schema.js'
import type { Database } from '../types.js'

export class DrizzleClientRepository implements ClientRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Client | null> {
    const [row] = await this.db.select().from(clients).where(eq(clients.id, id))
    return row ? Client.restore(row) : null
  }
}
