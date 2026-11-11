import { describe, expect, it } from 'vitest'
import { ListCategoriesUseCase } from '../../../src/application/catalog/list-categories.use-case.js'
import { UserRole } from '../../../src/shared/utils/enums.js'
import { InMemoryCategoryRepository } from '../../helpers/fakes.js'

const FISCAIS = { id: 'cat-fiscais', name: 'Fiscais', code: 'FIS' }
const CONTABEIS = { id: 'cat-contabeis', name: 'Contábeis', code: 'CONT' }

describe('ListCategoriesUseCase', () => {
  const useCase = new ListCategoriesUseCase(new InMemoryCategoryRepository([FISCAIS, CONTABEIS]))

  it('ADMIN vê todas as categorias', async () => {
    expect(await useCase.execute({ role: UserRole.ADMIN, allowedCategoryIds: [] })).toEqual([
      FISCAIS,
      CONTABEIS,
    ])
  })

  it.each([UserRole.FUNCIONARIO, UserRole.CONSULTA])(
    '%s vê só as categorias permitidas',
    async (role) => {
      expect(await useCase.execute({ role, allowedCategoryIds: [FISCAIS.id] })).toEqual([FISCAIS])
    },
  )
})
