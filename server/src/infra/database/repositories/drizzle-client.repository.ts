// Infra: repositório Drizzle dos clientes fictícios do escritório (RF06–RF08, RF10).
import { asc, count, eq } from 'drizzle-orm'
import { Client } from '../../../domain/catalog/client.entity.js'
import type {
  ClientRepository,
  ClientStatusCount,
} from '../../../domain/catalog/client.repository.js'
import type { Page, PageRequest } from '../../../shared/utils/pagination.js'
import { clients } from '../schema.js'
import type { Database } from '../types.js'

export class DrizzleClientRepository implements ClientRepository {
  constructor(private readonly db: Database) {}

  // Página de clientes em ordem alfabética, com o total para a paginação.
  async list(page: PageRequest): Promise<Page<Client>> {
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(clients)
        .orderBy(asc(clients.name), asc(clients.id))
        .limit(page.limit)
        .offset(page.offset),
      this.db.select({ total: count() }).from(clients),
    ])
    return { items: rows.map((row) => Client.restore(row)), total }
  }

  // Conta clientes ativos e inativos para o painel de indicadores (RF29).
  async countByStatus(): Promise<ClientStatusCount> {
    const rows = await this.db
      .select({ active: clients.active, total: count() })
      .from(clients)
      .groupBy(clients.active)
    const totalWhere = (active: boolean) => rows.find((row) => row.active === active)?.total ?? 0
    return { active: totalWhere(true), inactive: totalWhere(false) }
  }

  // Um cliente pelo id, ou null.
  async findById(id: string): Promise<Client | null> {
    const [row] = await this.db.select().from(clients).where(eq(clients.id, id))
    return row ? Client.restore(row) : null
  }

  // Busca pelo código, usado para impedir código de cliente repetido.
  async findByCode(code: string): Promise<Client | null> {
    const [row] = await this.db.select().from(clients).where(eq(clients.code, code))
    return row ? Client.restore(row) : null
  }

  // Upsert: cria o cliente ou atualiza nome e situação se ele já existe (RF07, RF10).
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
