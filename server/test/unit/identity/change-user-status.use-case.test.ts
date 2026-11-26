import { beforeEach, describe, expect, it } from 'vitest'
import { ChangeUserStatusUseCase } from '../../../src/application/identity/change-user-status.use-case.js'
import { Email } from '../../../src/domain/identity/email.value-object.js'
import {
  OwnAccessChangeError,
  UserNotFoundError,
} from '../../../src/domain/identity/identity.errors.js'
import { User } from '../../../src/domain/identity/user.entity.js'
import { ActivityAction, ActivityEntity, UserRole } from '../../../src/shared/utils/enums.js'
import {
  FixedClock,
  InMemoryActivityLogRepository,
  InMemoryUserRepository,
} from '../../helpers/fakes.js'

const ADMIN = { userId: 'admin-id', ip: '127.0.0.1' }

describe('ChangeUserStatusUseCase', () => {
  let users: InMemoryUserRepository
  let activityLog: InMemoryActivityLogRepository
  let useCase: ChangeUserStatusUseCase
  let maria: User

  beforeEach(async () => {
    users = new InMemoryUserRepository()
    activityLog = new InMemoryActivityLogRepository()
    useCase = new ChangeUserStatusUseCase(users, activityLog)
    maria = User.create(
      {
        name: 'Maria',
        email: Email.create('maria@exemplo.com'),
        passwordHash: 'hash',
        role: UserRole.FUNCIONARIO,
        allowedCategoryIds: [],
      },
      new FixedClock().now(),
    )
    await users.save(maria)
  })

  it('inativa o usuário e registra no log', async () => {
    const result = await useCase.execute({ userId: maria.id, active: false, actor: ADMIN })

    expect(result.active).toBe(false)
    expect((await users.findById(maria.id))?.active).toBe(false)
    expect(activityLog.entries).toEqual([
      {
        userId: ADMIN.userId,
        action: ActivityAction.USUARIO_INATIVADO,
        entity: ActivityEntity.USERS,
        entityId: maria.id,
        ip: ADMIN.ip,
      },
    ])
  })

  it('reativa o usuário e registra a reativação', async () => {
    maria.deactivate()

    const result = await useCase.execute({ userId: maria.id, active: true, actor: ADMIN })

    expect(result.active).toBe(true)
    expect(activityLog.actions()).toEqual([ActivityAction.USUARIO_REATIVADO])
  })

  it('não registra nada quando a situação já é a pedida', async () => {
    await useCase.execute({ userId: maria.id, active: true, actor: ADMIN })

    expect(activityLog.entries).toHaveLength(0)
  })

  it('recusa que o ADMIN altere a própria conta', async () => {
    await expect(
      useCase.execute({ userId: ADMIN.userId, active: false, actor: ADMIN }),
    ).rejects.toBeInstanceOf(OwnAccessChangeError)
  })

  it('recusa usuário inexistente', async () => {
    await expect(
      useCase.execute({ userId: 'nao-existe', active: false, actor: ADMIN }),
    ).rejects.toBeInstanceOf(UserNotFoundError)
  })
})
