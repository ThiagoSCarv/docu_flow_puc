// Domínio (catalog): política única de quem vê e quem cadastra em cada categoria (RF19, RNF05).
import { UserRole } from '../../shared/utils/enums.js'

// Dados mínimos do usuário para decidir acesso, sem importar a entidade User de identity.
export type CatalogActor = {
  role: UserRole
  allowedCategoryIds: readonly string[]
}

// Escopo de consulta: 'ALL' dispensa filtro; lista vazia significa nenhum resultado.
export type CategoryScope = readonly string[] | 'ALL'

// Perfil CONSULTA só lê; cadastrar documentos fica com ADMIN e FUNCIONARIO.
const ROLES_THAT_REGISTER_DOCUMENTS: readonly UserRole[] = [UserRole.ADMIN, UserRole.FUNCIONARIO]

// Perfis que enxergam todas as categorias, independentemente das permitidas (usado também no RF20).
export const ROLES_THAT_VIEW_ALL_CATEGORIES: readonly UserRole[] = [UserRole.ADMIN]

// Calcula o escopo de categorias que o usuário pode ver, aplicado nas listagens e no painel.
export function viewableCategories(actor: CatalogActor): CategoryScope {
  return ROLES_THAT_VIEW_ALL_CATEGORIES.includes(actor.role) ? 'ALL' : actor.allowedCategoryIds
}

// Diz se uma categoria específica está dentro do escopo visível do usuário.
export function canViewCategory(actor: CatalogActor, categoryId: string): boolean {
  const scope = viewableCategories(actor)
  return scope === 'ALL' || scope.includes(categoryId)
}

// Exige perfil que cadastra e categoria visível, para ninguém gravar onde não pode ler.
export function canRegisterDocumentIn(actor: CatalogActor, categoryId: string): boolean {
  return ROLES_THAT_REGISTER_DOCUMENTS.includes(actor.role) && canViewCategory(actor, categoryId)
}
