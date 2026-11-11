import type { Clock } from '../../src/application/ports/clock.js'
import type { PasswordHasher } from '../../src/application/ports/password-hasher.js'
import type {
  ActivityLogEntry,
  ActivityLogRepository,
} from '../../src/domain/audit/activity-log.repository.js'
import type { CategoryRepository } from '../../src/domain/catalog/category.repository.js'
import type { Email } from '../../src/domain/identity/email.value-object.js'
import type { User } from '../../src/domain/identity/user.entity.js'
import type { UserRepository } from '../../src/domain/identity/user.repository.js'

export class InMemoryUserRepository implements UserRepository {
  readonly items = new Map<string, User>()

  async findById(id: string) {
    return this.items.get(id) ?? null
  }

  async findByEmail(email: Email) {
    return [...this.items.values()].find((user) => user.email.equals(email)) ?? null
  }

  async findAll() {
    return [...this.items.values()]
  }

  async save(user: User) {
    this.items.set(user.id, user)
  }
}

export class InMemoryCategoryRepository implements CategoryRepository {
  constructor(private readonly ids: string[] = []) {}

  async findExistingIds(ids: string[]) {
    return ids.filter((id) => this.ids.includes(id))
  }
}

export class InMemoryActivityLogRepository implements ActivityLogRepository {
  readonly entries: ActivityLogEntry[] = []

  async record(entry: ActivityLogEntry) {
    this.entries.push(entry)
  }

  actions() {
    return this.entries.map((entry) => entry.action)
  }
}

export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string) {
    return `hashed:${plain}`
  }

  async compare(plain: string, hash: string) {
    return hash === `hashed:${plain}`
  }
}

export class FixedClock implements Clock {
  constructor(private current = new Date('2026-11-11T12:00:00Z')) {}

  now() {
    return this.current
  }

  advanceMinutes(minutes: number) {
    this.current = new Date(this.current.getTime() + minutes * 60 * 1000)
  }
}
