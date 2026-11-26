// Domínio (identity): contrato do repositório de usuários.
import type { UserRole } from '../../shared/utils/enums.js'
import type { Page, PageRequest } from '../../shared/utils/pagination.js'
import type { Email } from './email.value-object.js'
import type { User } from './user.entity.js'

// Quem acessa uma categoria: perfis que veem tudo mais quem a tem entre as permitidas (RF20).
export type CategoryAccessCriteria = {
  categoryId: string
  rolesThatViewAll: readonly UserRole[]
}

// Porta implementada na infra: busca, lista paginada e grava usuários com suas categorias.
export interface UserRepository {
  findById(id: string): Promise<User | null>
  // Usada no login e para recusar e-mail repetido no cadastro.
  findByEmail(email: Email): Promise<User | null>
  list(page: PageRequest): Promise<Page<User>>
  // Lista os usuários que enxergam a categoria informada (RF20).
  listWithCategoryAccess(criteria: CategoryAccessCriteria, page: PageRequest): Promise<Page<User>>
  save(user: User): Promise<void>
}
