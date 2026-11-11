import { UserRole } from '../../shared/utils/enums.js'

export type CatalogActor = {
  role: UserRole
  allowedCategoryIds: readonly string[]
}

const ROLES_THAT_REGISTER_DOCUMENTS: readonly UserRole[] = [UserRole.ADMIN, UserRole.FUNCIONARIO]

export function canViewCategory(actor: CatalogActor, categoryId: string): boolean {
  if (actor.role === UserRole.ADMIN) return true
  return actor.allowedCategoryIds.includes(categoryId)
}

export function canRegisterDocumentIn(actor: CatalogActor, categoryId: string): boolean {
  return ROLES_THAT_REGISTER_DOCUMENTS.includes(actor.role) && canViewCategory(actor, categoryId)
}
