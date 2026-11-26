import { beforeEach, describe, expect, it } from 'vitest'
import { ListCategoryAccessUseCase } from '../../../src/application/identity/list-category-access.use-case.js'
import { CategoryNotFoundError } from '../../../src/domain/catalog/catalog.errors.js'
import { Email } from '../../../src/domain/identity/email.value-object.js'
import { User } from '../../../src/domain/identity/user.entity.js'
import { UserRole } from '../../../src/shared/utils/enums.js'
import {
  ALL_ITEMS,
  FixedClock,
  InMemoryCategoryRepository,
  InMemoryUserRepository,
} from '../../helpers/fakes.js'

const FISCAIS = 'cat-fiscais'
const CONTABEIS = 'cat-contabeis'

describe('ListCategoryAccessUseCase', () => {
  let users: InMemoryUserRepository
  let useCase: ListCategoryAccessUseCase

  const save = (name: string, role: UserRole, allowedCategoryIds: string[]) =>
    users.save(
      User.create(
        {
          name,
          email: Email.create(`${name.toLowerCase()}@exemplo.com`),
          passwordHash: 'hash',
          role,
          allowedCategoryIds,
        },
        new FixedClock().now(),
      ),
    )

  beforeEach(async () => {
    users = new InMemoryUserRepository()
    useCase = new ListCategoryAccessUseCase(
      users,
      new InMemoryCategoryRepository([
        { id: FISCAIS, name: 'Fiscais', code: 'FIS' },
        { id: CONTABEIS, name: 'Contábeis', code: 'CONT' },
      ]),
    )
    await save('Admin', UserRole.ADMIN, [])
    await save('Maria', UserRole.FUNCIONARIO, [FISCAIS])
    await save('Joao', UserRole.CONSULTA, [CONTABEIS])
  })

  it('lista o ADMIN e quem tem a categoria permitida', async () => {
    const page = await useCase.execute({ categoryId: FISCAIS, page: ALL_ITEMS })

    expect(page.items.map((user) => user.name).sort()).toEqual(['Admin', 'Maria'])
    expect(page.total).toBe(2)
    expect(page.items[0]).not.toHaveProperty('passwordHash')
  })

  it('recusa categoria inexistente', async () => {
    await expect(
      useCase.execute({ categoryId: 'nao-existe', page: ALL_ITEMS }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError)
  })
})
