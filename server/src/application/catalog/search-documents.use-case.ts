// Camada de aplicação: pesquisa de documentos por nome, categoria, cliente ou período (RF15).
import {
  type CatalogActor,
  type CategoryScope,
  canViewCategory,
  viewableCategories,
} from '../../domain/catalog/category-access.policy.js'
import type { DocumentRepository } from '../../domain/catalog/document.repository.js'
import { Period } from '../../domain/catalog/period.value-object.js'
import { emptyPage, mapPage, type Page, type PageRequest } from '../../shared/utils/pagination.js'
import { type DocumentDto, toDocumentDto } from './document.dto.js'

// Filtros opcionais da busca, a página e o ator cujas permissões limitam o resultado.
export type SearchDocumentsInput = {
  search?: string
  categoryId?: string
  clientId?: string
  period?: string
  page: PageRequest
  actor: CatalogActor
}

// Busca documentos restringindo sempre às categorias que o ator pode ver (RF19, RNF05).
export class SearchDocumentsUseCase {
  constructor(private readonly documents: DocumentRepository) {}

  // Valida o período, calcula o escopo e evita ir ao banco quando nada é visível.
  async execute(input: SearchDocumentsInput): Promise<Page<DocumentDto>> {
    const period = input.period === undefined ? undefined : Period.create(input.period)
    const categoryIds = this.categoryScope(input.actor, input.categoryId)
    if (categoryIds !== 'ALL' && categoryIds.length === 0) return emptyPage()

    const found = await this.documents.search(
      { text: input.search, categoryIds, clientId: input.clientId, period },
      input.page,
    )
    return mapPage(found, toDocumentDto)
  }

  // Sem filtro, usa tudo que o ator vê; categoria proibida vira escopo vazio, sem revelá-la.
  private categoryScope(actor: CatalogActor, requestedCategoryId?: string): CategoryScope {
    if (requestedCategoryId === undefined) return viewableCategories(actor)
    return canViewCategory(actor, requestedCategoryId) ? [requestedCategoryId] : []
  }
}
