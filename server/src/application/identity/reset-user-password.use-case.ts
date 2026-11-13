import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { UserNotFoundError } from '../../domain/identity/identity.errors.js'
import { Password } from '../../domain/identity/password.value-object.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import type { PasswordHasher } from '../ports/password-hasher.js'

export type ResetUserPasswordInput = {
  userId: string
  password: string
  actor: { userId: string; ip: string }
}

export class ResetUserPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly activityLog: ActivityLogRepository,
  ) {}

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
