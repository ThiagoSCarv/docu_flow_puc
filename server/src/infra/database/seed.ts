// Infra: seed mínimo (categorias e administrador), idempotente e reaproveitado pelos testes.
import { UserRole } from '../../shared/utils/enums.js'
import { categories, users } from './schema.js'
import type { Database } from './types.js'

// Categorias fixas do escritório; o código entra no nome padronizado do documento (RF31).
export const INITIAL_CATEGORIES = [
  { name: 'Contábeis', code: 'CONT' },
  { name: 'Fiscais', code: 'FIS' },
  { name: 'Financeiros', code: 'FIN' },
  { name: 'Contratos', code: 'CTR' },
  { name: 'Administrativos', code: 'ADM' },
  { name: 'Outros', code: 'OUT' },
]

// Insere as categorias iniciais; rodar de novo não duplica nada.
export async function seedCategories(db: Database) {
  await db.insert(categories).values(INITIAL_CATEGORIES).onConflictDoNothing()
}

// Cria o primeiro ADMIN, pois não há autocadastro (RF01); ignora se o e-mail já existe.
export async function seedAdmin(
  db: Database,
  admin: { name: string; email: string; passwordHash: string },
) {
  await db
    .insert(users)
    .values({ ...admin, role: UserRole.ADMIN })
    .onConflictDoNothing({ target: users.email })
}
