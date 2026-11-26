// Domínio (catalog): contrato do repositório de documentos.
import type { Page, PageRequest } from '../../shared/utils/pagination.js'
import type { CategoryScope } from './category-access.policy.js'
import type { Document } from './document.entity.js'
import type { DocumentName } from './document-name.value-object.js'
import type { Period } from './period.value-object.js'

// Filtros da pesquisa de documentos; o escopo de categorias sempre vem da política (RF15, RF19).
export type DocumentSearchCriteria = {
  text?: string
  categoryIds: CategoryScope
  clientId?: string
  period?: Period
}

// Total de documentos de uma categoria, usado no painel (RF29).
export type CategoryDocumentCount = {
  categoryId: string
  total: number
}

// Porta implementada na infra: grava, pesquisa com paginação e conta documentos por categoria.
export interface DocumentRepository {
  save(document: Document): Promise<void>
  // Usada para recusar nome padronizado repetido antes de gravar (409).
  existsWithName(name: DocumentName): Promise<boolean>
  search(criteria: DocumentSearchCriteria, page: PageRequest): Promise<Page<Document>>
  countByCategory(categoryIds: CategoryScope): Promise<CategoryDocumentCount[]>
}
