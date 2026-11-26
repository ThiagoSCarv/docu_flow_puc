import type { Clock } from '../../src/application/ports/clock.js'
import type { PasswordHasher } from '../../src/application/ports/password-hasher.js'
import type {
  ActivityLogCriteria,
  ActivityLogEntry,
  ActivityLogRepository,
} from '../../src/domain/audit/activity-log.repository.js'
import type { Backup } from '../../src/domain/backup/backup.entity.js'
import type { BackupRepository } from '../../src/domain/backup/backup.repository.js'
import type { Category } from '../../src/domain/catalog/category.entity.js'
import type { CategoryRepository } from '../../src/domain/catalog/category.repository.js'
import type { CategoryScope } from '../../src/domain/catalog/category-access.policy.js'
import type { Client } from '../../src/domain/catalog/client.entity.js'
import type { ClientRepository } from '../../src/domain/catalog/client.repository.js'
import type { Document } from '../../src/domain/catalog/document.entity.js'
import type {
  DocumentRepository,
  DocumentSearchCriteria,
} from '../../src/domain/catalog/document.repository.js'
import type { DocumentName } from '../../src/domain/catalog/document-name.value-object.js'
import type { Email } from '../../src/domain/identity/email.value-object.js'
import type { User } from '../../src/domain/identity/user.entity.js'
import type {
  CategoryAccessCriteria,
  UserRepository,
} from '../../src/domain/identity/user.repository.js'
import { BackupStatus } from '../../src/shared/utils/enums.js'
import type { Page, PageRequest } from '../../src/shared/utils/pagination.js'

export const ALL_ITEMS: PageRequest = { limit: 1000, offset: 0 }

function paginate<T>(items: T[], { limit, offset }: PageRequest): Page<T> {
  return { items: items.slice(offset, offset + limit), total: items.length }
}

export class InMemoryUserRepository implements UserRepository {
  readonly items = new Map<string, User>()

  async findById(id: string) {
    return this.items.get(id) ?? null
  }

  async findByEmail(email: Email) {
    return [...this.items.values()].find((user) => user.email.equals(email)) ?? null
  }

  async list(page: PageRequest) {
    return paginate([...this.items.values()], page)
  }

  async listWithCategoryAccess(
    { categoryId, rolesThatViewAll }: CategoryAccessCriteria,
    page: PageRequest,
  ) {
    const withAccess = [...this.items.values()].filter(
      (user) =>
        rolesThatViewAll.includes(user.role) || user.allowedCategoryIds.includes(categoryId),
    )
    return paginate(withAccess, page)
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

  async list(page: PageRequest) {
    return paginate([...this.clients], page)
  }

  async countByStatus() {
    const active = this.clients.filter((client) => client.active).length
    return { active, inactive: this.clients.length - active }
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

  async countByCategory(categoryIds: CategoryScope) {
    const totals = new Map<string, number>()
    for (const { categoryId } of this.items.values()) {
      if (categoryIds !== 'ALL' && !categoryIds.includes(categoryId)) continue
      totals.set(categoryId, (totals.get(categoryId) ?? 0) + 1)
    }
    return [...totals].map(([categoryId, total]) => ({ categoryId, total }))
  }

  async existsWithName(name: DocumentName) {
    return [...this.items.values()].some((document) => document.name.value === name.value)
  }

  async search({ text, categoryIds, clientId, period }: DocumentSearchCriteria, page: PageRequest) {
    const needle = text?.toLowerCase()
    const found = [...this.items.values()].filter(
      (document) =>
        (categoryIds === 'ALL' || categoryIds.includes(document.categoryId)) &&
        (clientId === undefined || document.clientId === clientId) &&
        (period === undefined || document.period.value === period.value) &&
        (needle === undefined ||
          document.name.value.toLowerCase().includes(needle) ||
          document.description.toLowerCase().includes(needle)),
    )
    return paginate(found, page)
  }
}

export class InMemoryBackupRepository implements BackupRepository {
  readonly items: Backup[] = []

  constructor(private readonly responsibleNames = new Map<string, string>()) {}

  async save(backup: Backup) {
    this.items.push(backup)
  }

  async findHistory(page: PageRequest) {
    return paginate(this.toHistory(this.items), page)
  }

  async findPendingVerification(page: PageRequest) {
    const verifiedTimes = this.items
      .filter((backup) => backup.status === BackupStatus.VERIFICADO)
      .map((backup) => backup.performedAt.getTime())
    const lastVerifiedAt = Math.max(Number.NEGATIVE_INFINITY, ...verifiedTimes)
    const pending = this.items.filter(
      (backup) =>
        backup.status === BackupStatus.REALIZADO && backup.performedAt.getTime() > lastVerifiedAt,
    )
    return paginate(this.toHistory(pending), page)
  }

  private toHistory(items: Backup[]) {
    return [...items]
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
      .map((backup) => ({
        backup,
        responsibleName: this.responsibleNames.get(backup.responsibleId) ?? '',
      }))
  }
}

export class InMemoryActivityLogRepository implements ActivityLogRepository {
  readonly entries: ActivityLogEntry[] = []

  async record(entry: ActivityLogEntry) {
    this.entries.push(entry)
  }

  async list({ action, userId }: ActivityLogCriteria, page: PageRequest) {
    const records = this.entries
      .map((entry, index) => ({
        id: String(index),
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        ip: entry.ip ?? null,
        createdAt: new Date(index),
        user: entry.userId ? { id: entry.userId, name: '' } : null,
      }))
      .filter(
        (record) =>
          (action === undefined || record.action === action) &&
          (userId === undefined || record.user?.id === userId),
      )
      .reverse()
    return paginate(records, page)
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
