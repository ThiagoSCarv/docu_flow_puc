// Camada de aplicação: troca de perfil e categorias permitidas de um usuário (RF05, RF19).
import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import type { CategoryRepository } from '../../domain/catalog/category.repository.js'
import { OwnAccessChangeError, UserNotFoundError } from '../../domain/identity/identity.errors.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { ActivityAction, ActivityEntity, type UserRole } from '../../shared/utils/enums.js'
import { ensureCategoriesExist } from './ensure-categories-exist.js'
import { toUserDto, type UserDto } from './user.dto.js'

// Usuário alvo, novo perfil, categorias permitidas e o administrador que fez a mudança.
export type ChangeUserPermissionsInput = {
  userId: string
  role: UserRole
  categoryIds: string[]
  actor: { userId: string; ip: string }
}

// Altera as permissões e registra a mudança no log, como pede o RF26.
export class ChangeUserPermissionsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
    private readonly activityLog: ActivityLogRepository,
  ) {}

  // Impede o admin de mudar o próprio acesso e valida as categorias antes de salvar.
  async execute(input: ChangeUserPermissionsInput): Promise<UserDto> {
    if (input.userId === input.actor.userId) throw new OwnAccessChangeError()
    const user = await this.users.findById(input.userId)
    if (!user) throw new UserNotFoundError()
    await ensureCategoriesExist(this.categories, input.categoryIds)

    user.changePermissions(input.role, input.categoryIds)
    await this.users.save(user)
    await this.activityLog.record({
      userId: input.actor.userId,
      action: ActivityAction.PERMISSAO_ALTERADA,
      entity: ActivityEntity.USERS,
      entityId: user.id,
      ip: input.actor.ip,
    })

    return toUserDto(user)
  }
}
