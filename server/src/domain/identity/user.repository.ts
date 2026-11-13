import type { Page, PageRequest } from '../../shared/utils/pagination.js'
import type { Email } from './email.value-object.js'
import type { User } from './user.entity.js'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  list(page: PageRequest): Promise<Page<User>>
  save(user: User): Promise<void>
}
