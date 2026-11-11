import { asc, eq, inArray } from 'drizzle-orm'
import { categories, userCategoryPermissions, users } from '../db/schema.js'
import type { Database } from '../db/types.js'
import { logActivity } from './activity-log.js'
import { hashPassword } from './auth.js'

export type Role = (typeof users.$inferSelect)['role']

export type NewUserInput = {
  name: string
  email: string
  password: string
  role: Role
  categoryIds: string[]
}

export type CreateUserResult =
  | { status: 'ok'; user: PublicUser }
  | { status: 'email_taken' }
  | { status: 'unknown_category' }

const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  active: users.active,
  createdAt: users.createdAt,
}

export type PublicUser = {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: Date
}

export async function findPublicUser(db: Database, id: string): Promise<PublicUser | undefined> {
  const [user] = await db.select(publicColumns).from(users).where(eq(users.id, id))
  return user
}

export function listUsers(db: Database): Promise<PublicUser[]> {
  return db.select(publicColumns).from(users).orderBy(asc(users.name))
}

export async function createUser(
  db: Database,
  input: NewUserInput,
  actor: { userId: string; ip: string },
): Promise<CreateUserResult> {
  const email = input.email.toLowerCase()
  const categoryIds = [...new Set(input.categoryIds)]

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (existing) return { status: 'email_taken' }

  if (categoryIds.length > 0) {
    const found = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.id, categoryIds))
    if (found.length !== categoryIds.length) return { status: 'unknown_category' }
  }

  const passwordHash = await hashPassword(input.password)

  const user = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({ name: input.name, email, passwordHash, role: input.role })
      .returning(publicColumns)
    if (categoryIds.length > 0) {
      await tx
        .insert(userCategoryPermissions)
        .values(categoryIds.map((categoryId) => ({ userId: created.id, categoryId })))
    }
    return created
  })

  await logActivity(db, {
    userId: actor.userId,
    action: 'USUARIO_CRIADO',
    entity: 'users',
    entityId: user.id,
    ip: actor.ip,
  })

  return { status: 'ok', user }
}
