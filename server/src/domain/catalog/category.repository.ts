// Domínio (catalog): contrato do repositório de categorias.
import type { Category } from './category.entity.js'

// Porta implementada na infra para consultar as categorias fixas do escritório.
export interface CategoryRepository {
  findAll(): Promise<Category[]>
  findById(id: string): Promise<Category | null>
  // Filtra os ids que existem, para validar as categorias permitidas de um usuário.
  findExistingIds(ids: string[]): Promise<string[]>
}
