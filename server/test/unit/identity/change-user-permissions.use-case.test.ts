import { beforeEach, describe, expect, it } from 'vitest'
import { ChangeUserPermissionsUseCase } from '../../../src/application/identity/change-user-permissions.use-case.js'
import { UnknownCategoryError } from '../../../src/domain/catalog/catalog.errors.js'
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
  InMemoryCategoryRepository,
  InMemoryUserRepository,
} from '../../helpers/fakes.js'

const FISCAIS = 'cat-fiscais'
const CONTABEIS = 'cat-contabeis'
const ADMIN = { userId: 'admin-id', ip: '127.0.0.1' }

describe('ChangeUserPermissionsUseCase', () => {
  let users: InMemoryUserRepository
  let activityLog: InMemoryActivityLogRepository
  let useCase: ChangeUserPermissionsUseCase
  let maria: User

  beforeEach(async () => {
    users = new InMemoryUserRepository()
    activityLog = new InMemoryActivityLogRepository()
    useCase = new ChangeUserPermissionsUseCase(
      users,
      new InMemoryCategoryRepository([
        { id: FISCAIS, name: 'Fiscais', code: 'FIS' },
        { id: CONTABEIS, name: 'Contábeis', code: 'CONT' },
      ]),
      activityLog,
    )
    maria = User.create(
      {
        name: 'Maria',
        email: Email.create('maria@exemplo.com'),
        passwordHash: 'hash',
        role: UserRole.FUNCIONARIO,
        allowedCategoryIds: [FISCAIS],
      },
      new FixedClock().now(),
    )
    await users.save(maria)
  })

  it('troca perfil e categorias e registra PERMISSAO_ALTERADA', async () => {
    const result = await useCase.execute({
      userId: maria.id,
      role: UserRole.CONSULTA,
      categoryIds: [CONTABEIS],
      actor: ADMIN,
    })

    expect(result).toMatchObject({ role: UserRole.CONSULTA, allowedCategoryIds: [CONTABEIS] })
    expect((await users.findById(maria.id))?.allowedCategoryIds).toEqual([CONTABEIS])
    expect(activityLog.entries).toEqual([
      {
        userId: ADMIN.userId,
        action: ActivityAction.PERMISSAO_ALTERADA,
        entity: ActivityEntity.USERS,
        entityId: maria.id,
        ip: ADMIN.ip,
      },
    ])
  })

  it('recusa categoria inexistente sem alterar o usuário', async () => {
    await expect(
      useCase.execute({
        userId: maria.id,
        role: UserRole.FUNCIONARIO,
        categoryIds: ['nao-existe'],
        actor: ADMIN,
      }),
    ).rejects.toBeInstanceOf(UnknownCategoryError)
    expect((await users.findById(maria.id))?.allowedCategoryIds).toEqual([FISCAIS])
    expect(activityLog.entries).toHaveLength(0)
  })

  it('recusa que o ADMIN altere as próprias permissões', async () => {
    await expect(
      useCase.execute({
        userId: ADMIN.userId,
        role: UserRole.CONSULTA,
        categoryIds: [],
        actor: ADMIN,
      }),
    ).rejects.toBeInstanceOf(OwnAccessChangeError)
  })

  it('recusa usuário inexistente', async () => {
    await expect(
      useCase.execute({
        userId: 'nao-existe',
        role: UserRole.CONSULTA,
        categoryIds: [],
        actor: ADMIN,
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError)
  })
})
