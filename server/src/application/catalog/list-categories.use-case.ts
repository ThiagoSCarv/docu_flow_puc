import type { Category } from '../../domain/catalog/category.entity.js'
import type { CategoryRepository } from '../../domain/catalog/category.repository.js'
import { type CatalogActor, canViewCategory } from '../../domain/catalog/category-access.policy.js'

export class ListCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(actor: CatalogActor): Promise<Category[]> {
    const all = await this.categories.findAll()
    return all.filter((category) => canViewCategory(actor, category.id))
  }
}
