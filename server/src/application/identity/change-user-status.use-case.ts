// Camada de aplicação: ativação e desativação de usuários (RF04).
import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { OwnAccessChangeError, UserNotFoundError } from '../../domain/identity/identity.errors.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import { toUserDto, type UserDto } from './user.dto.js'

// Usuário alvo, situação desejada e o administrador que fez a mudança.
export type ChangeUserStatusInput = {
  userId: string
  active: boolean
  actor: { userId: string; ip: string }
}

// Desativa sem apagar, para preservar o histórico de ações do usuário no log.
export class ChangeUserStatusUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly activityLog: ActivityLogRepository,
  ) {}

  // Bloqueia mudança na própria conta; se nada muda, não salva nem loga (RF26).
  async execute(input: ChangeUserStatusInput): Promise<UserDto> {
    if (input.userId === input.actor.userId) throw new OwnAccessChangeError()
    const user = await this.users.findById(input.userId)
    if (!user) throw new UserNotFoundError()
    if (user.active === input.active) return toUserDto(user)

    if (input.active) user.activate()
    else user.deactivate()
    await this.users.save(user)
    await this.activityLog.record({
      userId: input.actor.userId,
      action: input.active ? ActivityAction.USUARIO_REATIVADO : ActivityAction.USUARIO_INATIVADO,
      entity: ActivityEntity.USERS,
      entityId: user.id,
      ip: input.actor.ip,
    })

    return toUserDto(user)
  }
}
