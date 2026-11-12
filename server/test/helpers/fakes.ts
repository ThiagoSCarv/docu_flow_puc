import type { Clock } from '../../src/application/ports/clock.js'
import type { PasswordHasher } from '../../src/application/ports/password-hasher.js'
import type {
  ActivityLogEntry,
  ActivityLogRepository,
} from '../../src/domain/audit/activity-log.repository.js'
import type { Category } from '../../src/domain/catalog/category.entity.js'
import type { CategoryRepository } from '../../src/domain/catalog/category.repository.js'
import type { Client } from '../../src/domain/catalog/client.entity.js'
import type { ClientRepository } from '../../src/domain/catalog/client.repository.js'
import type { Document } from '../../src/domain/catalog/document.entity.js'
import type {
  DocumentRepository,
  DocumentSearchCriteria,
} from '../../src/domain/catalog/document.repository.js'
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
  constructor(private readonly categories: Category[] = []) {}

  async findAll() {
    return [...this.categories]
  }

  async findById(id: string) {
    return this.categories.find((category) => category.id === id) ?? null
  }

  async findExistingIds(ids: string[]) {
    return ids.filter((id) => this.categories.some((category) => category.id === id))
  }
}

export class InMemoryClientRepository implements ClientRepository {
  constructor(private readonly clients: Client[] = []) {}

  async findAll() {
    return [...this.clients]
  }

  async findById(id: string) {
    return this.clients.find((client) => client.id === id) ?? null
  }

  async findByCode(code: string) {
    return this.clients.find((client) => client.code === code) ?? null
  }

  async save(client: Client) {
    const index = this.clients.findIndex((existing) => existing.id === client.id)
    if (index === -1) this.clients.push(client)
    else this.clients[index] = client
  }
}

export class InMemoryDocumentRepository implements DocumentRepository {
  readonly items = new Map<string, Document>()

  async save(document: Document) {
    this.items.set(document.id, document)
  }

  async search({ text, categoryIds, clientId, period }: DocumentSearchCriteria) {
    const needle = text?.toLowerCase()
    return [...this.items.values()].filter(
      (document) =>
        (categoryIds === 'ALL' || categoryIds.includes(document.categoryId)) &&
        (clientId === undefined || document.clientId === clientId) &&
        (period === undefined || document.period.value === period.value) &&
        (needle === undefined ||
          document.name.value.toLowerCase().includes(needle) ||
          document.description.toLowerCase().includes(needle)),
    )
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
