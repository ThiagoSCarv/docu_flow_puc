import { UserRole } from '../../shared/utils/enums.js'
import { categories, users } from './schema.js'
import type { Database } from './types.js'

export const INITIAL_CATEGORIES = [
  { name: 'Contábeis', code: 'CONT' },
  { name: 'Fiscais', code: 'FIS' },
  { name: 'Financeiros', code: 'FIN' },
  { name: 'Contratos', code: 'CTR' },
  { name: 'Administrativos', code: 'ADM' },
  { name: 'Outros', code: 'OUT' },
]

export async function seedCategories(db: Database) {
  await db.insert(categories).values(INITIAL_CATEGORIES).onConflictDoNothing()
}

export async function seedAdmin(
  db: Database,
  admin: { name: string; email: string; passwordHash: string },
) {
  await db
    .insert(users)
    .values({ ...admin, role: UserRole.ADMIN })
    .onConflictDoNothing({ target: users.email })
}
