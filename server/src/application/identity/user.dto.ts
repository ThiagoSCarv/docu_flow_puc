import type { User } from '../../domain/identity/user.entity.js'
import type { UserRole } from '../../shared/utils/enums.js'

export type UserDto = {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  createdAt: Date
  allowedCategoryIds: string[]
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email.value,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    allowedCategoryIds: [...user.allowedCategoryIds],
  }
}
