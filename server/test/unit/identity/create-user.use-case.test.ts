import { beforeEach, describe, expect, it } from 'vitest'
import {
  type CreateUserInput,
  CreateUserUseCase,
} from '../../../src/application/identity/create-user.use-case.js'
import { UnknownCategoryError } from '../../../src/domain/catalog/catalog.errors.js'
import {
  EmailAlreadyInUseError,
  InvalidEmailError,
  WeakPasswordError,
} from '../../../src/domain/identity/identity.errors.js'
import { ActivityAction, ActivityEntity, UserRole } from '../../../src/shared/utils/enums.js'
import {
  FakePasswordHasher,
  FixedClock,
  InMemoryActivityLogRepository,
  InMemoryCategoryRepository,
  InMemoryUserRepository,
} from '../../helpers/fakes.js'

const FISCAIS = 'cat-fiscais'
const ADMIN = { userId: 'admin-id', ip: '127.0.0.1' }

describe('CreateUserUseCase', () => {
  let users: InMemoryUserRepository
  let activityLog: InMemoryActivityLogRepository
  let useCase: CreateUserUseCase

  const input = (overrides: Partial<CreateUserInput> = {}): CreateUserInput => ({
    name: 'Maria',
    email: 'Maria@Exemplo.com',
    password: 'senhaforte1',
    role: UserRole.FUNCIONARIO,
    categoryIds: [FISCAIS],
    actor: ADMIN,
    ...overrides,
  })

  beforeEach(() => {
    users = new InMemoryUserRepository()
    activityLog = new InMemoryActivityLogRepository()
    useCase = new CreateUserUseCase(
      users,
      new InMemoryCategoryRepository([{ id: FISCAIS, name: 'Fiscais', code: 'FIS' }]),
      new FakePasswordHasher(),
      activityLog,
      new FixedClock(),
    )
  })

  it('cria o usuário com e-mail normalizado e categorias permitidas', async () => {
    const created = await useCase.execute(input())
    expect(created).toMatchObject({
      email: 'maria@exemplo.com',
      role: UserRole.FUNCIONARIO,
      active: true,
      allowedCategoryIds: [FISCAIS],
    })
    expect(created).not.toHaveProperty('passwordHash')
  })

  it('guarda a senha com hash, nunca em texto puro', async () => {
    const created = await useCase.execute(input())
    const stored = await users.findById(created.id)
    expect(stored?.passwordHash).toBe('hashed:senhaforte1')
  })

  it('registra a criação no log em nome de quem cadastrou', async () => {
    const created = await useCase.execute(input())
    expect(activityLog.entries).toEqual([
      {
        userId: ADMIN.userId,
        action: ActivityAction.USUARIO_CRIADO,
        entity: ActivityEntity.USERS,
        entityId: created.id,
        ip: ADMIN.ip,
      },
    ])
  })

  it('recusa e-mail já cadastrado, ignorando maiúsculas', async () => {
    await useCase.execute(input())
    await expect(useCase.execute(input({ email: 'MARIA@exemplo.com' }))).rejects.toBeInstanceOf(
      EmailAlreadyInUseError,
    )
  })

  it('recusa senha fraca', async () => {
    await expect(useCase.execute(input({ password: 'curta1' }))).rejects.toBeInstanceOf(
      WeakPasswordError,
    )
  })

  it('recusa e-mail inválido', async () => {
    await expect(useCase.execute(input({ email: 'invalido' }))).rejects.toBeInstanceOf(
      InvalidEmailError,
    )
  })

  it('recusa categoria inexistente', async () => {
    await expect(
      useCase.execute(input({ categoryIds: ['cat-inexistente'] })),
    ).rejects.toBeInstanceOf(UnknownCategoryError)
    expect(users.items.size).toBe(0)
  })
})
