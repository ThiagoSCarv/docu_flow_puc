// Camada de aplicação: validação compartilhada das categorias atribuídas a usuários (RF05).
import { UnknownCategoryError } from '../../domain/catalog/catalog.errors.js'
import type { CategoryRepository } from '../../domain/catalog/category.repository.js'

// Garante que todas as categorias informadas existem, ignorando ids repetidos.
export async function ensureCategoriesExist(
  categories: CategoryRepository,
  categoryIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(categoryIds)]
  if (uniqueIds.length === 0) return
  const existingIds = await categories.findExistingIds(uniqueIds)
  if (existingIds.length !== uniqueIds.length) throw new UnknownCategoryError()
}
