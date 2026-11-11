import {
  type CatalogActor,
  type CategoryScope,
  canViewCategory,
  viewableCategories,
} from '../../domain/catalog/category-access.policy.js'
import type { DocumentRepository } from '../../domain/catalog/document.repository.js'
import { Period } from '../../domain/catalog/period.value-object.js'
import { type DocumentDto, toDocumentDto } from './document.dto.js'

export type SearchDocumentsInput = {
  search?: string
  categoryId?: string
  clientId?: string
  period?: string
  actor: CatalogActor
}

export class SearchDocumentsUseCase {
  constructor(private readonly documents: DocumentRepository) {}

  async execute(input: SearchDocumentsInput): Promise<DocumentDto[]> {
    const period = input.period === undefined ? undefined : Period.create(input.period)
    const categoryIds = this.categoryScope(input.actor, input.categoryId)
    if (categoryIds !== 'ALL' && categoryIds.length === 0) return []

    const found = await this.documents.search({
      text: input.search,
      categoryIds,
      clientId: input.clientId,
      period,
    })
    return found.map(toDocumentDto)
  }

  private categoryScope(actor: CatalogActor, requestedCategoryId?: string): CategoryScope {
    if (requestedCategoryId === undefined) return viewableCategories(actor)
    return canViewCategory(actor, requestedCategoryId) ? [requestedCategoryId] : []
  }
}
