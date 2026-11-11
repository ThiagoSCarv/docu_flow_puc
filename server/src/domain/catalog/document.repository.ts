import type { CategoryScope } from './category-access.policy.js'
import type { Document } from './document.entity.js'
import type { Period } from './period.value-object.js'

export type DocumentSearchCriteria = {
  text?: string
  categoryIds: CategoryScope
  clientId?: string
  period?: Period
}

export interface DocumentRepository {
  save(document: Document): Promise<void>
  search(criteria: DocumentSearchCriteria): Promise<Document[]>
}
