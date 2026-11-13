import type { ActivityLogRepository } from '../../domain/audit/activity-log.repository.js'
import {
  CategoryNotAllowedError,
  DocumentNameAlreadyInUseError,
  InactiveClientError,
  UnknownCategoryError,
  UnknownClientError,
} from '../../domain/catalog/catalog.errors.js'
import type { CategoryRepository } from '../../domain/catalog/category.repository.js'
import {
  type CatalogActor,
  canRegisterDocumentIn,
} from '../../domain/catalog/category-access.policy.js'
import type { ClientRepository } from '../../domain/catalog/client.repository.js'
import { Document } from '../../domain/catalog/document.entity.js'
import type { DocumentRepository } from '../../domain/catalog/document.repository.js'
import { DocumentName } from '../../domain/catalog/document-name.value-object.js'
import { Period } from '../../domain/catalog/period.value-object.js'
import { ActivityAction, ActivityEntity } from '../../shared/utils/enums.js'
import type { Clock } from '../ports/clock.js'
import { type DocumentDto, toDocumentDto } from './document.dto.js'

export type CreateDocumentInput = {
  clientId: string
  categoryId: string
  period: string
  description: string
  cloudLocation: string
  actor: CatalogActor & { userId: string; ip: string }
}

export class CreateDocumentUseCase {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly clients: ClientRepository,
    private readonly categories: CategoryRepository,
    private readonly activityLog: ActivityLogRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateDocumentInput): Promise<DocumentDto> {
    if (!canRegisterDocumentIn(input.actor, input.categoryId)) throw new CategoryNotAllowedError()

    const period = Period.create(input.period)
    const client = await this.findActiveClient(input.clientId)
    const category = await this.categories.findById(input.categoryId)
    if (!category) throw new UnknownCategoryError()

    const name = DocumentName.create({
      clientCode: client.code,
      categoryCode: category.code,
      period,
      description: input.description,
    })
    await this.ensureNameIsAvailable(name)

    const document = Document.create(
      {
        name,
        description: input.description,
        period,
        cloudLocation: input.cloudLocation,
        clientId: client.id,
        categoryId: category.id,
        createdBy: input.actor.userId,
      },
      this.clock.now(),
    )
    await this.documents.save(document)
    await this.activityLog.record({
      userId: input.actor.userId,
      action: ActivityAction.DOCUMENTO_CRIADO,
      entity: ActivityEntity.DOCUMENTS,
      entityId: document.id,
      ip: input.actor.ip,
    })

    return toDocumentDto(document)
  }

  private async ensureNameIsAvailable(name: DocumentName): Promise<void> {
    if (await this.documents.existsWithName(name)) throw new DocumentNameAlreadyInUseError()
  }

  private async findActiveClient(clientId: string) {
    const client = await this.clients.findById(clientId)
    if (!client) throw new UnknownClientError()
    if (!client.active) throw new InactiveClientError()
    return client
  }
}
