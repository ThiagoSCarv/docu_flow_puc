import { buildApp } from '../../src/app.js'
import { categories, userCategoryPermissions, users } from '../../src/db/schema.js'
import { seedCategories } from '../../src/db/seed.js'
import { hashPassword } from '../../src/services/auth.js'
import type { Role } from '../../src/services/users.js'
import { createTestDb } from './db.js'

export const TEST_JWT_SECRET = 'segredo-de-teste-com-pelo-menos-32-caracteres'
export const TEST_PASSWORD = 'senha1234'

export async function createTestApp() {
  const { db, close } = await createTestDb()
  await seedCategories(db)
  const app = await buildApp({ db, jwtSecret: TEST_JWT_SECRET })
  await app.ready()

  const passwordHash = await hashPassword(TEST_PASSWORD)

  async function createUser(role: Role, email: string, categoryCodes: string[] = []) {
    const [user] = await db
      .insert(users)
      .values({ name: `Usuário ${role}`, email, passwordHash, role })
      .returning()
    const allCategories = await db.select().from(categories)
    const permitted = allCategories.filter((c) => categoryCodes.includes(c.code))
    if (permitted.length > 0) {
      await db
        .insert(userCategoryPermissions)
        .values(permitted.map((c) => ({ userId: user.id, categoryId: c.id })))
    }
    return user
  }

  async function tokenFor(email: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: TEST_PASSWORD },
    })
    return response.json().token as string
  }

  return {
    app,
    db,
    createUser,
    tokenFor,
    close: async () => {
      await app.close()
      await close()
    },
  }
}
