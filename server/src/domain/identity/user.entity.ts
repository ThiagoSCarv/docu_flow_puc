import type { UserRole } from '../../shared/utils/enums.js'
import type { Email } from './email.value-object.js'

export const MAX_FAILED_LOGIN_ATTEMPTS = 5
export const LOCK_DURATION_MINUTES = 15

const LOCK_DURATION_MS = LOCK_DURATION_MINUTES * 60 * 1000

export type UserProps = {
  id: string
  name: string
  email: Email
  passwordHash: string
  role: UserRole
  active: boolean
  failedLoginAttempts: number
  lockedUntil: Date | null
  createdAt: Date
  allowedCategoryIds: string[]
}

export type NewUserProps = Pick<UserProps, 'name' | 'email' | 'passwordHash' | 'role'> & {
  allowedCategoryIds: string[]
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: NewUserProps, now: Date): User {
    return new User({
      ...input,
      id: crypto.randomUUID(),
      active: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      allowedCategoryIds: [...new Set(input.allowedCategoryIds)],
    })
  }

  static restore(props: UserProps): User {
    return new User({ ...props })
  }

  get id() {
    return this.props.id
  }

  get name() {
    return this.props.name
  }

  get email() {
    return this.props.email
  }

  get passwordHash() {
    return this.props.passwordHash
  }

  get role() {
    return this.props.role
  }

  get active() {
    return this.props.active
  }

  get failedLoginAttempts() {
    return this.props.failedLoginAttempts
  }

  get lockedUntil() {
    return this.props.lockedUntil
  }

  get createdAt() {
    return this.props.createdAt
  }

  get allowedCategoryIds(): readonly string[] {
    return this.props.allowedCategoryIds
  }

  isLockedAt(now: Date): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil > now
  }

  registerFailedLogin(now: Date): void {
    this.props.failedLoginAttempts += 1
    if (this.props.failedLoginAttempts < MAX_FAILED_LOGIN_ATTEMPTS) return

    this.props.failedLoginAttempts = 0
    this.props.lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS)
  }

  registerSuccessfulLogin(): void {
    this.unlock()
  }

  resetPassword(passwordHash: string): void {
    this.props.passwordHash = passwordHash
    this.unlock()
  }

  private unlock(): void {
    this.props.failedLoginAttempts = 0
    this.props.lockedUntil = null
  }
}
