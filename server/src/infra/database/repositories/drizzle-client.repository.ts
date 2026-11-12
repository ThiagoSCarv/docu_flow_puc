import { asc, eq } from 'drizzle-orm'
import { Client } from '../../../domain/catalog/client.entity.js'
import type { ClientRepository } from '../../../domain/catalog/client.repository.js'
import { clients } from '../schema.js'
import type { Database } from '../types.js'

export class DrizzleClientRepository implements ClientRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<Client[]> {
    const rows = await this.db.select().from(clients).orderBy(asc(clients.name))
    return rows.map((row) => Client.restore(row))
  }

  async findById(id: string): Promise<Client | null> {
    const [row] = await this.db.select().from(clients).where(eq(clients.id, id))
    return row ? Client.restore(row) : null
  }

  async findByCode(code: string): Promise<Client | null> {
    const [row] = await this.db.select().from(clients).where(eq(clients.code, code))
    return row ? Client.restore(row) : null
  }

  async save(client: Client): Promise<void> {
    const row = {
      id: client.id,
      name: client.name,
      code: client.code,
      active: client.active,
      createdAt: client.createdAt,
    }
    await this.db.insert(clients).values(row).onConflictDoUpdate({ target: clients.id, set: row })
  }
}
