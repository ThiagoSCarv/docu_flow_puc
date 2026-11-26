// Camada de aplicação: caso de uso que lista as categorias visíveis ao usuário (RF19).
import type { Category } from '../../domain/catalog/category.entity.js'
import type { CategoryRepository } from '../../domain/catalog/category.repository.js'
import { type CatalogActor, canViewCategory } from '../../domain/catalog/category-access.policy.js'

// Lista só as categorias que o perfil e as permissões do ator deixam ver.
export class ListCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  // Busca todas e filtra pela política de acesso, decidida no servidor (RNF05).
  async execute(actor: CatalogActor): Promise<Category[]> {
    const all = await this.categories.findAll()
    return all.filter((category) => canViewCategory(actor, category.id))
  }
}
