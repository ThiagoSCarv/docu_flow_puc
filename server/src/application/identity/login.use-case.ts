import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { Email } from '../../domain/identity/email.value-object.js'
import {
  AccountLockedError,
  InvalidCredentialsError,
} from '../../domain/identity/identity.errors.js'
import type { User } from '../../domain/identity/user.entity.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { ActivityAction } from '../../shared/utils/enums.js'
import type { Clock } from '../ports/clock.js'
import type { PasswordHasher } from '../ports/password-hasher.js'

const PASSWORD_FOR_CONSTANT_TIME = 'senha-ficticia-para-tempo-constante'

export type LoginInput = { email: string; password: string; ip: string }
export type LoginOutput = { userId: string }

export class LoginUseCase {
  private readonly dummyHash: Promise<string>

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly activityLog: ActivityLogRepository,
    private readonly clock: Clock,
  ) {
    this.dummyHash = hasher.hash(PASSWORD_FOR_CONSTANT_TIME)
  }

  async execute({ email, password, ip }: LoginInput): Promise<LoginOutput> {
    const user = await this.users.findByEmail(Email.create(email))
    const passwordMatches = await this.hasher.compare(
      password,
      user?.passwordHash ?? (await this.dummyHash),
    )

    if (!user) return this.reject(null, ActivityAction.LOGIN_FALHA, ip)

    const now = this.clock.now()
    if (user.isLockedAt(now)) return this.reject(user.id, ActivityAction.LOGIN_BLOQUEADO, ip)
    if (!user.active) return this.reject(user.id, ActivityAction.LOGIN_FALHA, ip)
    if (!passwordMatches) return this.handleWrongPassword(user, now, ip)

    user.registerSuccessfulLogin()
    await this.users.save(user)
    await this.activityLog.record({ userId: user.id, action: ActivityAction.LOGIN_SUCESSO, ip })
    return { userId: user.id }
  }

  private async handleWrongPassword(user: User, now: Date, ip: string): Promise<never> {
    user.registerFailedLogin(now)
    await this.users.save(user)
    const action = user.isLockedAt(now)
      ? ActivityAction.LOGIN_BLOQUEADO
      : ActivityAction.LOGIN_FALHA
    return this.reject(user.id, action, ip)
  }

  private async reject(userId: string | null, action: ActivityAction, ip: string): Promise<never> {
    await this.activityLog.record({ userId, action, ip })
    throw action === ActivityAction.LOGIN_BLOQUEADO
      ? new AccountLockedError()
      : new InvalidCredentialsError()
  }
}
