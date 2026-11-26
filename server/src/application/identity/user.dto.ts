// Camada de aplicação: DTO de saída dos usuários, sem dados sensíveis (RNF10).
import type { User } from '../../domain/identity/user.entity.js'
import type { UserRole } from '../../shared/utils/enums.js'

// Campos públicos do usuário; nunca inclui passwordHash nem contadores de login.
export type UserDto = {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  createdAt: Date
  allowedCategoryIds: string[]
}

// Converte a entidade em DTO, copiando as categorias para não expor o array interno.
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
