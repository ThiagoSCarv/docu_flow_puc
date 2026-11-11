import { inArray } from 'drizzle-orm'
import type { CategoryRepository } from '../../../domain/catalog/category.repository.js'
import { categories } from '../schema.js'
import type { Database } from '../types.js'

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Database) {}

  async findExistingIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return []
    const rows = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.id, ids))
    return rows.map((row) => row.id)
  }
}
