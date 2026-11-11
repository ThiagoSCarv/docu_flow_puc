import { BcryptPasswordHasher } from '../../src/infra/crypto/bcrypt-password-hasher.js'
import { categories, userCategoryPermissions, users } from '../../src/infra/database/schema.js'
import { seedCategories } from '../../src/infra/database/seed.js'
import { buildApp } from '../../src/infra/http/app.js'
import type { UserRole } from '../../src/shared/utils/enums.js'
import { createTestDb } from './db.js'

export const TEST_JWT_SECRET = 'segredo-de-teste-com-pelo-menos-32-caracteres'
export const TEST_PASSWORD = 'senha1234'

export async function createTestApp() {
  const { db, close } = await createTestDb()
  await seedCategories(db)
  const app = await buildApp({ db, jwtSecret: TEST_JWT_SECRET })
  await app.ready()

  const passwordHash = await new BcryptPasswordHasher().hash(TEST_PASSWORD)

  async function createUser(role: UserRole, email: string, categoryCodes: string[] = []) {
    const [user] = await db
      .insert(users)
      .values({ name: `Usuário ${role}`, email, passwordHash, role })
      .returning()
    const allCategories = await db.select().from(categories)
    const permitted = allCategories.filter((category) => categoryCodes.includes(category.code))
    if (permitted.length > 0) {
      await db
        .insert(userCategoryPermissions)
        .values(permitted.map((category) => ({ userId: user.id, categoryId: category.id })))
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
