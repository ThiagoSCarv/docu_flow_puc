import type { UserRole } from '../../shared/utils/enums.js'
import type { Page, PageRequest } from '../../shared/utils/pagination.js'
import type { Email } from './email.value-object.js'
import type { User } from './user.entity.js'

export type CategoryAccessCriteria = {
  categoryId: string
  rolesThatViewAll: readonly UserRole[]
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  list(page: PageRequest): Promise<Page<User>>
  listWithCategoryAccess(criteria: CategoryAccessCriteria, page: PageRequest): Promise<Page<User>>
  save(user: User): Promise<void>
}
