import { describe, expect, it } from 'vitest'
import { Email } from '../../../src/domain/identity/email.value-object.js'
import {
  LOCK_DURATION_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  User,
} from '../../../src/domain/identity/user.entity.js'
import { UserRole } from '../../../src/shared/utils/enums.js'

const now = new Date('2026-11-11T12:00:00Z')
const minutesLater = (minutes: number) => new Date(now.getTime() + minutes * 60 * 1000)

function createUser() {
  return User.create(
    {
      name: 'Maria',
      email: Email.create('maria@exemplo.com'),
      passwordHash: 'hash',
      role: UserRole.FUNCIONARIO,
      allowedCategoryIds: ['cat-1', 'cat-1', 'cat-2'],
    },
    now,
  )
}

describe('User', () => {
  it('nasce ativo, desbloqueado e sem categorias repetidas', () => {
    const user = createUser()
    expect(user.active).toBe(true)
    expect(user.failedLoginAttempts).toBe(0)
    expect(user.isLockedAt(now)).toBe(false)
    expect(user.allowedCategoryIds).toEqual(['cat-1', 'cat-2'])
  })

  it('continua desbloqueado antes da última tentativa permitida', () => {
    const user = createUser()
    for (let i = 1; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) user.registerFailedLogin(now)
    expect(user.failedLoginAttempts).toBe(MAX_FAILED_LOGIN_ATTEMPTS - 1)
    expect(user.isLockedAt(now)).toBe(false)
  })

  it(`bloqueia por ${LOCK_DURATION_MINUTES} minutos na ${MAX_FAILED_LOGIN_ATTEMPTS}ª falha`, () => {
    const user = createUser()
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) user.registerFailedLogin(now)
    expect(user.isLockedAt(minutesLater(LOCK_DURATION_MINUTES - 1))).toBe(true)
    expect(user.isLockedAt(minutesLater(LOCK_DURATION_MINUTES))).toBe(false)
    expect(user.failedLoginAttempts).toBe(0)
  })

  it('login com sucesso zera falhas e desbloqueia', () => {
    const user = createUser()
    for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) user.registerFailedLogin(now)
    user.registerSuccessfulLogin()
    expect(user.failedLoginAttempts).toBe(0)
    expect(user.lockedUntil).toBeNull()
  })
})
