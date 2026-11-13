import { and, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm'
import { Document } from '../../../domain/catalog/document.entity.js'
import type {
  DocumentRepository,
  DocumentSearchCriteria,
} from '../../../domain/catalog/document.repository.js'
import { DocumentName } from '../../../domain/catalog/document-name.value-object.js'
import { Period } from '../../../domain/catalog/period.value-object.js'
import type { Page, PageRequest } from '../../../shared/utils/pagination.js'
import { documents } from '../schema.js'
import type { Database } from '../types.js'

type DocumentRow = typeof documents.$inferSelect

const LIKE_WILDCARDS = /[\\%_]/g

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

  async existsWithName(name: DocumentName): Promise<boolean> {
    const [row] = await this.db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.name, name.value))
      .limit(1)
    return row !== undefined
  }

  async search(criteria: DocumentSearchCriteria, page: PageRequest): Promise<Page<Document>> {
    const where = and(...this.conditionsFor(criteria))
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(documents)
        .where(where)
        .orderBy(desc(documents.createdAt), desc(documents.id))
        .limit(page.limit)
        .offset(page.offset),
      this.db.select({ total: count() }).from(documents).where(where),
    ])
    return { items: rows.map((row) => this.toEntity(row)), total }
  }

  private conditionsFor({ text, categoryIds, clientId, period }: DocumentSearchCriteria) {
    const conditions: (SQL | undefined)[] = []
    if (categoryIds !== 'ALL') conditions.push(inArray(documents.categoryId, [...categoryIds]))
    if (clientId) conditions.push(eq(documents.clientId, clientId))
    if (period) conditions.push(eq(documents.period, period.value))
    if (text) {
      const pattern = `%${text.replace(LIKE_WILDCARDS, '\\$&')}%`
      conditions.push(or(ilike(documents.name, pattern), ilike(documents.description, pattern)))
    }
    return conditions
  }

  private toEntity(row: DocumentRow): Document {
    return Document.restore({
      ...row,
      name: DocumentName.restore(row.name),
      description: row.description ?? '',
      period: Period.create(row.period),
    })
  }
}
