import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  categories,
  clients,
  documents,
  userCategoryPermissions,
  users,
} from '../../src/infra/database/schema.js'
import type { Database } from '../../src/infra/database/types.js'
import { UserRole } from '../../src/shared/utils/enums.js'
import { createTestDb } from '../helpers/db.js'

describe('schema do banco', () => {
  let db: Database
  let close: () => Promise<void>
  let userId: string
  let categoryId: string
  let clientId: string

  beforeAll(async () => {
    ;({ db, close } = await createTestDb())

    const [user] = await db
      .insert(users)
      .values({
        name: 'Admin',
        email: 'admin@exemplo.com',
        passwordHash: 'x',
        role: UserRole.ADMIN,
      })
      .returning()
    const [category] = await db
      .insert(categories)
      .values({ name: 'Fiscais', code: 'FIS' })
      .returning()
    const [client] = await db
      .insert(clients)
      .values({ name: 'Cliente A', code: 'CLIA' })
      .returning()
    userId = user.id
    categoryId = category.id
    clientId = client.id
  })

  afterAll(() => close())

  const documento = (period: string) => ({
    name: 'CLIA_FIS_2026-11_nota',
    period,
    cloudLocation: 'https://nuvem.exemplo.com/doc',
    clientId,
    categoryId,
    createdBy: userId,
  })

  it('aceita documento com período AAAA-MM válido', async () => {
    const [doc] = await db.insert(documents).values(documento('2026-11')).returning()
    expect(doc.period).toBe('2026-11')
  })

  it('rejeita período fora do formato AAAA-MM', async () => {
    await expect(db.insert(documents).values(documento('2026-13'))).rejects.toThrow()
    await expect(db.insert(documents).values(documento('11/2026'))).rejects.toThrow()
  })

  it('rejeita e-mail com letras maiúsculas', async () => {
    await expect(
      db.insert(users).values({
        name: 'X',
        email: 'Fulano@exemplo.com',
        passwordHash: 'x',
        role: UserRole.CONSULTA,
      }),
    ).rejects.toThrow()
  })

  it('rejeita e-mail duplicado', async () => {
    await expect(
      db.insert(users).values({
        name: 'Y',
        email: 'admin@exemplo.com',
        passwordHash: 'x',
        role: UserRole.CONSULTA,
      }),
    ).rejects.toThrow()
  })

  it('não duplica a mesma permissão de categoria para o usuário', async () => {
    await db.insert(userCategoryPermissions).values({ userId, categoryId })
    await expect(
      db.insert(userCategoryPermissions).values({ userId, categoryId }),
    ).rejects.toThrow()
  })
})
