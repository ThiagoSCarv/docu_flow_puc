import type { Email } from './email.value-object.js'
import type { User } from './user.entity.js'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  findAll(): Promise<User[]>
  save(user: User): Promise<void>
}
