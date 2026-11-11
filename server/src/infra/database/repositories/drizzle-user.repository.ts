import { asc, eq, inArray } from 'drizzle-orm'
import { Email } from '../../../domain/identity/email.value-object.js'
import { User } from '../../../domain/identity/user.entity.js'
import type { UserRepository } from '../../../domain/identity/user.repository.js'
import { userCategoryPermissions, users } from '../schema.js'
import type { Database } from '../types.js'

type UserRow = typeof users.$inferSelect

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id))
    return row ? this.toEntity(row) : null
  }

  async findByEmail(email: Email): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email.value))
    return row ? this.toEntity(row) : null
  }

  async findAll(): Promise<User[]> {
    const rows = await this.db.select().from(users).orderBy(asc(users.name))
    const categoryIdsByUser = await this.loadAllowedCategoryIds(rows.map((row) => row.id))
    return rows.map((row) => this.restore(row, categoryIdsByUser.get(row.id) ?? []))
  }

  async save(user: User): Promise<void> {
    const row = {
      id: user.id,
      name: user.name,
      email: user.email.value,
      passwordHash: user.passwordHash,
      role: user.role,
      active: user.active,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      createdAt: user.createdAt,
    }

    await this.db.transaction(async (tx) => {
      await tx.insert(users).values(row).onConflictDoUpdate({ target: users.id, set: row })
      await tx.delete(userCategoryPermissions).where(eq(userCategoryPermissions.userId, user.id))
      if (user.allowedCategoryIds.length === 0) return
      await tx
        .insert(userCategoryPermissions)
        .values(user.allowedCategoryIds.map((categoryId) => ({ userId: user.id, categoryId })))
    })
  }

  private async toEntity(row: UserRow): Promise<User> {
    const categoryIdsByUser = await this.loadAllowedCategoryIds([row.id])
    return this.restore(row, categoryIdsByUser.get(row.id) ?? [])
  }

  private restore(row: UserRow, allowedCategoryIds: string[]): User {
    return User.restore({ ...row, email: Email.create(row.email), allowedCategoryIds })
  }

  private async loadAllowedCategoryIds(userIds: string[]): Promise<Map<string, string[]>> {
    const categoryIdsByUser = new Map<string, string[]>()
    if (userIds.length === 0) return categoryIdsByUser

    const permissions = await this.db
      .select()
      .from(userCategoryPermissions)
      .where(inArray(userCategoryPermissions.userId, userIds))
    for (const { userId, categoryId } of permissions) {
      categoryIdsByUser.set(userId, [...(categoryIdsByUser.get(userId) ?? []), categoryId])
    }
    return categoryIdsByUser
  }
}
