// Infra: repositório Drizzle das categorias de documento (RF12, RF19).
import { asc, eq, inArray } from 'drizzle-orm'
import type { Category } from '../../../domain/catalog/category.entity.js'
import type { CategoryRepository } from '../../../domain/catalog/category.repository.js'
import { categories } from '../schema.js'
import type { Database } from '../types.js'

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Database) {}

  // Todas as categorias em ordem alfabética.
  async findAll(): Promise<Category[]> {
    return this.db.select().from(categories).orderBy(asc(categories.name))
  }

  // Uma categoria pelo id, ou null se não existir.
  async findById(id: string): Promise<Category | null> {
    const [row] = await this.db.select().from(categories).where(eq(categories.id, id))
    return row ?? null
  }

  // Filtra os ids que existem, para validar as categorias permitidas de um usuário.
  async findExistingIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return []
    const rows = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.id, ids))
    return rows.map((row) => row.id)
  }
}
