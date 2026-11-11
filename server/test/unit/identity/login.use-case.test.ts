import { beforeEach, describe, expect, it } from 'vitest'
import { LoginUseCase } from '../../../src/application/identity/login.use-case.js'
import { Email } from '../../../src/domain/identity/email.value-object.js'
import {
  AccountLockedError,
  InvalidCredentialsError,
} from '../../../src/domain/identity/identity.errors.js'
import {
  LOCK_DURATION_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  User,
} from '../../../src/domain/identity/user.entity.js'
import { ActivityAction, UserRole } from '../../../src/shared/utils/enums.js'
import {
  FakePasswordHasher,
  FixedClock,
  InMemoryActivityLogRepository,
  InMemoryUserRepository,
} from '../../helpers/fakes.js'

const IP = '127.0.0.1'
const PASSWORD = 'senha1234'

describe('LoginUseCase', () => {
  let users: InMemoryUserRepository
  let activityLog: InMemoryActivityLogRepository
  let clock: FixedClock
  let useCase: LoginUseCase
  let user: User

  const attempt = (password: string, email = 'maria@exemplo.com') =>
    useCase.execute({ email, password, ip: IP })

  beforeEach(async () => {
    users = new InMemoryUserRepository()
    activityLog = new InMemoryActivityLogRepository()
    clock = new FixedClock()
    const hasher = new FakePasswordHasher()
    useCase = new LoginUseCase(users, hasher, activityLog, clock)
    user = User.create(
      {
        name: 'Maria',
        email: Email.create('maria@exemplo.com'),
        passwordHash: await hasher.hash(PASSWORD),
        role: UserRole.FUNCIONARIO,
        allowedCategoryIds: [],
      },
      clock.now(),
    )
    await users.save(user)
  })

  it('devolve o id do usuário e registra sucesso', async () => {
    await expect(attempt(PASSWORD)).resolves.toEqual({ userId: user.id })
    expect(activityLog.actions()).toEqual([ActivityAction.LOGIN_SUCESSO])
  })

  it('ignora maiúsculas no e-mail', async () => {
    await expect(attempt(PASSWORD, 'MARIA@exemplo.com')).resolves.toEqual({ userId: user.id })
  })

  it('senha errada lança InvalidCredentialsError e registra falha', async () => {
    await expect(attempt('errada123')).rejects.toBeInstanceOf(InvalidCredentialsError)
    expect(activityLog.actions()).toEqual([ActivityAction.LOGIN_FALHA])
  })

  it('e-mail inexistente lança o mesmo erro, com log sem usuário', async () => {
    await expect(attempt(PASSWORD, 'ninguem@exemplo.com')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    )
    expect(activityLog.entries).toEqual([
      { userId: null, action: ActivityAction.LOGIN_FALHA, ip: IP },
    ])
  })

  it(`a ${MAX_FAILED_LOGIN_ATTEMPTS}ª falha lança AccountLockedError`, async () => {
    for (let i = 1; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) {
      await expect(attempt('errada123')).rejects.toBeInstanceOf(InvalidCredentialsError)
    }
    await expect(attempt('errada123')).rejects.toBeInstanceOf(AccountLockedError)
    expect(activityLog.actions().at(-1)).toBe(ActivityAction.LOGIN_BLOQUEADO)
  })

  it('conta bloqueada recusa a senha correta até o bloqueio expirar', async () => {
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) await attempt('errada123').catch(() => {})

    await expect(attempt(PASSWORD)).rejects.toBeInstanceOf(AccountLockedError)
    clock.advanceMinutes(LOCK_DURATION_MINUTES)
    await expect(attempt(PASSWORD)).resolves.toEqual({ userId: user.id })
  })

  it('usuário inativo recebe InvalidCredentialsError mesmo com a senha correta', async () => {
    users.items.set(
      user.id,
      User.restore({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        active: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: user.createdAt,
        allowedCategoryIds: [],
      }),
    )
    await expect(attempt(PASSWORD)).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})
