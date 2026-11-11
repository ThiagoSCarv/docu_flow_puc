import type { Document } from '../../../domain/catalog/document.entity.js'
import type { DocumentRepository } from '../../../domain/catalog/document.repository.js'
import { documents } from '../schema.js'
import type { Database } from '../types.js'

export class DrizzleDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Database) {}

  async save(document: Document): Promise<void> {
    await this.db.insert(documents).values({
      id: document.id,
      name: document.name.value,
      description: document.description,
      period: document.period.value,
      cloudLocation: document.cloudLocation,
      clientId: document.clientId,
      categoryId: document.categoryId,
      createdBy: document.createdBy,
      createdAt: document.createdAt,
    })
  }
}
