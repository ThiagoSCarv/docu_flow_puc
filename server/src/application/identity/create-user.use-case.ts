// Camada de aplicação: cadastro de usuário pelo administrador, sem autocadastro (RF01).
import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import type { CategoryRepository } from '../../domain/catalog/category.repository.js'
import { Email } from '../../domain/identity/email.value-object.js'
import { EmailAlreadyInUseError } from '../../domain/identity/identity.errors.js'
import { Password } from '../../domain/identity/password.value-object.js'
import { User } from '../../domain/identity/user.entity.js'
import type { UserRepository } from '../../domain/identity/user.repository.js'
import { ActivityAction, ActivityEntity, type UserRole } from '../../shared/utils/enums.js'
import type { Clock } from '../ports/clock.js'
import type { PasswordHasher } from '../ports/password-hasher.js'
import { ensureCategoriesExist } from './ensure-categories-exist.js'
import { toUserDto, type UserDto } from './user.dto.js'

// Dados do novo usuário com senha em texto puro, que só existe até virar hash.
export type CreateUserInput = {
  name: string
  email: string
  password: string
  role: UserRole
  categoryIds: string[]
  actor: { userId: string; ip: string }
}

// Cria o usuário com perfil e categorias permitidas e registra a criação no log (RF05, RF26).
export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
    private readonly hasher: PasswordHasher,
    private readonly activityLog: ActivityLogRepository,
    private readonly clock: Clock,
  ) {}

  // Valida e-mail e força da senha (RNF15), checa duplicidade e grava só o hash (RNF04).
  async execute(input: CreateUserInput): Promise<UserDto> {
    const email = Email.create(input.email)
    const password = Password.create(input.password)

    await this.ensureEmailIsAvailable(email)
    await ensureCategoriesExist(this.categories, input.categoryIds)

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

  // Recusa e-mail já cadastrado por outro usuário.
  private async ensureEmailIsAvailable(email: Email): Promise<void> {
    if (await this.users.findByEmail(email)) throw new EmailAlreadyInUseError()
  }
}
