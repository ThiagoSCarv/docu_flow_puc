import { UserRole } from '../../shared/utils/enums.js'

export type CatalogActor = {
  role: UserRole
  allowedCategoryIds: readonly string[]
}

export type CategoryScope = readonly string[] | 'ALL'

const ROLES_THAT_REGISTER_DOCUMENTS: readonly UserRole[] = [UserRole.ADMIN, UserRole.FUNCIONARIO]

export function viewableCategories(actor: CatalogActor): CategoryScope {
  return actor.role === UserRole.ADMIN ? 'ALL' : actor.allowedCategoryIds
}

export function canViewCategory(actor: CatalogActor, categoryId: string): boolean {
  const scope = viewableCategories(actor)
  return scope === 'ALL' || scope.includes(categoryId)
}

export function canRegisterDocumentIn(actor: CatalogActor, categoryId: string): boolean {
  return ROLES_THAT_REGISTER_DOCUMENTS.includes(actor.role) && canViewCategory(actor, categoryId)
}
