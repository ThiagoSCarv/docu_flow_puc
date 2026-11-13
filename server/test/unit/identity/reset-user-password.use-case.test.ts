import { beforeEach, describe, expect, it } from 'vitest'
import { ResetUserPasswordUseCase } from '../../../src/application/identity/reset-user-password.use-case.js'
import { Email } from '../../../src/domain/identity/email.value-object.js'
import {
  UserNotFoundError,
  WeakPasswordError,
} from '../../../src/domain/identity/identity.errors.js'
import { MAX_FAILED_LOGIN_ATTEMPTS, User } from '../../../src/domain/identity/user.entity.js'
import { ActivityAction, ActivityEntity, UserRole } from '../../../src/shared/utils/enums.js'
import {
  FakePasswordHasher,
  FixedClock,
  InMemoryActivityLogRepository,
  InMemoryUserRepository,
} from '../../helpers/fakes.js'

const ADMIN = { userId: 'admin-id', ip: '127.0.0.1' }

describe('ResetUserPasswordUseCase', () => {
  let users: InMemoryUserRepository
  let activityLog: InMemoryActivityLogRepository
  let useCase: ResetUserPasswordUseCase
  let maria: User

  beforeEach(async () => {
    users = new InMemoryUserRepository()
    activityLog = new InMemoryActivityLogRepository()
    useCase = new ResetUserPasswordUseCase(users, new FakePasswordHasher(), activityLog)
    maria = User.create(
      {
        name: 'Maria',
        email: Email.create('maria@exemplo.com'),
        passwordHash: 'hashed:senhaantiga1',
        role: UserRole.FUNCIONARIO,
        allowedCategoryIds: [],
      },
      new FixedClock().now(),
    )
    await users.save(maria)
  })

  it('grava o hash da nova senha e desbloqueia a conta', async () => {
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) maria.registerFailedLogin(new Date())

    await useCase.execute({ userId: maria.id, password: 'senhanova2', actor: ADMIN })

    const stored = await users.findById(maria.id)
    expect(stored?.passwordHash).toBe('hashed:senhanova2')
    expect(stored?.lockedUntil).toBeNull()
  })

  it('registra a redefinição no log em nome do ADMIN', async () => {
    await useCase.execute({ userId: maria.id, password: 'senhanova2', actor: ADMIN })

    expect(activityLog.entries).toEqual([
      {
        userId: ADMIN.userId,
        action: ActivityAction.SENHA_REDEFINIDA,
        entity: ActivityEntity.USERS,
        entityId: maria.id,
        ip: ADMIN.ip,
      },
    ])
  })

  it('recusa senha fraca sem alterar o usuário', async () => {
    await expect(
      useCase.execute({ userId: maria.id, password: 'curta1', actor: ADMIN }),
    ).rejects.toBeInstanceOf(WeakPasswordError)
    expect((await users.findById(maria.id))?.passwordHash).toBe('hashed:senhaantiga1')
    expect(activityLog.entries).toHaveLength(0)
  })

  it('recusa usuário inexistente', async () => {
    await expect(
      useCase.execute({ userId: 'nao-existe', password: 'senhanova2', actor: ADMIN }),
    ).rejects.toBeInstanceOf(UserNotFoundError)
  })
})
