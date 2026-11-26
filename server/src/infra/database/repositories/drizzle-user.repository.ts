// Infra: repositório Drizzle dos usuários e de suas categorias permitidas (RF01, RF05, RF19).
import { asc, count, eq, inArray, or, type SQL } from 'drizzle-orm'
import { Email } from '../../../domain/identity/email.value-object.js'
import { User } from '../../../domain/identity/user.entity.js'
import type {
  CategoryAccessCriteria,
  UserRepository,
} from '../../../domain/identity/user.repository.js'
import type { Page, PageRequest } from '../../../shared/utils/pagination.js'
import { userCategoryPermissions, users } from '../schema.js'
import type { Database } from '../types.js'

type UserRow = typeof users.$inferSelect

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  // Um usuário pelo id, já com as categorias permitidas.
  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id))
    return row ? this.toEntity(row) : null
  }

  // Usado no login (RF02); o e-mail chega normalizado pelo value object.
  async findByEmail(email: Email): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email.value))
    return row ? this.toEntity(row) : null
  }

  // Página com todos os usuários.
  async list(page: PageRequest): Promise<Page<User>> {
    return this.listWhere(undefined, page)
  }

  // Quem acessa a categoria: perfis que veem tudo ou usuários com permissão explícita (RF20).
  async listWithCategoryAccess(
    { categoryId, rolesThatViewAll }: CategoryAccessCriteria,
    page: PageRequest,
  ): Promise<Page<User>> {
    const usersPermittedInCategory = this.db
      .select({ userId: userCategoryPermissions.userId })
      .from(userCategoryPermissions)
      .where(eq(userCategoryPermissions.categoryId, categoryId))
    const where = or(
      rolesThatViewAll.length > 0 ? inArray(users.role, [...rolesThatViewAll]) : undefined,
      inArray(users.id, usersPermittedInCategory),
    )
    return this.listWhere(where, page)
  }

  // Consulta paginada comum; carrega as permissões de todos os usuários da página numa query só.
  private async listWhere(where: SQL | undefined, page: PageRequest): Promise<Page<User>> {
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(asc(users.name), asc(users.id))
        .limit(page.limit)
        .offset(page.offset),
      this.db.select({ total: count() }).from(users).where(where),
    ])
    const categoryIdsByUser = await this.loadAllowedCategoryIds(rows.map((row) => row.id))
    const items = rows.map((row) => this.restore(row, categoryIdsByUser.get(row.id) ?? []))
    return { items, total }
  }

  // Upsert do usuário e regravação das categorias permitidas na mesma transação.
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

  // Converte uma linha em entidade buscando as permissões desse usuário.
  private async toEntity(row: UserRow): Promise<User> {
    const categoryIdsByUser = await this.loadAllowedCategoryIds([row.id])
    return this.restore(row, categoryIdsByUser.get(row.id) ?? [])
  }

  // Monta a entidade a partir da linha e das categorias já carregadas.
  private restore(row: UserRow, allowedCategoryIds: string[]): User {
    return User.restore({ ...row, email: Email.create(row.email), allowedCategoryIds })
  }

  // Agrupa as categorias permitidas por usuário, evitando uma query por usuário (N+1).
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
