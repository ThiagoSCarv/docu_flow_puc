import type { Document } from './document.entity.js'

export interface DocumentRepository {
  save(document: Document): Promise<void>
}
