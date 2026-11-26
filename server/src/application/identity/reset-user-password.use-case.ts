// Camada de aplicação: redefinição de senha pelo administrador, no lugar do RF03 (fora do MVP).
import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { UserNotFoundError } from '../../domain/identity/identity.errors.js'
import { Password } from '../../domain/identity/password.value-object.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import type { PasswordHasher } from '../ports/password-hasher.js'

// Usuário alvo, nova senha em texto puro e o administrador que fez a troca.
export type ResetUserPasswordInput = {
  userId: string
  password: string
  actor: { userId: string; ip: string }
}

// Troca a senha guardando só o novo hash (RNF04) e registra a ação no log (RF26).
export class ResetUserPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly activityLog: ActivityLogRepository,
  ) {}

  // Valida a força da senha (RNF15) antes de buscar o usuário e gerar o hash.
  async execute(input: ResetUserPasswordInput): Promise<void> {
    const password = Password.create(input.password)
    const user = await this.users.findById(input.userId)
    if (!user) throw new UserNotFoundError()

    user.resetPassword(await this.hasher.hash(password.value))
    await this.users.save(user)
    await this.activityLog.record({
      userId: input.actor.userId,
      action: ActivityAction.SENHA_REDEFINIDA,
      entity: ActivityEntity.USERS,
      entityId: user.id,
      ip: input.actor.ip,
    })
  }
}
