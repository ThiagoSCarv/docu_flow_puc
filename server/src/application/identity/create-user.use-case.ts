import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import { UnknownCategoryError } from '../../domain/catalog/catalog.errors.js'
import type { CategoryRepository } from '../../domain/catalog/category.repository.js'
import { Email } from '../../domain/identity/email.value-object.js'
import { EmailAlreadyInUseError } from '../../domain/identity/identity.errors.js'
import { Password } from '../../domain/identity/password.value-object.js'
import { User } from '../../domain/identity/user.entity.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { ActivityAction, ActivityEntity, type UserRole } from '../../shared/utils/enums.js'
import type { Clock } from '../ports/clock.js'
import type { PasswordHasher } from '../ports/password-hasher.js'
import { toUserDto, type UserDto } from './user.dto.js'

export type CreateUserInput = {
  name: string
  email: string
  password: string
  role: UserRole
  categoryIds: string[]
  actor: { userId: string; ip: string }
}

export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
    private readonly hasher: PasswordHasher,
    private readonly activityLog: ActivityLogRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateUserInput): Promise<UserDto> {
    const email = Email.create(input.email)
    const password = Password.create(input.password)

    await this.ensureEmailIsAvailable(email)
    await this.ensureCategoriesExist(input.categoryIds)

    const user = User.create(
      {
        name: input.name,
        email,
        passwordHash: await this.hasher.hash(password.value),
        role: input.role,
        allowedCategoryIds: input.categoryIds,
      },
      this.clock.now(),
    )
    await this.users.save(user)
    await this.activityLog.record({
      userId: input.actor.userId,
      action: ActivityAction.USUARIO_CRIADO,
      entity: ActivityEntity.USERS,
      entityId: user.id,
      ip: input.actor.ip,
    })

    return toUserDto(user)
  }

  private async ensureEmailIsAvailable(email: Email): Promise<void> {
    if (await this.users.findByEmail(email)) throw new EmailAlreadyInUseError()
  }

  private async ensureCategoriesExist(categoryIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(categoryIds)]
    if (uniqueIds.length === 0) return
    const existingIds = await this.categories.findExistingIds(uniqueIds)
    if (existingIds.length !== uniqueIds.length) throw new UnknownCategoryError()
  }
}
