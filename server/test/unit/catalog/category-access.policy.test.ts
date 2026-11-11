import { describe, expect, it } from 'vitest'
import {
  canRegisterDocumentIn,
  canViewCategory,
} from '../../../src/domain/catalog/category-access.policy.js'
import { UserRole } from '../../../src/shared/utils/enums.js'

const FISCAIS = 'cat-fiscais'
const CONTABEIS = 'cat-contabeis'

const actor = (role: UserRole, allowedCategoryIds: string[] = [FISCAIS]) => ({
  role,
  allowedCategoryIds,
})

describe('canViewCategory', () => {
  it('ADMIN vê qualquer categoria, mesmo sem permissões registradas', () => {
    expect(canViewCategory(actor(UserRole.ADMIN, []), CONTABEIS)).toBe(true)
  })

  it.each([UserRole.FUNCIONARIO, UserRole.CONSULTA])(
    '%s vê só as categorias permitidas',
    (role) => {
      expect(canViewCategory(actor(role), FISCAIS)).toBe(true)
      expect(canViewCategory(actor(role), CONTABEIS)).toBe(false)
    },
  )

  it('lista vazia de permissões não vê nenhuma categoria', () => {
    expect(canViewCategory(actor(UserRole.FUNCIONARIO, []), FISCAIS)).toBe(false)
  })
})

describe('canRegisterDocumentIn', () => {
  it('ADMIN cadastra em qualquer categoria', () => {
    expect(canRegisterDocumentIn(actor(UserRole.ADMIN, []), CONTABEIS)).toBe(true)
  })

  it('FUNCIONARIO cadastra só nas categorias permitidas', () => {
    expect(canRegisterDocumentIn(actor(UserRole.FUNCIONARIO), FISCAIS)).toBe(true)
    expect(canRegisterDocumentIn(actor(UserRole.FUNCIONARIO), CONTABEIS)).toBe(false)
  })

  it('CONSULTA não cadastra nem nas categorias permitidas', () => {
    expect(canRegisterDocumentIn(actor(UserRole.CONSULTA), FISCAIS)).toBe(false)
  })
})
