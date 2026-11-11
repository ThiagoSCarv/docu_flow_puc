import type { Category } from './category.entity.js'

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>
  findExistingIds(ids: string[]): Promise<string[]>
}
